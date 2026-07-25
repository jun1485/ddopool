import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import {
  ActiveQuizSession,
  clearActiveQuizSession,
  loadActiveQuizSession,
  subscribeActiveQuizSession,
} from "@/storage/active-quiz-session-store";

// 이어 풀기 세션 상태 관리
export function useActiveQuizSession() {
  const [session, setSession] = useState<ActiveQuizSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 이어 풀기 세션 갱신
  const reload = useCallback(async () => {
    setSession(await loadActiveQuizSession(Date.now()));
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  // 이어 풀기 세션 변경 실시간 반영
  useEffect(() => subscribeActiveQuizSession(setSession), []);

  // 이어 풀기 세션 폐기
  const discard = useCallback(async () => {
    setSession(null);
    await clearActiveQuizSession();
  }, []);

  return { session, isLoading, reload, discard };
}
