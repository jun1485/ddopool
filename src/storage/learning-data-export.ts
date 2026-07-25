import { loadUnlockedAchievements } from "@/storage/achievement-store";
import { loadBookmarks } from "@/storage/bookmark-store";
import { loadCustomSessionPresets } from "@/storage/custom-session-preset-store";
import { loadExamEnrollment } from "@/storage/exam-enrollment-store";
import { loadLearningSessionHistory } from "@/storage/learning-session-history-store";
import { loadMockExamHistory } from "@/storage/mock-exam-history-store";
import { loadSettings } from "@/storage/settings-store";
import { loadSrsCards } from "@/storage/srs-store";
import {
  loadDailyStats,
  loadPerformanceStats,
} from "@/storage/stats-store";
import { loadStudyTarget } from "@/storage/study-target-store";
import { loadWrongAnswerNotes } from "@/storage/wrong-answer-note-store";

// 개인 학습 데이터 백업 스냅샷
export interface LearningDataExport {
  schemaVersion: 1;
  appVersion: string;
  exportedAt: string;
  privacy: {
    excludesAuthentication: true;
    excludesUserIdentity: true;
    excludesQuestionContent: true;
  };
  data: {
    settings: Awaited<ReturnType<typeof loadSettings>>;
    enrollment: Awaited<ReturnType<typeof loadExamEnrollment>>;
    dailyStats: Awaited<ReturnType<typeof loadDailyStats>>;
    performance: Awaited<ReturnType<typeof loadPerformanceStats>>;
    srsCards: Awaited<ReturnType<typeof loadSrsCards>>;
    bookmarks: Awaited<ReturnType<typeof loadBookmarks>>;
    wrongAnswerNotes: Awaited<ReturnType<typeof loadWrongAnswerNotes>>;
    unlockedAchievements: Awaited<
      ReturnType<typeof loadUnlockedAchievements>
    >;
    studyTarget: Awaited<ReturnType<typeof loadStudyTarget>>;
    mockExamHistory: Awaited<ReturnType<typeof loadMockExamHistory>>;
    learningSessionHistory: Awaited<
      ReturnType<typeof loadLearningSessionHistory>
    >;
    customSessionPresets: Awaited<
      ReturnType<typeof loadCustomSessionPresets>
    >;
  };
}

// 인증 정보 제외 개인 학습 데이터 백업 생성
export async function createLearningDataExport(
  appVersion: string,
  exportedAt: number,
): Promise<string> {
  const [
    settings,
    enrollment,
    dailyStats,
    performance,
    srsCards,
    bookmarks,
    wrongAnswerNotes,
    unlockedAchievements,
    studyTarget,
    mockExamHistory,
    learningSessionHistory,
    customSessionPresets,
  ] = await Promise.all([
    loadSettings(),
    loadExamEnrollment(),
    loadDailyStats(),
    loadPerformanceStats(),
    loadSrsCards(),
    loadBookmarks(),
    loadWrongAnswerNotes(),
    loadUnlockedAchievements(),
    loadStudyTarget(),
    loadMockExamHistory(),
    loadLearningSessionHistory(),
    loadCustomSessionPresets(),
  ]);
  const snapshot: LearningDataExport = {
    schemaVersion: 1,
    appVersion,
    exportedAt: new Date(exportedAt).toISOString(),
    privacy: {
      excludesAuthentication: true,
      excludesUserIdentity: true,
      excludesQuestionContent: true,
    },
    data: {
      settings,
      enrollment,
      dailyStats,
      performance,
      srsCards,
      bookmarks,
      wrongAnswerNotes,
      unlockedAchievements,
      studyTarget,
      mockExamHistory,
      learningSessionHistory,
      customSessionPresets,
    },
  };

  return JSON.stringify(snapshot, null, 2);
}
