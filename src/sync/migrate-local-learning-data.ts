import AsyncStorage from "@react-native-async-storage/async-storage";

import { loadBookmarks } from "@/storage/bookmark-store";
import { loadExamEnrollment } from "@/storage/exam-enrollment-store";
import { loadSrsCards } from "@/storage/srs-store";
import { enqueueLearningSync } from "@/sync/learning-sync-outbox";

const LEARNING_MIGRATION_KEY = "exam-loop:learning-sync-migrated:v1";

// 로컬 학습 기록 서버 동기화 대기열 이관
export async function migrateLocalLearningData(): Promise<void> {
  const migrated = await AsyncStorage.getItem(LEARNING_MIGRATION_KEY);
  if (migrated === "true") return;

  const [enrollment, bookmarks, cards] = await Promise.all([
    loadExamEnrollment(),
    loadBookmarks(),
    loadSrsCards(),
  ]);
  const operations = [
    ...(enrollment?.examIds.map((examId) =>
      enqueueLearningSync({ type: "enroll", payload: { examId } }),
    ) ?? []),
    ...bookmarks.map((questionId) =>
      enqueueLearningSync({
        type: "bookmark-add",
        payload: { questionId },
      }),
    ),
  ];
  const progress = Object.values(cards).map((card) => ({
    questionId: card.questionId,
    examId: card.examId,
    repetitions: card.repetitions,
    easeFactor: card.easeFactor,
    intervalDays: card.intervalDays,
    dueAt: new Date(card.dueAt).toISOString(),
    lastReviewedAt: new Date(card.lastReviewedAt).toISOString(),
  }));
  if (progress.length > 0)
    operations.push(
      enqueueLearningSync({ type: "progress", payload: progress }),
    );

  await Promise.all(operations);
  await AsyncStorage.setItem(LEARNING_MIGRATION_KEY, "true");
}
