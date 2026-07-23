import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  NotificationRow,
  NotificationType,
} from "../../packages/contracts/src";

const NOTIFICATIONS_KEY = "exam-loop:notifications:v1";
let notificationWriteQueue: Promise<void> = Promise.resolve();
const notificationListeners = new Set<
  (notifications: NotificationRow[]) => void
>();

// 로컬 알림 목록 변경 전파
function notifyLocalNotifications(notifications: NotificationRow[]): void {
  notificationListeners.forEach((listener) => listener(notifications));
}

// 로컬 알림 목록 변경 구독
export function subscribeLocalNotifications(
  listener: (notifications: NotificationRow[]) => void,
): () => void {
  notificationListeners.add(listener);
  return () => {
    notificationListeners.delete(listener);
  };
}

// 로컬 알림 목록 로드
export async function loadLocalNotifications(): Promise<NotificationRow[]> {
  try {
    const raw = await AsyncStorage.getItem(NOTIFICATIONS_KEY);
    return raw == null ? [] : (JSON.parse(raw) as NotificationRow[]);
  } catch {
    return [];
  }
}

// 로컬 알림 생성
export async function createLocalNotification(
  type: NotificationType,
  payload: NotificationRow["payload"],
): Promise<NotificationRow> {
  const notification: NotificationRow = {
    id: Date.now(),
    user_id: "local-user",
    type,
    payload,
    read_at: null,
    created_at: new Date().toISOString(),
  };
  notificationWriteQueue = notificationWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const notifications = await loadLocalNotifications();
      const nextNotifications = [notification, ...notifications];
      await AsyncStorage.setItem(
        NOTIFICATIONS_KEY,
        JSON.stringify(nextNotifications),
      );
      notifyLocalNotifications(nextNotifications);
    });
  await notificationWriteQueue;
  return notification;
}

// 로컬 알림 읽음 처리
export async function markLocalNotificationRead(
  notificationId: number,
): Promise<void> {
  notificationWriteQueue = notificationWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const notifications = await loadLocalNotifications();
      const nextNotifications = notifications.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read_at: new Date().toISOString() }
          : notification,
      );
      await AsyncStorage.setItem(
        NOTIFICATIONS_KEY,
        JSON.stringify(nextNotifications),
      );
      notifyLocalNotifications(nextNotifications);
    });
  await notificationWriteQueue;
}
