export type NotificationPermissionStatus =
  "granted" | "denied" | "undetermined";

// 알림 권한 허용 상태 판별
export function isNotificationPermissionGranted(
  status: NotificationPermissionStatus,
  isIosProvisional: boolean,
): boolean {
  return status === "granted" || isIosProvisional;
}
