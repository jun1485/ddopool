import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";

import type {
  LearningSyncApi,
  RecordAttemptInput,
  UpsertProgressInput,
} from "../../packages/contracts/src";

import { supabase } from "@/lib/supabase";
import { removePendingLearningAttempts } from "@/storage/pending-learning-attempt-store";
import { PermanentLearningSyncError } from "@/sync/learning-sync-error";

const LEARNING_SYNC_OUTBOX_KEY = "exam-loop:learning-sync-outbox:v1";
const LEARNING_SYNC_CORRUPT_OUTBOX_KEY =
  "exam-loop:learning-sync-outbox-corrupt:v1";
const LEARNING_SYNC_OUTBOX_RECOVERY_KEY =
  "exam-loop:learning-sync-outbox-recovery:v1";
const LEARNING_SYNC_DEAD_LETTER_KEY = "exam-loop:learning-sync-dead-letter:v1";
const OUTBOX_OPERATION_LIMIT = 1_000;
const OUTBOX_CHARACTER_LIMIT = 1_000_000;
const DEAD_LETTER_LIMIT = 100;
const FAILED_OPERATION_LIMIT = 1_000;
let outboxWriteQueue: Promise<void> = Promise.resolve();
let outboxVersion = 0;

type LearningSyncPayload =
  | {
      type: "enroll";
      payload: { examId: string };
    }
  | {
      type: "unenroll";
      payload: { examId: string };
    }
  | {
      type: "attempt";
      payload: RecordAttemptInput;
    }
  | {
      type: "progress";
      payload: UpsertProgressInput[];
    }
  | {
      type: "bookmark-add";
      payload: { questionId: string };
    }
  | {
      type: "bookmark-remove";
      payload: { questionId: string };
    };

// 학습 동기화 대기 작업
export type LearningSyncOperation = LearningSyncPayload & {
  id: string;
  userId: string | null;
  createdAt: string;
};

// 학습 동기화 실행 결과
export interface LearningSyncResult {
  syncedCount: number;
  pendingCount: number;
  discardedCount: number;
}

export type EnqueueLearningSyncResult = "enqueued" | "failed" | "suppressed";

type StoredLearningSyncOperation = LearningSyncPayload & {
  id: string;
  userId?: string;
  createdAt: string;
};

interface DeadLetterEntry {
  operation: LearningSyncOperation;
  errorCode: string;
  failedAt: string;
}

interface FailedLearningSyncOperation {
  operation: LearningSyncPayload;
  expectedUserId?: string | null;
}

let failedLearningSyncOperations: FailedLearningSyncOperation[] = [];

// 학습 동기화 대기열 원본 로드
async function readLearningSyncOutbox(): Promise<LearningSyncOperation[]> {
  const raw = await AsyncStorage.getItem(LEARNING_SYNC_OUTBOX_KEY);
  if (raw == null) return [];
  let operations: StoredLearningSyncOperation[];
  try {
    operations = JSON.parse(raw) as StoredLearningSyncOperation[];
    if (!Array.isArray(operations))
      throw new Error("학습 동기화 대기열 형식이 올바르지 않습니다.");
  } catch {
    // 파손 대기열 원본 격리
    await AsyncStorage.multiSet([
      [LEARNING_SYNC_CORRUPT_OUTBOX_KEY, raw],
      [LEARNING_SYNC_OUTBOX_KEY, "[]"],
      [LEARNING_SYNC_OUTBOX_RECOVERY_KEY, "pending"],
    ]);
    return [];
  }
  return operations.map((operation) => ({
    ...operation,
    userId: operation.userId ?? null,
  }));
}

// 학습 동기화 대기열 읽기 재시도
async function retryReadLearningSyncOutbox(): Promise<LearningSyncOperation[]> {
  try {
    return await readLearningSyncOutbox();
  } catch {
    return readLearningSyncOutbox();
  }
}

// 학습 동기화 대기열 로드
export async function loadLearningSyncOutbox(): Promise<
  LearningSyncOperation[]
> {
  await outboxWriteQueue.catch(() => undefined);
  return retryReadLearningSyncOutbox();
}

// 학습 동기화 대기열 원본 저장
async function writeLearningSyncOutbox(
  operations: LearningSyncOperation[],
): Promise<void> {
  await AsyncStorage.setItem(
    LEARNING_SYNC_OUTBOX_KEY,
    JSON.stringify(operations),
  );
}

// 학습 동기화 대기열 저장
async function saveLearningSyncOutbox(
  operations: LearningSyncOperation[],
): Promise<void> {
  try {
    await writeLearningSyncOutbox(operations);
  } catch {
    await writeLearningSyncOutbox(operations);
  }
}

// 학습 동기화 데드레터 로드
async function loadLearningSyncDeadLetters(): Promise<DeadLetterEntry[]> {
  const raw = await AsyncStorage.getItem(LEARNING_SYNC_DEAD_LETTER_KEY);
  if (raw == null) return [];
  const entries = JSON.parse(raw) as DeadLetterEntry[];
  if (!Array.isArray(entries))
    throw new Error("학습 동기화 제외 기록 형식이 올바르지 않습니다.");
  return entries;
}

// 인증 세션 사용자 식별자 로드
async function loadAuthenticatedUserId(): Promise<string | null> {
  if (supabase == null) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error != null) throw error;
  return data.session?.user.id ?? null;
}

// 학습 동기화 적재 실패 작업 보관
function retainFailedLearningSyncOperation(
  operation: LearningSyncPayload,
  expectedUserId?: string | null,
): void {
  const failedOperation = { operation, expectedUserId };
  const failedOperationKey = JSON.stringify(failedOperation);
  failedLearningSyncOperations = [
    ...failedLearningSyncOperations.filter(
      (current) => JSON.stringify(current) !== failedOperationKey,
    ),
    failedOperation,
  ].slice(-FAILED_OPERATION_LIMIT);
}

// 중복 동기화 대기 작업 최신값 병합
function coalesceLearningSyncOperations(
  operations: LearningSyncOperation[],
  operation: LearningSyncOperation,
): LearningSyncOperation[] {
  if (operation.type === "attempt") {
    const clientAttemptId = operation.payload.clientAttemptId;
    return clientAttemptId == null
      ? [...operations, operation]
      : [
          ...operations.filter(
            (current) =>
              current.type !== "attempt" ||
              current.userId !== operation.userId ||
              current.payload.clientAttemptId !== clientAttemptId,
          ),
          operation,
        ];
  }
  if (operation.type === "enroll" || operation.type === "unenroll")
    return [
      ...operations.filter(
        (current) =>
          (current.type !== "enroll" && current.type !== "unenroll") ||
          current.userId !== operation.userId ||
          current.payload.examId !== operation.payload.examId,
      ),
      operation,
    ];
  if (operation.type === "bookmark-add" || operation.type === "bookmark-remove")
    return [
      ...operations.filter(
        (current) =>
          (current.type !== "bookmark-add" &&
            current.type !== "bookmark-remove") ||
          current.userId !== operation.userId ||
          current.payload.questionId !== operation.payload.questionId,
      ),
      operation,
    ];
  if (operation.type !== "progress") return [...operations, operation];
  const latestProgress = [
    ...new Map(
      operation.payload.map((progress) => [progress.questionId, progress]),
    ).values(),
  ];
  const questionIds = new Set(
    latestProgress.map((progress) => progress.questionId),
  );
  const retainedOperations = operations.reduce<LearningSyncOperation[]>(
    (result, current) => {
      if (current.type !== "progress" || current.userId !== operation.userId)
        return [...result, current];
      const payload = current.payload.filter(
        (progress) => !questionIds.has(progress.questionId),
      );
      return payload.length === 0
        ? result
        : [...result, { ...current, payload }];
    },
    [],
  );
  return [...retainedOperations, { ...operation, payload: latestProgress }];
}

// 풀이 이력 멱등 식별자 보강
function normalizeLearningSyncPayload(
  operation: LearningSyncPayload,
): LearningSyncPayload {
  return operation.type === "attempt"
    ? {
        ...operation,
        payload: {
          ...operation.payload,
          clientAttemptId:
            operation.payload.clientAttemptId ?? Crypto.randomUUID(),
        },
      }
    : operation;
}

// 풀이 이력 대기 작업 멱등 식별자 보강
function normalizeQueuedAttemptPayloads(operations: LearningSyncOperation[]): {
  operations: LearningSyncOperation[];
  changed: boolean;
} {
  let changed = false;
  const normalizedOperations = operations.map((operation) => {
    if (
      operation.type !== "attempt" ||
      operation.payload.clientAttemptId != null
    )
      return operation;
    changed = true;
    return {
      ...operation,
      payload: {
        ...operation.payload,
        clientAttemptId: Crypto.randomUUID(),
      },
    };
  });
  return { operations: normalizedOperations, changed };
}

// 학습 동기화 작업 적재
export function enqueueLearningSync(
  operation: LearningSyncPayload,
  expectedUserId?: string | null,
  expectedOutboxVersion = outboxVersion,
): Promise<EnqueueLearningSyncResult> {
  const normalizedOperation = normalizeLearningSyncPayload(operation);
  const enqueuePromise = Promise.all([
    outboxWriteQueue.catch(() => undefined),
    loadAuthenticatedUserId(),
  ]).then(async ([, userId]) => {
    if (expectedOutboxVersion !== outboxVersion) return "suppressed" as const;
    if (expectedUserId === null) return "suppressed" as const;
    if (
      expectedUserId !== undefined &&
      (userId == null || userId !== expectedUserId)
    ) {
      retainFailedLearningSyncOperation(normalizedOperation, expectedUserId);
      return "failed" as const;
    }
    if (userId == null) return "suppressed" as const;
    const { operations } = normalizeQueuedAttemptPayloads(
      await retryReadLearningSyncOutbox(),
    );
    const queuedOperation: LearningSyncOperation = {
      ...normalizedOperation,
      id: Crypto.randomUUID(),
      userId,
      createdAt: new Date().toISOString(),
    };
    const nextOperations = coalesceLearningSyncOperations(
      operations,
      queuedOperation,
    );
    if (
      nextOperations.length > OUTBOX_OPERATION_LIMIT ||
      JSON.stringify(nextOperations).length > OUTBOX_CHARACTER_LIMIT
    )
      throw new Error("학습 동기화 대기열 저장 한도를 초과했습니다.");
    await saveLearningSyncOutbox(nextOperations);
    return "enqueued" as const;
  });
  outboxWriteQueue = enqueuePromise.then(
    () => undefined,
    () => undefined,
  );
  return enqueuePromise.catch(() => {
    retainFailedLearningSyncOperation(normalizedOperation, expectedUserId);
    return "failed";
  });
}

// 학습 동기화 작업 API 반영
async function dispatchLearningSyncOperation(
  api: LearningSyncApi,
  operation: LearningSyncOperation,
): Promise<void> {
  switch (operation.type) {
    case "enroll":
      await api.enrollExam(operation.payload.examId);
      break;
    case "unenroll":
      await api.unenrollExam(operation.payload.examId);
      break;
    case "attempt":
      await api.recordAttempt(operation.payload);
      break;
    case "progress":
      await api.upsertProgress(operation.payload);
      break;
    case "bookmark-add":
      await api.addBookmark(operation.payload.questionId);
      break;
    case "bookmark-remove":
      await api.removeBookmark(operation.payload.questionId);
      break;
  }
}

// 풀이 이력 대기 작업 멱등 식별자 조회
function getAttemptClientId(operation: LearningSyncOperation): string | null {
  return operation.type === "attempt"
    ? (operation.payload.clientAttemptId ?? null)
    : null;
}

// 영구 실패 작업 데드레터 이동
async function moveOperationToDeadLetter(
  operation: LearningSyncOperation,
  pendingOperations: LearningSyncOperation[],
  errorCode: string,
): Promise<void> {
  const deadLetters = await loadLearningSyncDeadLetters();
  const nextDeadLetters = [
    ...deadLetters,
    {
      operation,
      errorCode,
      failedAt: new Date().toISOString(),
    },
  ].slice(-DEAD_LETTER_LIMIT);
  await AsyncStorage.multiSet([
    [LEARNING_SYNC_OUTBOX_KEY, JSON.stringify(pendingOperations)],
    [LEARNING_SYNC_DEAD_LETTER_KEY, JSON.stringify(nextDeadLetters)],
  ]);
}

// 학습 동기화 대기열 순차 전송
export async function flushLearningSyncOutbox(
  api: LearningSyncApi,
): Promise<LearningSyncResult> {
  const currentOutboxVersion = outboxVersion;
  let result: LearningSyncResult = {
    syncedCount: 0,
    pendingCount: 0,
    discardedCount: 0,
  };
  const flushPromise = outboxWriteQueue
    .catch(() => undefined)
    .then(async () => {
      let operations = await retryReadLearningSyncOutbox();
      const completedAttemptIds: string[] = [];
      const normalizedOperations = normalizeQueuedAttemptPayloads(operations);
      operations = normalizedOperations.operations;
      if (normalizedOperations.changed)
        await saveLearningSyncOutbox(operations);
      const userId = await loadAuthenticatedUserId();
      if (userId == null) {
        result = {
          syncedCount: 0,
          pendingCount: operations.length,
          discardedCount: 0,
        };
        return;
      }

      while (operations.length > 0) {
        if (currentOutboxVersion !== outboxVersion) {
          result.pendingCount = operations.length;
          return;
        }
        const operation = operations[0];
        const pendingOperations = operations.slice(1);
        const activeUserId = await loadAuthenticatedUserId();
        if (operation.userId !== userId || activeUserId !== userId) {
          operations = pendingOperations;
          await saveLearningSyncOutbox(operations);
          const clientAttemptId = getAttemptClientId(operation);
          if (clientAttemptId != null)
            completedAttemptIds.push(clientAttemptId);
          result.discardedCount += 1;
          continue;
        }
        try {
          await dispatchLearningSyncOperation(api, operation);
        } catch (error) {
          if (error instanceof PermanentLearningSyncError) {
            operations = pendingOperations;
            await moveOperationToDeadLetter(operation, operations, error.code);
            const clientAttemptId = getAttemptClientId(operation);
            if (clientAttemptId != null)
              completedAttemptIds.push(clientAttemptId);
            result.discardedCount += 1;
            continue;
          }
          await removePendingLearningAttempts(completedAttemptIds).catch(
            () => undefined,
          );
          result.pendingCount = operations.length;
          return;
        }
        operations = pendingOperations;
        await saveLearningSyncOutbox(operations);
        const clientAttemptId = getAttemptClientId(operation);
        if (clientAttemptId != null) completedAttemptIds.push(clientAttemptId);
        result.syncedCount += 1;
      }

      await removePendingLearningAttempts(completedAttemptIds).catch(
        () => undefined,
      );
      result.pendingCount = 0;
    });
  outboxWriteQueue = flushPromise;
  await flushPromise;
  return result;
}

// 학습 동기화 적재 실패 횟수 조회
export function getLearningSyncEnqueueFailureCount(): number {
  return failedLearningSyncOperations.length;
}

// 학습 동기화 대기열 세대 조회
export function getLearningSyncOutboxVersion(): number {
  return outboxVersion;
}

// 학습 동기화 대기열 복구 필요 여부 조회
export async function isLearningSyncOutboxRecoveryPending(): Promise<boolean> {
  return (
    (await AsyncStorage.getItem(LEARNING_SYNC_OUTBOX_RECOVERY_KEY)) != null
  );
}

// 학습 동기화 대기열 복구 상태 완료
export function completeLearningSyncOutboxRecovery(): Promise<void> {
  return AsyncStorage.removeItem(LEARNING_SYNC_OUTBOX_RECOVERY_KEY);
}

// 학습 동기화 적재 실패 작업 재시도
export async function retryFailedLearningSyncOperations(): Promise<boolean> {
  const operations = failedLearningSyncOperations;
  failedLearningSyncOperations = [];
  const results = await Promise.all(
    operations.map(({ operation, expectedUserId }) =>
      enqueueLearningSync(operation, expectedUserId),
    ),
  );
  return results.every((result) => result === "enqueued");
}

// 학습 동기화 적재 실패 상태 초기화
export function resetLearningSyncEnqueueFailureCount(): void {
  failedLearningSyncOperations = [];
}

// 학습 동기화 로컬 상태 초기화
export function clearLearningSyncOutbox(): Promise<void> {
  outboxVersion += 1;
  const clearPromise = outboxWriteQueue
    .catch(() => undefined)
    .then(async () => {
      await AsyncStorage.multiRemove([
        LEARNING_SYNC_OUTBOX_KEY,
        LEARNING_SYNC_CORRUPT_OUTBOX_KEY,
        LEARNING_SYNC_OUTBOX_RECOVERY_KEY,
        LEARNING_SYNC_DEAD_LETTER_KEY,
      ]);
      resetLearningSyncEnqueueFailureCount();
    });
  outboxWriteQueue = clearPromise;
  resetLearningSyncEnqueueFailureCount();
  return clearPromise;
}

// 저장 대기 작업 종료 대기
export async function settleLearningSyncOutbox(): Promise<void> {
  await outboxWriteQueue.catch(() => undefined);
}
