import { useNotificationContext } from "@/providers/notification-provider";

// 인앱 알림 상태 연결
export function useNotifications() {
  return useNotificationContext();
}
