import type * as NativePersistence from "@/storage/pending-attempt-persistence.native";
import { pendingAttemptsSchema } from "@/storage/data-schemas";
import AsyncStorage from "@react-native-async-storage/async-storage";

const PENDING_LEARNING_ATTEMPTS_KEY = "exam-loop:pending-learning-attempts:v1";

// 대기 풀이 기록 저장 순서대로 조회
export const readPendingAttempts: typeof NativePersistence.readPendingAttempts =
  async () => {
    const raw = await AsyncStorage.getItem(PENDING_LEARNING_ATTEMPTS_KEY);
    return raw == null ? [] : pendingAttemptsSchema.parse(JSON.parse(raw));
  };

// 한도 안에서 대기 풀이 기록 추가
export const appendPendingAttempt: typeof NativePersistence.appendPendingAttempt =
  async (attempt, limit) => {
    const nextAttempts = [
      ...(await readPendingAttempts()).filter(
        (current) => current.clientAttemptId !== attempt.clientAttemptId,
      ),
      attempt,
    ];
    if (nextAttempts.length > limit)
      throw new Error("서버 이관 대기 풀이 이력 저장 한도를 초과했습니다.");
    await AsyncStorage.setItem(
      PENDING_LEARNING_ATTEMPTS_KEY,
      JSON.stringify(nextAttempts),
    );
  };

// 서버 이관 완료 기록 제거
export const removePendingAttempts: typeof NativePersistence.removePendingAttempts =
  async (clientAttemptIds) => {
    const completedIds = new Set(clientAttemptIds);
    await AsyncStorage.setItem(
      PENDING_LEARNING_ATTEMPTS_KEY,
      JSON.stringify(
        (await readPendingAttempts()).filter(
          (attempt) => !completedIds.has(attempt.clientAttemptId),
        ),
      ),
    );
  };

// 대기 풀이 기록 전체 삭제
export const clearPendingAttempts: typeof NativePersistence.clearPendingAttempts =
  () => AsyncStorage.removeItem(PENDING_LEARNING_ATTEMPTS_KEY);
