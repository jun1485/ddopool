import * as Crypto from "expo-crypto";

import type { RecordAttemptInput } from "../../packages/contracts/src";

import {
  addPendingLearningAttempt,
  removePendingLearningAttempts,
} from "@/storage/pending-learning-attempt-store";
import { enqueueLearningSync } from "@/sync/learning-sync-outbox";
import type { EnqueueLearningSyncResult } from "@/sync/learning-sync-outbox";

let learningAttemptSyncVersion = 0;
let learningAttemptStorageFailureCount = 0;

// 진행 중인 풀이 이력 동기화 무효화
export function invalidateLearningAttemptSync(): void {
  learningAttemptSyncVersion += 1;
  learningAttemptStorageFailureCount = 0;
}

// 풀이 이력 저장 실패 횟수 조회
export function getLearningAttemptStorageFailureCount(): number {
  return learningAttemptStorageFailureCount;
}

// 풀이 이력 저장 실패 상태 초기화
export function resetLearningAttemptStorageFailureCount(): void {
  learningAttemptStorageFailureCount = 0;
}

// 풀이 이력 로컬 보관·동기화 대기열 적재
export async function queueLearningAttempt(
  input: RecordAttemptInput,
  expectedUserId?: string | null,
): Promise<EnqueueLearningSyncResult> {
  const currentSyncVersion = learningAttemptSyncVersion;
  const payload = {
    ...input,
    answeredAt: input.answeredAt ?? new Date().toISOString(),
    clientAttemptId: input.clientAttemptId ?? Crypto.randomUUID(),
  };
  const attempt = {
    ...payload,
    userId: expectedUserId ?? null,
  };
  let journalStored = true;
  try {
    await addPendingLearningAttempt(attempt);
  } catch {
    journalStored = false;
  }
  if (currentSyncVersion !== learningAttemptSyncVersion) {
    if (journalStored)
      await removePendingLearningAttempts([attempt.clientAttemptId]).catch(
        () => undefined,
      );
    return "suppressed";
  }
  const result = await enqueueLearningSync(
    { type: "attempt", payload },
    expectedUserId,
  );
  if (!journalStored && result === "suppressed") {
    learningAttemptStorageFailureCount += 1;
    return "failed";
  }
  return result;
}
