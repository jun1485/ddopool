import AsyncStorage from "@react-native-async-storage/async-storage";

import type {
  LearningSyncApi,
  RecordAttemptInput,
  UpsertProgressInput,
} from "../../packages/contracts/src";

const LEARNING_SYNC_OUTBOX_KEY = "exam-loop:learning-sync-outbox:v1";
let outboxWriteQueue: Promise<void> = Promise.resolve();
let operationSequence = 0;

// 학습 동기화 대기 작업
export type LearningSyncOperation =
  | {
      id: string;
      type: "enroll";
      payload: { examId: string };
      createdAt: string;
    }
  | {
      id: string;
      type: "unenroll";
      payload: { examId: string };
      createdAt: string;
    }
  | {
      id: string;
      type: "attempt";
      payload: RecordAttemptInput;
      createdAt: string;
    }
  | {
      id: string;
      type: "progress";
      payload: UpsertProgressInput[];
      createdAt: string;
    }
  | {
      id: string;
      type: "bookmark-add";
      payload: { questionId: string };
      createdAt: string;
    }
  | {
      id: string;
      type: "bookmark-remove";
      payload: { questionId: string };
      createdAt: string;
    };

// 학습 동기화 실행 결과
export interface LearningSyncResult {
  syncedCount: number;
  pendingCount: number;
}

type NewLearningSyncOperation = LearningSyncOperation extends infer Operation
  ? Operation extends LearningSyncOperation
    ? Omit<Operation, "id" | "createdAt">
    : never
  : never;

// 학습 동기화 작업 식별자 생성
function createOperationId(): string {
  operationSequence += 1;
  return `sync-${Date.now()}-${operationSequence}`;
}

// 학습 동기화 대기열 로드
export async function loadLearningSyncOutbox(): Promise<
  LearningSyncOperation[]
> {
  try {
    const raw = await AsyncStorage.getItem(LEARNING_SYNC_OUTBOX_KEY);
    return raw == null ? [] : (JSON.parse(raw) as LearningSyncOperation[]);
  } catch {
    return [];
  }
}

// 학습 동기화 대기열 저장
async function saveLearningSyncOutbox(
  operations: LearningSyncOperation[],
): Promise<void> {
  await AsyncStorage.setItem(
    LEARNING_SYNC_OUTBOX_KEY,
    JSON.stringify(operations),
  );
}

// 학습 동기화 작업 적재
export function enqueueLearningSync(
  operation: NewLearningSyncOperation,
): Promise<void> {
  const queuedOperation: LearningSyncOperation = {
    ...operation,
    id: createOperationId(),
    createdAt: new Date().toISOString(),
  };
  outboxWriteQueue = outboxWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const operations = await loadLearningSyncOutbox();
      await saveLearningSyncOutbox([...operations, queuedOperation]);
    });
  return outboxWriteQueue;
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

// 학습 동기화 대기열 순차 전송
export async function flushLearningSyncOutbox(
  api: LearningSyncApi,
): Promise<LearningSyncResult> {
  let result: LearningSyncResult = { syncedCount: 0, pendingCount: 0 };
  const flushPromise = outboxWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const operations = await loadLearningSyncOutbox();

      for (let index = 0; index < operations.length; index += 1) {
        try {
          await dispatchLearningSyncOperation(api, operations[index]);
        } catch {
          const pendingOperations = operations.slice(index);
          await saveLearningSyncOutbox(pendingOperations);
          result = {
            syncedCount: index,
            pendingCount: pendingOperations.length,
          };
          return;
        }
      }

      await saveLearningSyncOutbox([]);
      result = { syncedCount: operations.length, pendingCount: 0 };
    });
  outboxWriteQueue = flushPromise;
  await flushPromise;
  return result;
}
