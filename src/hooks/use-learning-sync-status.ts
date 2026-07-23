import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { learningSyncApi } from "@/repositories/learning-sync-api";
import { hydrateRemoteLearningData } from "@/sync/hydrate-remote-learning-data";
import {
  flushLearningSyncOutbox,
  loadLearningSyncOutbox,
} from "@/sync/learning-sync-outbox";

// 학습 동기화 대기 상태 집계
export function useLearningSyncStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // 학습 동기화 대기 건수 갱신
  const reload = useCallback(async () => {
    setPendingCount((await loadLearningSyncOutbox()).length);
  }, []);

  // 학습 기록 즉시 동기화
  const synchronize = useCallback(async (): Promise<boolean> => {
    if (learningSyncApi == null || isSyncing) return false;
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const result = await flushLearningSyncOutbox(learningSyncApi);
      if (result.pendingCount > 0) {
        setPendingCount(result.pendingCount);
        setSyncMessage("연결이 안정되면 다시 전송해 주세요.");
        return false;
      }
      await hydrateRemoteLearningData(learningSyncApi);
      await reload();
      setSyncMessage("최신 학습 기록으로 동기화됐어요.");
      return true;
    } catch {
      await reload();
      setSyncMessage("동기화하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, reload]);

  // 화면 포커스 시 동기화 상태 갱신
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return {
    pendingCount,
    isSyncing,
    syncMessage,
    isSyncAvailable: learningSyncApi != null,
    reload,
    synchronize,
  };
}
