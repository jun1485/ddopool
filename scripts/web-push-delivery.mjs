import webpush from "web-push";

// 알림 유형별 표시 문구와 이동 경로 구성
export function createPushContent(job) {
  const isStudyReminder = job.study_date != null;
  return {
    title: !isStudyReminder
      ? "또풀 알림"
      : job.study_hour >= 21
        ? `🔴 오늘 학습 마감까지 ${24 - job.study_hour}시간`
        : "오늘의 한 문제, 지금 풀어볼까요?",
    body: isStudyReminder
      ? "한 문제로 오늘의 학습 기록을 이어가세요."
      : "시험 요청에 새 소식이 있어요.",
    url: isStudyReminder ? "/" : "/notifications",
  };
}

// 신뢰된 웹 푸시 서비스 주소 검증
export function isWebPushEndpoint(endpoint) {
  const url = new URL(endpoint);
  return (
    url.protocol === "https:" &&
    !url.username &&
    !url.password &&
    !url.port &&
    /^(web\.push\.apple\.com|fcm\.googleapis\.com|[a-z0-9-]+\.notify\.windows\.com|updates\.push\.services\.mozilla\.com)$/.test(
      url.hostname,
    )
  );
}

// 웹 알림 발송 및 만료 구독 정리
export async function deliverWebPush(
  client,
  job,
  send = webpush.sendNotification,
  env = process.env,
) {
  const { data, error } = await client
    .from("web_push_subscriptions")
    .select("endpoint,p256dh,auth")
    .eq("token", job.token)
    .single();
  if (error || !data) throw new Error("웹 구독 조회 실패");
  if (!isWebPushEndpoint(data.endpoint))
    throw new Error("허용되지 않은 웹 푸시 주소");
  if (
    !env.WEB_PUSH_SUBJECT ||
    !env.WEB_PUSH_PUBLIC_KEY ||
    !env.WEB_PUSH_PRIVATE_KEY
  )
    throw new Error("웹 푸시 서버 설정 필요");
  try {
    const content = createPushContent(job);
    await send(
      {
        endpoint: data.endpoint,
        keys: { p256dh: data.p256dh, auth: data.auth },
      },
      JSON.stringify({
        title: content.title,
        body: content.body,
        url: content.url,
      }),
      {
        TTL: 900,
        timeout: 15000,
        topic: "study-reminder",
        vapidDetails: {
          subject: env.WEB_PUSH_SUBJECT,
          publicKey: env.WEB_PUSH_PUBLIC_KEY,
          privateKey: env.WEB_PUSH_PRIVATE_KEY,
        },
      },
    );
    return "sent";
  } catch (error) {
    if (error.statusCode !== 404 && error.statusCode !== 410) throw error;
    const result = await client
      .from("push_tokens")
      .delete()
      .eq("token", job.token);
    if (result.error) throw new Error("만료 웹 구독 정리 실패");
    return "dead";
  }
}
