// 네이티브 알림 모듈 지연 로드
export function loadNativeNotifications(): Promise<
  typeof import("expo-notifications")
> {
  return import("expo-notifications");
}
