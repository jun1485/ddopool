import type * as NativePersistence from "@/sync/learning-sync-outbox-persistence.native";
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

// 학습 동기화 대기 작업 목록 저장
async function writeOperations(
  operations: StoredLearningSyncOperation[],
): Promise<void> {
  await AsyncStorage.setItem(
    LEARNING_SYNC_OUTBOX_KEY,
    JSON.stringify(operations),
  );
}

// 학습 동기화 제외 기록 로드
async function readDeadLetters(): Promise<LearningSyncDeadLetter[]> {
  const raw = await AsyncStorage.getItem(LEARNING_SYNC_DEAD_LETTER_KEY);
  if (raw == null) return [];
  const entries = JSON.parse(raw) as LearningSyncDeadLetter[];
  if (!Array.isArray(entries))
    throw new Error("학습 동기화 제외 기록 형식이 올바르지 않습니다.");
  return entries;
}

// 학습 동기화 대기 작업 전체 조회
export const readOutboxOperations: typeof NativePersistence.readOutboxOperations =
  async () => {
    const raw = await AsyncStorage.getItem(LEARNING_SYNC_OUTBOX_KEY);
    if (raw == null) return [];
    try {
      const operations = JSON.parse(raw) as StoredLearningSyncOperation[];
      if (!Array.isArray(operations))
        throw new Error("학습 동기화 대기열 형식이 올바르지 않습니다.");
      return operations;
    } catch {
      // 파손 대기열 원본 격리
      await AsyncStorage.multiSet([
        [LEARNING_SYNC_CORRUPT_OUTBOX_KEY, raw],
        [LEARNING_SYNC_OUTBOX_KEY, "[]"],
        [LEARNING_SYNC_OUTBOX_RECOVERY_KEY, "pending"],
      ]);
      return [];
    }
  };

// 학습 동기화 대기 작업 함수형 갱신
export const updateOutboxOperations: typeof NativePersistence.updateOutboxOperations =
  async (createNext) => {
    const next = createNext(await readOutboxOperations());
    await writeOperations(next);
    return next;
  };

// 처리 완료 대기 작업 제거
export const removeOutboxOperation: typeof NativePersistence.removeOutboxOperation =
  async (id) => {
    await updateOutboxOperations((operations) =>
      operations.filter((operation) => operation.id !== id),
    );
  };

// 영구 실패 대기 작업 제외 기록 이동
export const moveOutboxOperationToDeadLetter: typeof NativePersistence.moveOutboxOperationToDeadLetter =
  async (entry, limit) => {
    const [operations, deadLetters] = await Promise.all([
      readOutboxOperations(),
      readDeadLetters(),
    ]);
    await AsyncStorage.multiSet([
      [
        LEARNING_SYNC_OUTBOX_KEY,
        JSON.stringify(
          operations.filter((operation) => operation.id !== entry.operation.id),
        ),
      ],
      [
        LEARNING_SYNC_DEAD_LETTER_KEY,
        JSON.stringify([...deadLetters, entry].slice(-limit)),
      ],
    ]);
  };

// 학습 동기화 대기열·제외 기록 전체 삭제
export const clearOutboxData: typeof NativePersistence.clearOutboxData = () =>
  AsyncStorage.multiRemove([
    LEARNING_SYNC_OUTBOX_KEY,
    LEARNING_SYNC_CORRUPT_OUTBOX_KEY,
    LEARNING_SYNC_OUTBOX_RECOVERY_KEY,
    LEARNING_SYNC_DEAD_LETTER_KEY,
  ]);
