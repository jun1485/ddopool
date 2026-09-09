import assert from "node:assert/strict";
import { test } from "node:test";
import { runOperations } from "./operations-worker.mjs";

// 운영 저장소 응답과 상태 변경 기록 구성
function createFixture() {
  const updates = [];
  const receiptJob = {
    id: 1,
    receipt_id: "sample-receipt",
    created_at: new Date().toISOString(),
  };
  const sendJob = { id: 2, token: "sample-token", attempts: 1 };
  const client = {
    from() {
      let values;
      const query = {
        select() {
          return query;
        },
        delete() {
          return query;
        },
        update(next) {
          values = next;
          return query;
        },
        eq(key, value) {
          if (key === "id") updates.push({ id: value, ...values });
          return query;
        },
        lte() {
          return query;
        },
        lt() {
          return query;
        },
        order() {
          return query;
        },
        limit() {
          return Promise.resolve({ data: [receiptJob], error: null });
        },
        then(resolve) {
          return Promise.resolve({ error: null }).then(resolve);
        },
      };
      return query;
    },
    async rpc(name) {
      return {
        error: null,
        data: name === "claim_push_deliveries" ? [sendJob] : null,
      };
    },
  };
  return { client, updates };
}

test("영수증 서비스 장애가 신규 발송을 차단하지 않는다", async () => {
  const { client, updates } = createFixture();
  const previousExitCode = process.exitCode;
  try {
    await runOperations(client, async (url) => {
      if (url.endsWith("getReceipts")) throw new Error("영수증 조회 장애");
      return Response.json({ data: [{ status: "ok", id: "new-receipt" }] });
    });
    assert.ok(
      updates.some(
        (update) =>
          update.id === 1 && Date.parse(update.available_at) > Date.now(),
      ),
    );
    assert.ok(
      updates.some((update) => update.id === 2 && update.state === "ticket"),
    );
    assert.equal(process.exitCode, 1);
  } finally {
    process.exitCode = previousExitCode;
  }
});

test("아직 없는 영수증은 다음 조회로 미루고 후속 발송을 처리한다", async () => {
  const { client, updates } = createFixture();
  await runOperations(client, async (url) =>
    Response.json({
      data: url.endsWith("getReceipts")
        ? {}
        : [{ status: "ok", id: "new-receipt" }],
    }),
  );
  assert.ok(
    updates.some(
      (update) =>
        update.id === 1 && Date.parse(update.available_at) > Date.now(),
    ),
  );
  assert.ok(
    updates.some((update) => update.id === 2 && update.state === "ticket"),
  );
});
