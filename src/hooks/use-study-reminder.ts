import { useExamEnrollment } from "@/hooks/use-exam-enrollment";
import { useEffect } from "react";
import { AppState } from "react-native";
import { prepareWebReminder } from "@/notifications/web-reminder";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { updateStudyReminder } from "@/notifications/study-reminder";
import { subscribeStudyActivity } from "@/storage/stats-store";

// 앱 복귀·학습 저장 시 미학습 알림 갱신
export function useStudyReminder(): void {
  const { settings, isLoading } = useSettings();
  const { user } = useAuth();
  const { onboardingCompleted } = useExamEnrollment();
  useEffect(() => {
    if (isLoading || !onboardingCompleted) return;
    void prepareWebReminder();
    let timeout: ReturnType<typeof setTimeout>;
    // 연속 풀이 저장 알림 갱신 병합
    const refresh = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        void updateStudyReminder(
          settings.studyReminderEnabled,
          settings.studyReminderHour,
          "initial",
        );
      }, 250);
    };
    refresh();
    const unsubscribe = subscribeStudyActivity(refresh);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active" || state === "background") refresh();
    });
    // 자정·시간대 변경 시 예약 갱신
    const interval = setInterval(refresh, 60 * 60 * 1000);
    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
      unsubscribe();
      subscription.remove();
    };
  }, [
    isLoading,
    onboardingCompleted,
    settings.studyReminderEnabled,
    settings.studyReminderHour,
    settings.reminderDailyLimit,
    settings.reminderQuietHour,
    settings.reminderPausedDate,
    user?.id,
  ]);
}
