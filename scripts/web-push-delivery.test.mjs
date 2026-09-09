import assert from "node:assert/strict";
import { test } from "node:test";
import { deliverWebPush, isWebPushEndpoint } from "./web-push-delivery.mjs";
import { readFileSync } from "node:fs";
import vm from "node:vm";

// 웹 구독 저장소 모의 응답 구성
function fixture() {
  const deleted = [];
  const client = {
    from(table) {
      const query = {
        select() {
          return query;
        },
        delete() {
          deleted.push(table);
          return query;
        },
        eq() {
          return query;
        },
        single: async () => ({
          data: {
            endpoint: "https://web.push.apple.com/test",
            p256dh: "test",
            auth: "test",
          },
        }),
        then(resolve) {
          return Promise.resolve({ error: null }).then(resolve);
        },
      };
      return query;
    },
  };
  return { client, deleted };
}
const env = {
  WEB_PUSH_SUBJECT: "https://example.com",
  WEB_PUSH_PUBLIC_KEY: "public",
  WEB_PUSH_PRIVATE_KEY: "private",
};
test("푸시 서비스 외 주소와 인증정보·포트 차단", () => {
  for (const url of [
    "http://web.push.apple.com/test",
    "https://127.0.0.1/test",
    "https://web.push.apple.com.evil.test/a",
    "https://user@web.push.apple.com/a",
    "https://web.push.apple.com:8080/a",
  ])
    assert.equal(isWebPushEndpoint(url), false);
  assert.equal(isWebPushEndpoint("https://web.push.apple.com/a"), true);
});
test("마감 웹 알림 내용과 TTL 발송", async () => {
  const { client } = fixture();
  assert.equal(
    await deliverWebPush(
      client,
      { token: "web:test", study_date: "2026-09-09", study_hour: 21 },
      async (sub, payload, options) => {
        const content = JSON.parse(payload);
        assert.equal(content.title, "🔴 오늘 학습 마감까지 3시간");
        assert.equal(content.url, "/");
        assert.equal(options.TTL, 900);
        assert.equal(sub.endpoint, "https://web.push.apple.com/test");
      },
      env,
    ),
    "sent",
  );
});
test("시험 요청 웹 알림은 알림함 경로 전달", async () => {
  const { client } = fixture();
  await deliverWebPush(
    client,
    { token: "web:test", study_date: null },
    async (_sub, payload) => {
      const content = JSON.parse(payload);
      assert.equal(content.title, "또풀 알림");
      assert.equal(content.body, "시험 요청에 새 소식이 있어요.");
      assert.equal(content.url, "/notifications");
    },
    env,
  );
});
test("만료 구독 제거와 일시 장애 재시도 구분", async () => {
  const { client, deleted } = fixture();
  assert.equal(
    await deliverWebPush(
      client,
      { token: "web:test" },
      async () => {
        throw { statusCode: 410 };
      },
      env,
    ),
    "dead",
  );
  assert.deepEqual(deleted, ["push_tokens"]);
  await assert.rejects(
    deliverWebPush(
      client,
      { token: "web:test" },
      async () => {
        throw new Error("일시 장애");
      },
      env,
    ),
  );
  assert.equal(deleted.length, 1);
});
test("서비스워커 알림 표시와 안전한 학습 경로 열기", async () => {
  const listeners = {};
  const shown = [];
  const opened = [];
  const navigated = [];
  let windows = [];
  let focused = 0;
  vm.runInNewContext(readFileSync("public/sw.js", "utf8"), {
    URL,
    self: {
      location: { origin: "https://app.test" },
      addEventListener: (name, callback) => {
        listeners[name] = callback;
      },
      registration: {
        showNotification: async (...args) => {
          shown.push(args);
        },
      },
      clients: {
        matchAll: async () => windows,
        openWindow: async (url) => {
          opened.push(url);
        },
      },
    },
  });
  let pending;
  listeners.push({
    data: {
      json: () => ({
        title: "학습",
        body: "한 문제",
        url: "https://evil.test",
      }),
    },
    waitUntil: (p) => {
      pending = p;
    },
  });
  await pending;
  assert.equal(shown[0][0], "학습");
  assert.equal(shown[0][1].data.url, "/");
  listeners.push({
    data: {
      json: () => ({
        title: "요청 소식",
        body: "상태 변경",
        url: "/notifications",
      }),
    },
    waitUntil: (p) => {
      pending = p;
    },
  });
  await pending;
  assert.equal(shown[1][1].data.url, "/notifications");
  listeners.notificationclick({
    notification: { close() {}, data: shown[1][1].data },
    waitUntil: (p) => {
      pending = p;
    },
  });
  await pending;
  assert.deepEqual(opened, ["/notifications"]);
  windows = [
    {
      url: "https://app.test/library",
      navigate: async (url) => {
        navigated.push(url);
      },
      focus: async () => {
        focused += 1;
      },
    },
  ];
  listeners.notificationclick({
    notification: { close() {}, data: shown[1][1].data },
    waitUntil: (p) => {
      pending = p;
    },
  });
  await pending;
  assert.deepEqual(opened, ["/notifications"]);
  assert.deepEqual(navigated, ["/notifications"]);
  assert.equal(focused, 1);
});
