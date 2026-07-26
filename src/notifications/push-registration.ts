import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform } from "react-native";

import { supabase } from "@/lib/supabase";
import { isNotificationPermissionGranted } from "@/notifications/notification-permission";
import { registerPushToken } from "@/repositories/push-token-repository";

export type PushRegistrationResult =
  | "registered"
  | "denied"
  | "signed-out"
  | "unsupported"
  | "unconfigured"
  | "failed";

const PUSH_CHANNEL_ID = "default";

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
    if (!isGranted) return "denied";

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (typeof projectId !== "string" || projectId.length === 0)
      return "unconfigured";

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerPushToken(token.data, Platform.OS);
    return "registered";
  } catch {
    return "failed";
  }
}
