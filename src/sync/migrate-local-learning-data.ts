import AsyncStorage from "@react-native-async-storage/async-storage";

import type { LearningSyncApi } from "../../packages/contracts/src";

import { loadBookmarks } from "@/storage/bookmark-store";
import { loadExamEnrollment } from "@/storage/exam-enrollment-store";
import {
  loadPendingLearningAttempts,
  removePendingLearningAttempts,
} from "@/storage/pending-learning-attempt-store";
import { loadSrsCards } from "@/storage/srs-store";
import { resetLearningAttemptStorageFailureCount } from "@/sync/learning-attempt-sync";
import type { LearningSyncResult } from "@/sync/learning-sync-outbox";
import {
  completeLearningSyncOutboxRecovery,
  enqueueLearningSync,
  flushLearningSyncOutbox,
  getLearningSyncEnqueueFailureCount,
  isLearningSyncOutboxRecoveryPending,
  resetLearningSyncEnqueueFailureCount,
  retryFailedLearningSyncOperations,
} from "@/sync/learning-sync-outbox";

const LEARNING_MIGRATION_KEY = "exam-loop:learning-sync-migrated:v1";
const MIGRATION_FLUSH_LIMIT = 2;
let migrationQueue: Promise<void> = Promise.resolve();

// 로컬 학습 기록 서버 동기화 대기열 이관 실행
async function performLocalLearningMigration(userId: string): Promise<void> {
  const [migrated, shouldRecoverOutbox] = await Promise.all([
    AsyncStorage.getItem(LEARNING_MIGRATION_KEY),
    isLearningSyncOutboxRecoveryPending(),
  ]);
  const shouldMigrateState = migrated !== userId || shouldRecoverOutbox;

  const [enrollment, bookmarks, cards, pendingAttempts] = await Promise.all([
    loadExamEnrollment(),
    loadBookmarks(),
    loadSrsCards(),
    loadPendingLearningAttempts(),
  ]);
  const examIds = enrollment?.examIds ?? [
    ...new Set(Object.values(cards).map((card) => card.examId)),
  ];
  const operations = shouldMigrateState
    ? [
        ...examIds.map((examId) =>
          enqueueLearningSync({ type: "enroll", payload: { examId } }, userId),
        ),
        ...bookmarks.map((questionId) =>
          enqueueLearningSync(
            {
              type: "bookmark-add",
              payload: { questionId },
            },
            userId,
          ),
        ),
      ]
    : [];
  const progress = shouldMigrateState
    ? Object.values(cards).map((card) => ({
        questionId: card.questionId,
        examId: card.examId,
        repetitions: card.repetitions,
        easeFactor: card.easeFactor,
        intervalDays: card.intervalDays,
        dueAt: new Date(card.dueAt).toISOString(),
        lastReviewedAt: new Date(card.lastReviewedAt).toISOString(),
      }))
    : [];
  if (progress.length > 0)
    operations.push(
      enqueueLearningSync({ type: "progress", payload: progress }, userId),
    );

  const mismatchedAttemptIds = pendingAttempts
    .filter((attempt) => attempt.userId != null && attempt.userId !== userId)
    .map((attempt) => attempt.clientAttemptId);
  await removePendingLearningAttempts(mismatchedAttemptIds);
  const results = await Promise.all(operations);
  const attemptResults = await Promise.all(
    pendingAttempts
      .filter(
        (attempt) => !mismatchedAttemptIds.includes(attempt.clientAttemptId),
      )
      .map((attempt) => {
        const { userId: _userId, ...payload } = attempt;
        return enqueueLearningSync({ type: "attempt", payload }, userId);
      }),
  );
  if (
    results.some((result) => result !== "enqueued") ||
    attemptResults.some((result) => result !== "enqueued")
  )
    throw new Error("로컬 학습 기록을 동기화 대기열에 저장하지 못했습니다.");
  if (shouldMigrateState)
    await AsyncStorage.setItem(LEARNING_MIGRATION_KEY, userId);
  if (shouldRecoverOutbox) await completeLearningSyncOutboxRecovery();
}

// 로컬 학습 기록 서버 동기화 대기열 이관
export function migrateLocalLearningData(userId: string): Promise<void> {
  migrationQueue = migrationQueue
    .catch(() => undefined)
    .then(() => performLocalLearningMigration(userId));
  return migrationQueue;
}

// 로컬 학습 기록 이관·전송
export async function flushMigratedLearningData(
  api: LearningSyncApi,
  userId: string,
): Promise<LearningSyncResult> {
  const aggregate: LearningSyncResult = {
    syncedCount: 0,
    pendingCount: 0,
    discardedCount: 0,
  };
  for (let pass = 0; pass < MIGRATION_FLUSH_LIMIT; pass += 1) {
    const queuedResult = await flushLearningSyncOutbox(api);
    aggregate.syncedCount += queuedResult.syncedCount;
    aggregate.discardedCount += queuedResult.discardedCount;
    aggregate.pendingCount = queuedResult.pendingCount;
    if (queuedResult.pendingCount > 0) return aggregate;

    if (getLearningSyncEnqueueFailureCount() > 0) {
      await clearLocalLearningMigration();
      await retryFailedLearningSyncOperations();
    }
    let migrationFailed = false;
    try {
      await migrateLocalLearningData(userId);
    } catch {
      migrationFailed = true;
    }
    const result = await flushLearningSyncOutbox(api);
    aggregate.syncedCount += result.syncedCount;
    aggregate.discardedCount += result.discardedCount;
    aggregate.pendingCount = result.pendingCount;
    if (result.pendingCount > 0) return aggregate;
    const pendingAttemptCount = (await loadPendingLearningAttempts()).length;
    if (
      !migrationFailed &&
      pendingAttemptCount === 0 &&
      getLearningSyncEnqueueFailureCount() === 0
    ) {
      resetLearningSyncEnqueueFailureCount();
      resetLearningAttemptStorageFailureCount();
      return aggregate;
    }
  }
  throw new Error("로컬 학습 기록 동기화가 완료되지 않았습니다.");
}

// 로컬 학습 기록 이관 상태 초기화
export function clearLocalLearningMigration(): Promise<void> {
  migrationQueue = migrationQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.removeItem(LEARNING_MIGRATION_KEY));
  return migrationQueue;
}

// 저장 대기 작업 종료 대기
export async function settleMigrateLocalLearningData(): Promise<void> {
  await migrationQueue.catch(() => undefined);
}
