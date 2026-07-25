import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import {
  LearningSessionResult,
  loadLearningSessionHistory,
} from "@/storage/learning-session-history-store";

// 완료 학습 세션 기록 관리
export function useLearningSessionHistory() {
  const [results, setResults] = useState<LearningSessionResult[]>([]);
  const [evaluatedAt, setEvaluatedAt] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 완료 학습 세션 기록 갱신
  const reload = useCallback(async () => {
    setResults(await loadLearningSessionHistory());
    setEvaluatedAt(Date.now());
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { results, evaluatedAt, isLoading, reload };
}
