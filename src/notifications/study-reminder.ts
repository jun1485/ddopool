import { loadSettings } from "@/storage/settings-store";
import { loadNativeNotifications } from "./native-notifications";
import { updateWebReminder } from "./web-reminder";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, AppState, Platform } from "react-native";

import { isNotificationPermissionGranted } from "@/notifications/notification-permission";
import {
  registerDevicePushToken,
  syncStudyReminderPreference,
} from "@/notifications/push-registration";
import { captureHandledError } from "@/lib/monitoring";

import { createStudyReminderPlan } from "./study-reminder-plan";
import { loadDailyStats, toDateKey } from "@/storage/stats-store";

const STUDY_REMINDER_ID_KEY = "exam-loop:study-reminder-id:v1";
const STUDY_REMINDER_CHANNEL_ID = "study-reminders";
let handlerConfigured = false;
let reminderExplained = false;
// 첫 알림 권한 요청의 목적 안내
async function explainReminder(): Promise<boolean> {
  return new Promise((resolve) =>
    Alert.alert(
      "매일 한 문제, 함께 시작해요",
      "선택한 시간에 학습을 알려드려요. 문제를 풀면 그날 남은 알림은 멈추고, 설정에서 횟수와 쉬는 시간을 바꿀 수 있어요.",
      [
        { text: "나중에", style: "cancel", onPress: () => resolve(false) },
        { text: "알림 계속 설정", onPress: () => resolve(true) },
      ],
      { cancelable: false },
    ),
  );
}

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
  const Notifications = await loadNativeNotifications();
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
  const Notifications = await loadNativeNotifications();
  const legacyId = await AsyncStorage.getItem(STUDY_REMINDER_ID_KEY);
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const request of scheduled) {
    if (
      request.identifier === legacyId ||
      request.content.data?.kind === "study-reminder"
    )
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
  }
  await AsyncStorage.removeItem(STUDY_REMINDER_ID_KEY);
}

// 학습 리마인더 예약 상태 갱신
async function scheduleStudyReminders(
  enabled: boolean,
  hour: number,
  requestPermission: boolean | "initial",
): Promise<StudyReminderResult> {
  if (Platform.OS === "web") return "unsupported";
  try {
    await configureStudyNotificationHandler();
    const Notifications = await loadNativeNotifications();
    if (!enabled) {
      await cancelStoredStudyReminder();
      await syncStudyReminderPreference(
        false,
        hour,
        new Date(Date.now() + 60_000),
        false,
      );
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
    if (
      requestPermission === "initial" &&
      !currentPermissionGranted &&
      currentPermission.status === "undetermined" &&
      AppState.currentState === "active"
    ) {
      if (reminderExplained) return "denied";
      reminderExplained = true;
      if (!(await explainReminder())) return "denied";
    }
    const permission = currentPermissionGranted
      ? currentPermission
      : currentPermission.canAskAgain &&
          (requestPermission === true ||
            (requestPermission === "initial" &&
              currentPermission.status === "undetermined" &&
              AppState.currentState === "active"))
        ? await Notifications.requestPermissionsAsync()
        : currentPermission;
    if (
      !isNotificationPermissionGranted(
        permission.status,
        permission.ios?.status ===
          Notifications.IosAuthorizationStatus.PROVISIONAL,
      )
    ) {
      await cancelStoredStudyReminder();
      return "denied";
    }
    await registerDevicePushToken();

    await cancelStoredStudyReminder();
    const now = new Date();
    const stats = await loadDailyStats();
    const plan = createStudyReminderPlan(
      now,
      hour,
      (stats[toDateKey(now.getTime())]?.answered ?? 0) > 0,
      await loadSettings(),
    );
    try {
      for (const slot of plan) {
        await Notifications.scheduleNotificationAsync({
          identifier: "study-reminder:" + slot.date.getTime(),
          content: {
            title: slot.title,
            body: slot.body,
            color: slot.urgent ? "#D92D20" : "#51434F",
            data: { url: "/", kind: "study-reminder" },
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DATE,
            date: slot.date,
            channelId: STUDY_REMINDER_CHANNEL_ID,
          },
        });
      }
    } catch (error) {
      await cancelStoredStudyReminder();
      throw error;
    }
    const localUntil = new Date(now);
    localUntil.setDate(localUntil.getDate() + 14);
    localUntil.setHours(0, 0, 0, 0);
    await syncStudyReminderPreference(
      true,
      hour,
      localUntil,
      (stats[toDateKey(now.getTime())]?.answered ?? 0) > 0,
    ).catch((error) => captureHandledError(error, "study-reminder-server"));
    return "scheduled";
  } catch {
    return "failed";
  }
}

let reminderQueue: Promise<StudyReminderResult> = Promise.resolve("disabled");

// 알림 설정 변경 순차 처리
export function updateStudyReminder(
  enabled: boolean,
  hour: number,
  requestPermission: boolean | "initial" = true,
): Promise<StudyReminderResult> {
  if (Platform.OS === "web")
    return updateWebReminder(enabled, hour, requestPermission === true);
  reminderQueue = reminderQueue
    .catch(() => "failed" as const)
    .then(() => scheduleStudyReminders(enabled, hour, requestPermission));
  return reminderQueue;
}
