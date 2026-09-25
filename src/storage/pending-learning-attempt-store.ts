import {
  appendPendingAttempt,
  clearPendingAttempts,
  readPendingAttempts,
  removePendingAttempts,
} from "@/storage/pending-attempt-persistence";

import type { RecordAttemptInput } from "../../packages/contracts/src";

const PENDING_LEARNING_ATTEMPT_LIMIT = 1_000;
let pendingAttemptWriteQueue: Promise<void> = Promise.resolve();

// 서버 이관 대기 풀이 이력
export interface PendingLearningAttempt extends RecordAttemptInput {
  answeredAt: string;
  clientAttemptId: string;
  userId: string | null;
}

// 서버 이관 대기 풀이 이력 로드
export async function loadPendingLearningAttempts(): Promise<
  PendingLearningAttempt[]
> {
  await pendingAttemptWriteQueue.catch(() => undefined);
  return readPendingAttempts();
}

// 서버 이관 대기 풀이 이력 추가
export function addPendingLearningAttempt(
  attempt: PendingLearningAttempt,
): Promise<void> {
  pendingAttemptWriteQueue = pendingAttemptWriteQueue
    .catch(() => undefined)
    .then(async () => {
      try {
        await appendPendingAttempt(attempt, PENDING_LEARNING_ATTEMPT_LIMIT);
      } catch {
        await appendPendingAttempt(attempt, PENDING_LEARNING_ATTEMPT_LIMIT);
      }
    });
  return pendingAttemptWriteQueue;
}

// 서버 이관 완료 풀이 이력 제거
export function removePendingLearningAttempts(
  clientAttemptIds: string[],
): Promise<void> {
  if (clientAttemptIds.length === 0) return Promise.resolve();
  pendingAttemptWriteQueue = pendingAttemptWriteQueue
    .catch(() => undefined)
    .then(() => removePendingAttempts(clientAttemptIds));
  return pendingAttemptWriteQueue;
}

// 서버 이관 대기 풀이 이력 전체 삭제
export function clearPendingLearningAttempts(): Promise<void> {
  pendingAttemptWriteQueue = pendingAttemptWriteQueue
    .catch(() => undefined)
    .then(clearPendingAttempts);
  return pendingAttemptWriteQueue;
}

// 저장 대기 작업 종료 대기
export async function settlePendingLearningAttemptStore(): Promise<void> {
  await pendingAttemptWriteQueue.catch(() => undefined);
}
