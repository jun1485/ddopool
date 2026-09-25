import { ExamId } from "@/types/exam";

// 일일 학습 집계
export interface DailyStat {
  answered: number;
  correct: number;
}

// 날짜 키(YYYY-MM-DD) 기준 일일 학습 집계 맵
export type DailyStatMap = Record<string, DailyStat>;

// 정답률 집계
export interface AccuracyStat {
  answered: number;
  correct: number;
}

// 과목별 정답률 집계
export interface SubjectAccuracyStat extends AccuracyStat {
  examId: ExamId;
  subject: string;
}

// 시험·과목별 누적 학습 성과
export interface PerformanceStats {
  overall: AccuracyStat;
  byExam: Partial<Record<ExamId, AccuracyStat>>;
  bySubject: Record<string, SubjectAccuracyStat>;
}

// 일일 집계·누적 성과 묶음
export interface StatsSnapshot {
  daily: DailyStatMap;
  performance: PerformanceStats;
}

// 서버 풀이 병합 직전 상태
export interface RemoteMergeState extends StatsSnapshot {
  knownFingerprints: Set<string>;
  mergedIds: Set<number>;
  lastMergedAttemptId: number | null;
  mergeSkipBefore: number | null;
}

// 서버 풀이 병합 결과
export interface RemoteMergeResult extends StatsSnapshot {
  addedFingerprints: string[];
  addedIds: number[];
  lastMergedAttemptId: number | null;
}

export const EMPTY_PERFORMANCE_STATS: PerformanceStats = {
  overall: { answered: 0, correct: 0 },
  byExam: {},
  bySubject: {},
};

export const ATTEMPT_HISTORY_LIMIT = 10_000;
export const DAILY_STATS_KEY = "exam-loop:daily-stats";
export const PERFORMANCE_STATS_KEY = "exam-loop:performance-stats";
export const ATTEMPT_FINGERPRINTS_KEY = "exam-loop:attempt-fingerprints:v1";
export const MERGED_REMOTE_ATTEMPTS_KEY = "exam-loop:merged-remote-attempts:v1";
export const LEGACY_LAST_MERGED_ATTEMPT_AT_KEY =
  "exam-loop:last-merged-attempt-answered-at:v1";
export const LAST_MERGED_ATTEMPT_ID_KEY = "exam-loop:last-merged-attempt-id:v1";
export const MERGE_SKIP_BEFORE_KEY = "exam-loop:merge-skip-before:v1";
