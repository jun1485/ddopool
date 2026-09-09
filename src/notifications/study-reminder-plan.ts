import type { AppSettings } from "@/storage/settings-store";
export interface StudyReminderSlot {
  date: Date;
  urgent: boolean;
  title: string;
  body: string;
}

// 미학습 날짜의 단계별 알림 구성
export function createStudyReminderPlan(
  now: Date,
  hour: number,
  studiedToday: boolean,
  policy: Pick<
    AppSettings,
    "reminderDailyLimit" | "reminderQuietHour" | "reminderPausedDate"
  > = { reminderDailyLimit: 4, reminderQuietHour: 24, reminderPausedDate: "" },
): StudyReminderSlot[] {
  const hours = [...new Set([hour, 18, 21, 23])]
    .filter((value) => value >= hour && value < policy.reminderQuietHour)
    .sort((a, b) => a - b)
    .slice(0, policy.reminderDailyLimit);
  const slots: StudyReminderSlot[] = [];
  for (let day = 0; day < 14; day += 1) {
    if (day === 0 && studiedToday) continue;
    for (const scheduledHour of hours) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);
      date.setHours(scheduledHour, 0, 0, 0);
      if (
        `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` ===
        policy.reminderPausedDate
      )
        continue;
      if (date <= now) continue;
      const urgent = scheduledHour >= 21;
      slots.push({
        date,
        urgent,
        title: urgent
          ? `🔴 오늘 학습 마감까지 ${24 - scheduledHour}시간`
          : "오늘의 한 문제, 지금 풀어볼까요?",
        body: urgent
          ? "아직 오늘 풀이 기록이 없어요. 한 문제로 오늘의 연속 학습을 이어가세요."
          : "짧게 한 문제부터 시작해요. 오늘 학습하면 남은 알림은 멈춰요.",
      });
    }
  }
  return slots;
}
