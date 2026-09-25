import { pendingAttemptsSchema } from "@/storage/data-schemas";
import { type LegacyImport, withLearningRows } from "@/storage/learning-rows";
import type { PendingLearningAttempt } from "@/storage/pending-learning-attempt-store";
import { readValidated } from "@/storage/read-validated";

const PENDING_LEARNING_ATTEMPTS_KEY = "exam-loop:pending-learning-attempts:v1";
const COLLECTION = "pending-learning-attempts";
const attemptSchema = pendingAttemptsSchema.element;

const legacyImport: LegacyImport = {
  collection: COLLECTION,
  legacyKey: PENDING_LEARNING_ATTEMPTS_KEY,
  decode: async () =>
    (
      await readValidated(
        PENDING_LEARNING_ATTEMPTS_KEY,
        pendingAttemptsSchema,
        [],
      )
    ).map((attempt) => [attempt.clientAttemptId, JSON.stringify(attempt)]),
};

// 행 값 대기 풀이 기록 검증 변환
function parseAttempt(value: string): PendingLearningAttempt[] {
  try {
    const parsed = attemptSchema.safeParse(JSON.parse(value));
    return parsed.success ? [parsed.data] : [];
  } catch {
    return [];
  }
}

// 대기 풀이 기록 저장 순서대로 조회
export function readPendingAttempts(): Promise<PendingLearningAttempt[]> {
  return withLearningRows([legacyImport], async (rows) =>
    (await rows.entries(COLLECTION)).flatMap(([, value]) =>
      parseAttempt(value),
    ),
  );
}

// 한도 안에서 대기 풀이 기록 추가
export function appendPendingAttempt(
  attempt: PendingLearningAttempt,
  limit: number,
): Promise<void> {
  return withLearningRows([legacyImport], async (rows) => {
    const exists =
      (await rows.get(COLLECTION, attempt.clientAttemptId)) != null;
    if (!exists && (await rows.count(COLLECTION)) >= limit)
      throw new Error("서버 이관 대기 풀이 이력 저장 한도를 초과했습니다.");
    await rows.put(COLLECTION, [
      [attempt.clientAttemptId, JSON.stringify(attempt)],
    ]);
  });
}

// 서버 이관 완료 기록 제거
export async function removePendingAttempts(
  clientAttemptIds: string[],
): Promise<void> {
  await withLearningRows([legacyImport], (rows) =>
    rows.remove(COLLECTION, clientAttemptIds),
  );
}

// 대기 풀이 기록 전체 삭제
export async function clearPendingAttempts(): Promise<void> {
  await withLearningRows([legacyImport], (rows) => rows.clear(COLLECTION));
}
