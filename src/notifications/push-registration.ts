import { syncReminderPolicy } from "./reminder-policy";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";
import { disconnectWebReminder } from "./web-reminder";

import { supabase } from "@/lib/supabase";
import { isNotificationPermissionGranted } from "@/notifications/notification-permission";
import { examPlatformApi } from "@/repositories/exam-platform-api";
import { registerPushToken } from "@/repositories/push-token-repository";

export type PushRegistrationResult =
  | "registered"
  | "denied"
  | "signed-out"
  | "unsupported"
  | "unconfigured"
  | "failed";

const PUSH_CHANNEL_ID = "default";
const PUSH_TOKEN_KEY = "exam-loop:device-push-token:v1";

// 기기 학습 알림의 서버 인계 설정 저장
export async function syncStudyReminderPreference(
  enabled: boolean,
  hour: number,
  localUntil: Date,
  studiedToday: boolean,
): Promise<void> {
  if (supabase == null) return;
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (token == null) return;
  await syncReminderPolicy(token);
  const { error } = await supabase.rpc("save_study_reminder", {
    p_token: token,
    p_enabled: enabled,
    p_hour: hour,
    p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    p_local_until: localUntil.toISOString(),
    p_studied_today: studiedToday,
  });
  if (error) throw error;
}

// 기기 알림 수신 연결 해제
export async function unregisterDevicePushToken(): Promise<void> {
  if (Platform.OS === "web") return disconnectWebReminder();
  const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  if (token == null) return;
  await examPlatformApi.unregisterPushToken(token);
  await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
}

// 허용된 기기 푸시 토큰 등록
export async function registerDevicePushToken(): Promise<PushRegistrationResult> {
  if (Platform.OS !== "ios" && Platform.OS !== "android") return "unsupported";
  if (!Device.isDevice) return "unsupported";
  if (supabase == null) return "unconfigured";

  try {
    const { data, error } = await supabase.auth.getSession();
    if (error != null) return "failed";
    if (data.session == null) return "signed-out";

    const Notifications = await import("expo-notifications");
    if (Platform.OS === "android")
      await Notifications.setNotificationChannelAsync(PUSH_CHANNEL_ID, {
        name: "기본 알림",
        importance: Notifications.AndroidImportance.DEFAULT,
      });

    const permission = await Notifications.getPermissionsAsync();
    const isGranted = isNotificationPermissionGranted(
      permission.status,
      permission.ios?.status ===
        Notifications.IosAuthorizationStatus.PROVISIONAL,
    );
    if (!isGranted) {
      await unregisterDevicePushToken();
      return "denied";
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (typeof projectId !== "string" || projectId.length === 0)
      return "unconfigured";

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    const previousToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (previousToken != null && previousToken !== token.data)
      await unregisterDevicePushToken();
    await registerPushToken(token.data, Platform.OS);
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token.data);
    return "registered";
  } catch {
    return "failed";
  }
}
