import type { StudyReminderResult } from "./study-reminder";
import type { WebReminderAvailability } from "./web-reminder.web";

export type { WebReminderAvailability } from "./web-reminder.web";

// 네이티브의 웹 알림 환경 대체
export function getWebReminderAvailability(): WebReminderAvailability {
  return "unsupported";
}
// 웹 알림 초기화 대체
export async function prepareWebReminder(): Promise<boolean> {
  return false;
}
// 네이티브의 웹 구독 해제 대체
export async function disconnectWebReminder(): Promise<void> {}
// 네이티브의 웹 알림 대체
export async function updateWebReminder(
  _enabled: boolean,
  _hour: number,
  _manual: boolean,
): Promise<StudyReminderResult> {
  return "unsupported";
}
