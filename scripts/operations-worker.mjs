import { createClient } from "@supabase/supabase-js";
import { pathToFileURL } from "node:url";
import { createPushContent, deliverWebPush } from "./web-push-delivery.mjs";

// 독립 운영 작업 실행
export async function runOperations(client, request = fetch, expoToken) {
  const headers = {
    "Content-Type": "application/json",
    ...(expoToken ? { Authorization: `Bearer ${expoToken}` } : {}),
  };

  // 푸시 서비스 응답 확인
  async function callExpo(path, body) {
    const response = await request(`https://exp.host/--/api/v2/push/${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error("푸시 서비스 요청 실패");
    const result = await response.json();
    if (result.errors || result.data == null)
      throw new Error("푸시 서비스 처리 실패");
    return result.data;
  }

  // 발송 상태 저장
  async function updateDelivery(id, values) {
    const { error } = await client
      .from("push_deliveries")
      .update(values)
      .eq("id", id);
    if (error) throw new Error("발송 상태 저장 실패");
  }

  // 만료 기기 연결 정리
  async function removeExpiredToken(token) {
    const { error } = await client
      .from("push_tokens")
      .delete()
      .eq("token", token);
    if (error) throw new Error("만료 토큰 정리 실패");
  }

  // 발송 결과 영수증 반영
  async function resolveReceipts() {
    const { data: jobs, error } = await client
      .from("push_deliveries")
      .select("*")
      .eq("state", "ticket")
      .lte("available_at", new Date().toISOString())
      .order("id")
      .limit(100);
    if (error) throw new Error("영수증 대기 조회 실패");
    if (!jobs.length) return;
    // 결과가 누락되거나 조회가 실패해도 다음 대기 작업 진행
    const leases = await Promise.allSettled(
      jobs.map((job) =>
        updateDelivery(job.id, {
          available_at: new Date(Date.now() + 15 * 60_000).toISOString(),
        }),
      ),
    );
    const readyJobs = jobs.filter(
      (_, index) => leases[index].status === "fulfilled",
    );
    if (readyJobs.length !== jobs.length) {
      console.error("일부 영수증의 재조회 예약 저장 실패");
      process.exitCode = 1;
    }
    if (!readyJobs.length) return;
    const receipts = await callExpo("getReceipts", {
      ids: readyJobs.map((job) => job.receipt_id),
    });
    for (const job of readyJobs) {
      try {
        const receipt = receipts[job.receipt_id];
        if (!receipt) {
          if (Date.now() - Date.parse(job.created_at) > 24 * 60 * 60 * 1000)
            await updateDelivery(job.id, { state: "dead" });
          else
            await updateDelivery(job.id, {
              available_at: new Date(Date.now() + 15 * 60_000).toISOString(),
            });
          continue;
        }
        if (receipt.details?.error === "DeviceNotRegistered")
          await removeExpiredToken(job.token);
        else
          await updateDelivery(job.id, {
            state: receipt.status === "ok" ? "sent" : "dead",
          });
      } catch {
        console.error("일부 영수증 처리 실패");
        process.exitCode = 1;
      }
    }
  }

  // 발송 대기 알림 처리
  async function deliverPushes() {
    const { data: claimedJobs, error } = await client.rpc(
      "claim_push_deliveries",
    );
    if (error) throw new Error("발송 대기 조회 실패");
    // 웹 구독은 표준 웹 푸시로 개별 발송
    for (const job of claimedJobs.filter((job) =>
      job.token.startsWith("web:"),
    )) {
      try {
        const state = await deliverWebPush(client, job);
        await updateDelivery(job.id, { state });
      } catch {
        await updateDelivery(job.id, {
          state: job.attempts >= 6 ? "dead" : "pending",
          available_at: new Date(
            Date.now() + 2 ** job.attempts * 60_000,
          ).toISOString(),
        });
        console.error("웹 알림 발송 실패·재시도 예약");
        process.exitCode = 1;
      }
    }
    const jobs = claimedJobs.filter((job) => !job.token.startsWith("web:"));
    if (!jobs.length) return;
    let tickets;
    try {
      tickets = await callExpo(
        "send",
        jobs.map((job) => {
          const content = createPushContent(job);
          return {
            to: job.token,
            title: content.title,
            body: content.body,
            data: { url: content.url },
            channelId: job.study_date == null ? "default" : "study-reminders",
          };
        }),
      );
      if (!Array.isArray(tickets) || tickets.length !== jobs.length)
        throw new Error("발송 결과 개수 불일치");
    } catch {
      for (const job of jobs)
        await updateDelivery(job.id, {
          state: job.attempts >= 6 ? "dead" : "pending",
          available_at: new Date(
            Date.now() + 2 ** job.attempts * 60_000,
          ).toISOString(),
        });
      throw new Error("발송 결과를 받지 못해 재시도 예약");
    }
    for (const [index, job] of jobs.entries()) {
      const ticket = tickets[index];
      if (ticket.details?.error === "DeviceNotRegistered") {
        await removeExpiredToken(job.token);
        continue;
      }
      await updateDelivery(
        job.id,
        ticket.status === "ok" && typeof ticket.id === "string"
          ? {
              state: "ticket",
              receipt_id: ticket.id,
              available_at: new Date(Date.now() + 15 * 60_000).toISOString(),
            }
          : {
              state: job.attempts >= 6 ? "dead" : "pending",
              available_at: new Date(
                Date.now() + 2 ** job.attempts * 60_000,
              ).toISOString(),
            },
      );
    }
    console.log(`알림 발송 요청 처리 ${jobs.length}건`);
  }

  const { error } = await client.rpc("purge_expired_personal_data");
  if (error) throw new Error("보존 기간 만료 데이터 정리 실패");
  const { error: cleanupError } = await client
    .from("push_deliveries")
    .delete()
    .lt(
      "created_at",
      new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString(),
    );
  if (cleanupError) throw new Error("알림 처리 이력 정리 실패");
  const { error: reminderError } = await client.rpc("queue_study_reminders");
  if (reminderError) {
    console.error("학습 알림 예약 실패");
    process.exitCode = 1;
  }
  const results = await Promise.allSettled([
    resolveReceipts(),
    deliverPushes(),
  ]);
  for (const result of results) {
    if (result.status === "rejected") {
      console.error("알림 작업 일부 실패", result.reason.message);
      process.exitCode = 1;
    }
  }
  console.log("운영 작업 처리 종료");
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("운영 서버 환경 설정이 필요합니다");
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  await runOperations(client, fetch, process.env.EXPO_ACCESS_TOKEN);
}
