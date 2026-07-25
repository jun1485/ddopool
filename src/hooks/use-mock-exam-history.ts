import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import {
  loadMockExamHistory,
  MockExamResult,
} from "@/storage/mock-exam-history-store";

// 모의고사 회차 기록 관리
export function useMockExamHistory() {
  const [results, setResults] = useState<MockExamResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 모의고사 회차 기록 갱신
  const reload = useCallback(async () => {
    setResults(await loadMockExamHistory());
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return { results, isLoading, reload };
}
