import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

import { isNotificationPermissionGranted } from "@/notifications/notification-permission";
import { registerDevicePushToken } from "@/notifications/push-registration";

const STUDY_REMINDER_ID_KEY = "exam-loop:study-reminder-id:v1";
const STUDY_REMINDER_CHANNEL_ID = "study-reminders";
let handlerConfigured = false;

export type StudyReminderResult =
  "scheduled" | "disabled" | "denied" | "unsupported" | "failed";

export const STUDY_REMINDER_HOURS = [7, 12, 18, 21] as const;

// 학습 리마인더 시간 표시
export function formatStudyReminderTime(hour: number): string {
  const period = hour < 12 ? "오전" : "오후";
  const displayHour = hour % 12 || 12;
  return `${period} ${displayHour}시`;
}

// 포그라운드 학습 리마인더 표시 설정
export async function configureStudyNotificationHandler(): Promise<void> {
  if (Platform.OS === "web" || handlerConfigured) return;
  const Notifications = await import("expo-notifications");
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  handlerConfigured = true;
}

// 기존 학습 리마인더 예약 취소
async function cancelStoredStudyReminder(): Promise<void> {
  const identifier = await AsyncStorage.getItem(STUDY_REMINDER_ID_KEY);
  if (identifier == null) return;
  const Notifications = await import("expo-notifications");
  await Notifications.cancelScheduledNotificationAsync(identifier);
  await AsyncStorage.removeItem(STUDY_REMINDER_ID_KEY);
}

// 학습 리마인더 예약 상태 갱신
export async function updateStudyReminder(
  enabled: boolean,
  hour: number,
): Promise<StudyReminderResult> {
  if (Platform.OS === "web") return "unsupported";
  try {
    await configureStudyNotificationHandler();
    const Notifications = await import("expo-notifications");
    if (!enabled) {
      await cancelStoredStudyReminder();
      return "disabled";
    }
    if (Platform.OS === "android")
      await Notifications.setNotificationChannelAsync(
        STUDY_REMINDER_CHANNEL_ID,
        {
          name: "학습 리마인더",
          importance: Notifications.AndroidImportance.DEFAULT,
        },
      );

    const currentPermission = await Notifications.getPermissionsAsync();
    const currentPermissionGranted = isNotificationPermissionGranted(
      currentPermission.status,
      currentPermission.ios?.status ===
        Notifications.IosAuthorizationStatus.PROVISIONAL,
    );
    const permission = currentPermissionGranted
      ? currentPermission
      : await Notifications.requestPermissionsAsync();
    if (
      !isNotificationPermissionGranted(
        permission.status,
        permission.ios?.status ===
          Notifications.IosAuthorizationStatus.PROVISIONAL,
      )
    )
      return "denied";
    void registerDevicePushToken();

    await cancelStoredStudyReminder();
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: "오늘의 학습 루프를 이어볼까요? 🔥",
        body: "짧게 한 세션만 풀어도 기억이 오래 유지돼요.",
        data: { url: "/" },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour,
        minute: 0,
        channelId: STUDY_REMINDER_CHANNEL_ID,
      },
    });
    await AsyncStorage.setItem(STUDY_REMINDER_ID_KEY, identifier);
    return "scheduled";
  } catch {
    return "failed";
  }
}
