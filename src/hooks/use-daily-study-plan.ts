import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import {
  createDailyStudyPlan,
  DailyStudyPlan,
} from "@/learning/daily-study-plan";
import { loadSrsCards, SrsCardMap } from "@/storage/srs-store";
import type { PerformanceStats } from "@/storage/stats-store";
import type { Question } from "@/types/exam";

interface UseDailyStudyPlanInput {
  questions: Question[];
  enrolledExamIds: string[];
  performance: PerformanceStats;
  dailyGoal: number;
  todayAnswered: number;
  sessionSize: number;
}

const EMPTY_PLAN: DailyStudyPlan = {
  status: "empty",
  remainingGoal: 0,
  totalCount: 0,
  tasks: [],
  questionIds: [],
};

// 일일 맞춤 학습 플랜 상태 관리
export function useDailyStudyPlan({
  questions,
  enrolledExamIds,
  performance,
  dailyGoal,
  todayAnswered,
  sessionSize,
}: UseDailyStudyPlanInput) {
  const [cards, setCards] = useState<SrsCardMap>({});
  const [planCreatedAt, setPlanCreatedAt] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 최신 복습 카드 상태 갱신
  const reload = useCallback(async () => {
    setCards(await loadSrsCards());
    setPlanCreatedAt(Date.now());
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const plan = useMemo(
    () =>
      isLoading
        ? EMPTY_PLAN
        : createDailyStudyPlan({
            questions,
            enrolledExamIds,
            cards,
            performance,
            dailyGoal,
            todayAnswered,
            sessionSize,
            now: planCreatedAt,
          }),
    [
      cards,
      dailyGoal,
      enrolledExamIds,
      isLoading,
      performance,
      planCreatedAt,
      questions,
      sessionSize,
      todayAnswered,
    ],
  );

  return { plan, isLoading, reload };
}
