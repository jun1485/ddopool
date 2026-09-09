import { synchronizeLearningExtras } from "@/sync/learning-extras";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { useAuth } from "@/hooks/use-auth";
import { learningSyncApi } from "@/repositories/learning-sync-api";
import { loadPendingLearningAttempts } from "@/storage/pending-learning-attempt-store";
import { hydrateRemoteLearningData } from "@/sync/hydrate-remote-learning-data";
import { getLearningAttemptStorageFailureCount } from "@/sync/learning-attempt-sync";
import {
  getLearningSyncEnqueueFailureCount,
  loadLearningSyncOutbox,
} from "@/sync/learning-sync-outbox";
import { flushMigratedLearningData } from "@/sync/migrate-local-learning-data";

// 학습 동기화 대기 상태 집계
export function useLearningSyncStatus() {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingAttemptCount, setPendingAttemptCount] = useState(0);
  const [failedEnqueueCount, setFailedEnqueueCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // 학습 동기화 대기 건수 갱신
  const reload = useCallback(async () => {
    try {
      const [operations, attempts] = await Promise.all([
        loadLearningSyncOutbox(),
        loadPendingLearningAttempts(),
      ]);
      const queuedAttemptIds = new Set(
        operations.flatMap((operation) =>
          operation.type === "attempt" &&
          operation.payload.clientAttemptId != null
            ? [operation.payload.clientAttemptId]
            : [],
        ),
      );
      setPendingCount(operations.length);
      setPendingAttemptCount(
        attempts.filter(
          (attempt) => !queuedAttemptIds.has(attempt.clientAttemptId),
        ).length,
      );
      setFailedEnqueueCount(
        getLearningSyncEnqueueFailureCount() +
          getLearningAttemptStorageFailureCount(),
      );
    } catch {
      setSyncMessage(
        "동기화 대기 기록을 읽지 못했어요. 기존 기록은 유지됐어요.",
      );
    }
  }, []);

  // 학습 기록 즉시 동기화
  const synchronize = useCallback(async (): Promise<boolean> => {
    if (learningSyncApi == null || user == null || isSyncing) return false;
    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const result = await flushMigratedLearningData(learningSyncApi, user.id);
      const remainingAttemptCount = (await loadPendingLearningAttempts())
        .length;
      if (result.pendingCount > 0 || remainingAttemptCount > 0) {
        await reload();
        setSyncMessage("연결이 안정되면 다시 전송해 주세요.");
        return false;
      }
      await hydrateRemoteLearningData(learningSyncApi);
      await synchronizeLearningExtras(user.id);
      await reload();
      setSyncMessage(
        result.discardedCount > 0
          ? `전송할 수 없는 ${result.discardedCount}개 기록을 제외하고 동기화됐어요.`
          : "최신 학습 기록으로 동기화됐어요.",
      );
      return true;
    } catch {
      await reload();
      setSyncMessage("동기화하지 못했어요. 잠시 후 다시 시도해 주세요.");
      return false;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, reload, user]);

  // 화면 포커스 시 동기화 상태 갱신
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return {
    pendingCount,
    pendingAttemptCount,
    failedEnqueueCount,
    isSyncing,
    syncMessage,
    isSyncAvailable: learningSyncApi != null,
    reload,
    synchronize,
  };
}
