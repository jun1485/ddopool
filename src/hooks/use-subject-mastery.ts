import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import { calculateSubjectMasteries } from "@/learning/subject-mastery";
import type { SubjectMastery } from "@/learning/subject-mastery";
import type { PerformanceStats } from "@/storage/stats-store";
import { loadSrsCards } from "@/storage/srs-store";
import type { SrsCardMap } from "@/storage/srs-store";
import type { Question } from "@/types/exam";

interface SubjectMasteryOptions {
  questions: Question[];
  enrolledExamIds: string[];
  performance: PerformanceStats;
  unresolvedQuestionIds: string[];
}

// 과목별 숙련도 상태 관리
export function useSubjectMastery({
  questions,
  enrolledExamIds,
  performance,
  unresolvedQuestionIds,
}: SubjectMasteryOptions): {
  masteries: SubjectMastery[];
  isLoading: boolean;
} {
  const [cards, setCards] = useState<SrsCardMap>({});
  const [evaluatedAt, setEvaluatedAt] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // SRS 숙련도 기준 갱신
  const reload = useCallback(async () => {
    setCards(await loadSrsCards());
    setEvaluatedAt(Date.now());
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const masteries = useMemo(
    () =>
      calculateSubjectMasteries({
        questions,
        enrolledExamIds,
        performance,
        cards,
        unresolvedQuestionIds,
        now: evaluatedAt,
      }),
    [
      cards,
      enrolledExamIds,
      evaluatedAt,
      performance,
      questions,
      unresolvedQuestionIds,
    ],
  );

  return { masteries, isLoading };
}
