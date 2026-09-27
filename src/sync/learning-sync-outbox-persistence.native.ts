import {
  type LearningRows,
  type LegacyImport,
  withLearningRows,
} from "@/storage/learning-rows";
import type {
  LearningSyncDeadLetter,
  StoredLearningSyncOperation,
} from "@/sync/learning-sync-outbox";
import {
  LEARNING_SYNC_CORRUPT_OUTBOX_KEY,
  LEARNING_SYNC_DEAD_LETTER_KEY,
  LEARNING_SYNC_OUTBOX_KEY,
  LEARNING_SYNC_OUTBOX_RECOVERY_KEY,
} from "@/sync/learning-sync-outbox-keys";
import AsyncStorage from "@react-native-async-storage/async-storage";

const OUTBOX = "learning-sync-outbox";
const DEAD_LETTERS = "learning-sync-dead-letter";

// 파손 대기열 원본 격리·복구 예약
async function quarantineOutbox(raw: string): Promise<void> {
  await AsyncStorage.multiSet([
    [LEARNING_SYNC_CORRUPT_OUTBOX_KEY, raw],
    [LEARNING_SYNC_OUTBOX_RECOVERY_KEY, "pending"],
  ]);
}

// 기존 키 배열 원본 해석
async function readLegacyList(key: string): Promise<unknown[] | string> {
  const raw = (await AsyncStorage.getItem(key)) ?? "[]";
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : raw;
  } catch {
    return raw;
  }
}

const outboxImport: LegacyImport = {
  collection: OUTBOX,
  legacyKey: LEARNING_SYNC_OUTBOX_KEY,
  decode: async () => {
    const list = await readLegacyList(LEARNING_SYNC_OUTBOX_KEY);
    if (typeof list === "string") {
      await quarantineOutbox(list);
      return [];
    }
    return (list as StoredLearningSyncOperation[]).flatMap(
      (operation): [string, string][] =>
        typeof operation?.id === "string"
          ? [[operation.id, JSON.stringify(operation)]]
          : [],
    );
  },
};

// 제외 기록 행 식별자 생성
function deadLetterId(entry: LearningSyncDeadLetter, index: number): string {
  return `${entry.operation?.id ?? index}:${entry.failedAt ?? index}`;
}

const deadLetterImport: LegacyImport = {
  collection: DEAD_LETTERS,
  legacyKey: LEARNING_SYNC_DEAD_LETTER_KEY,
  decode: async () => {
    const list = await readLegacyList(LEARNING_SYNC_DEAD_LETTER_KEY);
    return typeof list === "string"
      ? []
      : (list as LearningSyncDeadLetter[]).map((entry, index) => [
          deadLetterId(entry, index),
          JSON.stringify(entry),
        ]);
  },
};

const imports = [outboxImport, deadLetterImport];

// 대기 작업 행 저장 순서대로 로드, 파손 행 격리
async function readOperations(
  rows: LearningRows,
): Promise<StoredLearningSyncOperation[]> {
  const operations: StoredLearningSyncOperation[] = [];
  const corrupt: [string, string][] = [];
  for (const [id, value] of await rows.entries(OUTBOX)) {
    try {
      const parsed = JSON.parse(value) as StoredLearningSyncOperation;
      if (typeof parsed === "object" && parsed?.id === id)
        operations.push(parsed);
      else corrupt.push([id, value]);
    } catch {
      corrupt.push([id, value]);
    }
  }
  if (corrupt.length > 0) {
    await rows.remove(
      OUTBOX,
      corrupt.map(([id]) => id),
    );
    await quarantineOutbox(JSON.stringify(corrupt.map(([, value]) => value)));
  }
  return operations;
}

// 대기 작업 목록 변경분만 행 반영
async function writeOperations(
  rows: LearningRows,
  current: StoredLearningSyncOperation[],
  next: StoredLearningSyncOperation[],
): Promise<void> {
  const previous = new Map(
    current.map((operation) => [operation.id, JSON.stringify(operation)]),
  );
  const nextIds = new Set(next.map((operation) => operation.id));
  await rows.remove(
    OUTBOX,
    current.flatMap((operation) =>
      nextIds.has(operation.id) ? [] : [operation.id],
    ),
  );
  await rows.put(
    OUTBOX,
    next.flatMap((operation): [string, string][] => {
      const value = JSON.stringify(operation);
      return previous.get(operation.id) === value
        ? []
        : [[operation.id, value]];
    }),
  );
}

// 학습 동기화 대기 작업 전체 조회
export function readOutboxOperations(): Promise<StoredLearningSyncOperation[]> {
  return withLearningRows(imports, readOperations);
}

// 학습 동기화 대기 작업 함수형 갱신
export function updateOutboxOperations(
  createNext: (
    current: StoredLearningSyncOperation[],
  ) => StoredLearningSyncOperation[],
): Promise<StoredLearningSyncOperation[]> {
  return withLearningRows(imports, async (rows) => {
    const current = await readOperations(rows);
    const next = createNext(current);
    await writeOperations(rows, current, next);
    return next;
  });
}

// 처리 완료 대기 작업 제거
export async function removeOutboxOperation(id: string): Promise<void> {
  await withLearningRows(imports, (rows) => rows.remove(OUTBOX, [id]));
}

// 영구 실패 대기 작업 제외 기록 이동
export async function moveOutboxOperationToDeadLetter(
  entry: LearningSyncDeadLetter,
  limit: number,
): Promise<void> {
  await withLearningRows(imports, async (rows) => {
    await rows.remove(OUTBOX, [entry.operation.id]);
    await rows.put(DEAD_LETTERS, [
      [deadLetterId(entry, 0), JSON.stringify(entry)],
    ]);
    await rows.trim(DEAD_LETTERS, limit);
  });
}

// 학습 동기화 대기열·제외 기록 전체 삭제
export async function clearOutboxData(): Promise<void> {
  await withLearningRows(imports, async (rows) => {
    await rows.clear(OUTBOX);
    await rows.clear(DEAD_LETTERS);
  });
  await AsyncStorage.multiRemove([
    LEARNING_SYNC_CORRUPT_OUTBOX_KEY,
    LEARNING_SYNC_OUTBOX_RECOVERY_KEY,
  ]);
}
