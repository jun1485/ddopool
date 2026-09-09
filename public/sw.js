/* global self */
// 알림 이동 경로 안전화
function getNotificationRoute(value) {
  return typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
    ? value
    : "/";
}

// 웹 알림 표시
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    /* 기본 알림 표시 */
  }
  event.waitUntil(
    self.registration.showNotification(
      typeof payload.title === "string" ? payload.title : "또풀 학습 알림",
      {
        body:
          typeof payload.body === "string"
            ? payload.body
            : "오늘의 한 문제를 풀어보세요.",
        icon: "/app-icon.png",
        tag: "study-reminder",
        data: { url: getNotificationRoute(payload.url) },
      },
    ),
  );
});
// 알림 선택 시 학습 화면 열기
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const route = getNotificationRoute(event.notification.data?.url);
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      const existing = windows.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (existing) {
        await existing.navigate(route);
        return existing.focus();
      }
      return self.clients.openWindow(route);
    })(),
  );
});
