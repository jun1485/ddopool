import { settleAchievementStore } from "@/storage/achievement-store";
import { settleActiveQuizSessionStore } from "@/storage/active-quiz-session-store";
import { settleBookmarkStore } from "@/storage/bookmark-store";
import { settleCustomSessionPresetStore } from "@/storage/custom-session-preset-store";
import { settleExamEnrollmentStore } from "@/storage/exam-enrollment-store";
import { settleLearningSessionHistoryStore } from "@/storage/learning-session-history-store";
import { settleMockExamHistoryStore } from "@/storage/mock-exam-history-store";
import { settlePendingLearningAttemptStore } from "@/storage/pending-learning-attempt-store";
import { settleSrsStore } from "@/storage/srs-store";
import { settleStatsStore } from "@/storage/stats-store";
import { settleStudyTargetStore } from "@/storage/study-target-store";
import { settleWrongAnswerNoteStore } from "@/storage/wrong-answer-note-store";
import { settleLearningSyncOutbox } from "@/sync/learning-sync-outbox";
import { settleMigrateLocalLearningData } from "@/sync/migrate-local-learning-data";

// 계정 학습 기록 저장 종료 대기
export async function settleLearningWrites(): Promise<void> {
  await Promise.all([
    settleAchievementStore(),
    settleActiveQuizSessionStore(),
    settleBookmarkStore(),
    settleCustomSessionPresetStore(),
    settleExamEnrollmentStore(),
    settleLearningSessionHistoryStore(),
    settleMockExamHistoryStore(),
    settlePendingLearningAttemptStore(),
    settleSrsStore(),
    settleStatsStore(),
    settleStudyTargetStore(),
    settleWrongAnswerNoteStore(),
    settleLearningSyncOutbox(),
    settleMigrateLocalLearningData(),
  ]);
}
