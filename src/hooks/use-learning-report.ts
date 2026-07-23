import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import {
  AccuracyStat,
  loadDailyStats,
  loadPerformanceStats,
  PerformanceStats,
} from "@/storage/stats-store";

const EMPTY_ACCURACY: AccuracyStat = { answered: 0, correct: 0 };
const EMPTY_PERFORMANCE: PerformanceStats = {
  overall: EMPTY_ACCURACY,
  byExam: {},
  bySubject: {},
};

// 누적 학습 리포트 상태 관리
export function useLearningReport() {
  const [lifetime, setLifetime] = useState<AccuracyStat>(EMPTY_ACCURACY);
  const [performance, setPerformance] =
    useState<PerformanceStats>(EMPTY_PERFORMANCE);
  const [isLoading, setIsLoading] = useState(true);

  // 누적 학습 리포트 갱신
  const reload = useCallback(async () => {
    const [dailyStats, storedPerformance] = await Promise.all([
      loadDailyStats(),
      loadPerformanceStats(),
    ]);
    const lifetimeStats = Object.values(dailyStats).reduce<AccuracyStat>(
      (total, dailyStat) => ({
        answered: total.answered + dailyStat.answered,
        correct: total.correct + dailyStat.correct,
      }),
      EMPTY_ACCURACY,
    );

    setLifetime(lifetimeStats);
    setPerformance(storedPerformance);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { lifetime, performance, isLoading };
}
