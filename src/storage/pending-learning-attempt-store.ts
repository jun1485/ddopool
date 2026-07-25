import AsyncStorage from "@react-native-async-storage/async-storage";

import type { RecordAttemptInput } from "../../packages/contracts/src";

const PENDING_LEARNING_ATTEMPTS_KEY = "exam-loop:pending-learning-attempts:v1";
const PENDING_LEARNING_ATTEMPT_LIMIT = 1_000;
let pendingAttemptWriteQueue: Promise<void> = Promise.resolve();

// 서버 이관 대기 풀이 이력
export interface PendingLearningAttempt extends RecordAttemptInput {
  answeredAt: string;
  clientAttemptId: string;
  userId: string | null;
}

// 서버 이관 대기 풀이 이력 원본 로드
async function readPendingLearningAttempts(): Promise<
  PendingLearningAttempt[]
> {
  const raw = await AsyncStorage.getItem(PENDING_LEARNING_ATTEMPTS_KEY);
  if (raw == null) return [];
  const attempts = JSON.parse(raw) as PendingLearningAttempt[];
  if (!Array.isArray(attempts))
    throw new Error("서버 이관 대기 풀이 이력 형식이 올바르지 않습니다.");
  return attempts;
}

// 서버 이관 대기 풀이 이력 로드
export async function loadPendingLearningAttempts(): Promise<
  PendingLearningAttempt[]
> {
  await pendingAttemptWriteQueue.catch(() => undefined);
  return readPendingLearningAttempts();
}

// 서버 이관 대기 풀이 이력 저장
async function persistPendingLearningAttempt(
  attempt: PendingLearningAttempt,
): Promise<void> {
  const attempts = await readPendingLearningAttempts();
  const nextAttempts = [
    ...attempts.filter(
      (current) => current.clientAttemptId !== attempt.clientAttemptId,
    ),
    attempt,
  ];
  if (nextAttempts.length > PENDING_LEARNING_ATTEMPT_LIMIT)
    throw new Error("서버 이관 대기 풀이 이력 저장 한도를 초과했습니다.");
  await AsyncStorage.setItem(
    PENDING_LEARNING_ATTEMPTS_KEY,
    JSON.stringify(nextAttempts),
  );
}

// 서버 이관 대기 풀이 이력 추가
export function addPendingLearningAttempt(
  attempt: PendingLearningAttempt,
): Promise<void> {
  pendingAttemptWriteQueue = pendingAttemptWriteQueue
    .catch(() => undefined)
    .then(async () => {
      try {
        await persistPendingLearningAttempt(attempt);
      } catch {
        await persistPendingLearningAttempt(attempt);
      }
    });
  return pendingAttemptWriteQueue;
}

// 서버 이관 완료 풀이 이력 제거
export function removePendingLearningAttempts(
  clientAttemptIds: string[],
): Promise<void> {
  if (clientAttemptIds.length === 0) return Promise.resolve();
  const completedIds = new Set(clientAttemptIds);
  pendingAttemptWriteQueue = pendingAttemptWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const attempts = await readPendingLearningAttempts();
      await AsyncStorage.setItem(
        PENDING_LEARNING_ATTEMPTS_KEY,
        JSON.stringify(
          attempts.filter(
            (attempt) => !completedIds.has(attempt.clientAttemptId),
          ),
        ),
      );
    });
  return pendingAttemptWriteQueue;
}

// 서버 이관 대기 풀이 이력 전체 삭제
export function clearPendingLearningAttempts(): Promise<void> {
  pendingAttemptWriteQueue = pendingAttemptWriteQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.removeItem(PENDING_LEARNING_ATTEMPTS_KEY));
  return pendingAttemptWriteQueue;
}
