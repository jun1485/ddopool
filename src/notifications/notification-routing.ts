import type { NotificationResponse } from "expo-notifications";
import { Platform } from "react-native";

// 알림 응답 내부 앱 경로 추출
function getNotificationRoute(response: NotificationResponse): string | null {
  const url = response.notification.request.content.data?.url;
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//")
    ? url
    : null;
}

// 알림 응답 앱 라우팅 구독
export async function subscribeToNotificationRouting(
  navigate: (url: string) => void,
): Promise<() => void> {
  if (Platform.OS === "web") return () => undefined;
  const Notifications = await import("expo-notifications");
  const handledIdentifiers = new Set<string>();

  // 알림 응답 중복 제거·라우팅
  const handleResponse = (response: NotificationResponse) => {
    const identifier = response.notification.request.identifier;
    if (handledIdentifiers.has(identifier)) return;
    const route = getNotificationRoute(response);
    if (route == null) return;
    handledIdentifiers.add(identifier);
    navigate(route);
  };

  const initialResponse =
    await Notifications.getLastNotificationResponseAsync();
  if (initialResponse != null) {
    handleResponse(initialResponse);
    await Notifications.clearLastNotificationResponseAsync();
  }
  const subscription =
    Notifications.addNotificationResponseReceivedListener(handleResponse);
  return () => subscription.remove();
}
