import { retryableWrite } from "./retry-write";
import {
  clearStatsData,
  commitAnswerStats,
  commitRemoteMerge,
  readMergeWatermark,
  readStatsSnapshot,
} from "@/storage/stats-persistence";
import {
  ATTEMPT_HISTORY_LIMIT,
  type DailyStatMap,
  EMPTY_PERFORMANCE_STATS,
  type PerformanceStats,
  type StatsSnapshot,
} from "@/storage/stats-types";

import type { QuestionAttemptRow } from "../../packages/contracts/src";

import { ExamId } from "@/types/exam";

export type {
  AccuracyStat,
  DailyStat,
  DailyStatMap,
  PerformanceStats,
  SubjectAccuracyStat,
} from "@/storage/stats-types";

const DAY_MS = 24 * 60 * 60 * 1000;
let statsWriteQueue: Promise<void> = Promise.resolve();
const studyListeners = new Set<() => void>();

// 학습 기록 변경 구독
export function subscribeStudyActivity(listener: () => void): () => void {
  studyListeners.add(listener);
  return () => {
    studyListeners.delete(listener);
  };
}

interface AnswerAggregateInput {
  examId: ExamId;
  subject: string;
  isCorrect: boolean;
  answeredAt: number;
}

// 로컬 타임존 기준 날짜 키 생성
export function toDateKey(now: number): string {
  const date = new Date(now);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// 풀이 기록 중복 식별자 생성
function createAttemptFingerprint(
  questionId: string,
  answeredAt: number,
): string {
  return `${questionId}:${answeredAt}`;
}

// 풀이 1건 통계 집계
function aggregateAnswer(
  snapshot: StatsSnapshot,
  input: AnswerAggregateInput,
): StatsSnapshot {
  const { daily: dailyStats, performance } = snapshot;
  const dateKey = toDateKey(input.answeredAt);
  const current = dailyStats[dateKey] ?? { answered: 0, correct: 0 };
  const subjectKey = `${input.examId}:${input.subject}`;
  const currentExam = performance.byExam[input.examId] ?? {
    answered: 0,
    correct: 0,
  };
  const currentSubject = performance.bySubject[subjectKey] ?? {
    examId: input.examId,
    subject: input.subject,
    answered: 0,
    correct: 0,
  };
  const correctIncrement = input.isCorrect ? 1 : 0;

  return {
    daily: {
      ...dailyStats,
      [dateKey]: {
        answered: current.answered + 1,
        correct: current.correct + correctIncrement,
      },
    },
    performance: {
      overall: {
        answered: performance.overall.answered + 1,
        correct: performance.overall.correct + correctIncrement,
      },
      byExam: {
        ...performance.byExam,
        [input.examId]: {
          answered: currentExam.answered + 1,
          correct: currentExam.correct + correctIncrement,
        },
      },
      bySubject: {
        ...performance.bySubject,
        [subjectKey]: {
          ...currentSubject,
          answered: currentSubject.answered + 1,
          correct: currentSubject.correct + correctIncrement,
        },
      },
    },
  };
}

// 저장된 일일 학습 집계 전체 로드
export async function loadDailyStats(): Promise<DailyStatMap> {
  try {
    return (await readStatsSnapshot()).daily;
  } catch {
    return {};
  }
}

// 저장된 누적 학습 성과 로드
export async function loadPerformanceStats(): Promise<PerformanceStats> {
  try {
    return (await readStatsSnapshot()).performance;
  } catch {
    return EMPTY_PERFORMANCE_STATS;
  }
}

// 풀이 1건 학습 성과 저장
async function persistAnswer(
  isCorrect: boolean,
  examId: ExamId,
  subject: string,
  now: number,
  questionId: string,
): Promise<void> {
  const outcome = { recorded: false };
  await retryableWrite(async () => {
    outcome.recorded = await commitAnswerStats(
      createAttemptFingerprint(questionId, now),
      (snapshot) =>
        aggregateAnswer(snapshot, {
          examId,
          subject,
          isCorrect,
          answeredAt: now,
        }),
      ATTEMPT_HISTORY_LIMIT,
    );
  });
  if (outcome.recorded) studyListeners.forEach((listener) => listener());
}

// 풀이 1건 학습 성과 순차 반영
export function recordAnswer(
  isCorrect: boolean,
  examId: ExamId,
  subject: string,
  now: number,
  questionId: string,
): Promise<void> {
  statsWriteQueue = statsWriteQueue
    .catch(() => undefined)
    .then(() => persistAnswer(isCorrect, examId, subject, now, questionId));
  return statsWriteQueue;
}

// 대기 중인 학습 통계 저장 완료 대기
export async function waitForStatsWrites(): Promise<void> {
  await statsWriteQueue.catch(() => undefined);
}

// 마지막으로 병합한 서버 풀이 id 로드
export async function loadLastMergedAttemptId(): Promise<number | undefined> {
  await waitForStatsWrites();
  try {
    return (await readMergeWatermark()) ?? undefined;
  } catch {
    return undefined;
  }
}

// 서버 풀이 기록 로컬 통계 병합
export async function mergeRemoteAttempts(
  attempts: QuestionAttemptRow[],
): Promise<void> {
  statsWriteQueue = statsWriteQueue
    .catch(() => undefined)
    .then(async () => {
      await commitRemoteMerge((state) => {
        const knownFingerprints = new Set(state.knownFingerprints);
        const mergedIds = new Set(state.mergedIds);
        const addedFingerprints: string[] = [];
        const addedIds: number[] = [];
        let lastMergedAttemptId = state.lastMergedAttemptId;
        let snapshot: StatsSnapshot = {
          daily: state.daily,
          performance: state.performance,
        };

        attempts.forEach((attempt) => {
          const answeredAt = new Date(attempt.answered_at).getTime();
          if (lastMergedAttemptId == null || attempt.id > lastMergedAttemptId)
            lastMergedAttemptId = attempt.id;
          if (mergedIds.has(attempt.id)) return;
          mergedIds.add(attempt.id);
          addedIds.push(attempt.id);
          // 백업 복원 이전 서버 이력의 중복 합산 방지
          if (
            state.mergeSkipBefore != null &&
            answeredAt < state.mergeSkipBefore
          )
            return;
          const fingerprint = createAttemptFingerprint(
            attempt.question_id,
            answeredAt,
          );
          if (knownFingerprints.has(fingerprint)) return;
          knownFingerprints.add(fingerprint);
          addedFingerprints.push(fingerprint);
          snapshot = aggregateAnswer(snapshot, {
            examId: attempt.exam_id,
            subject: attempt.subject,
            isCorrect: attempt.is_correct,
            answeredAt,
          });
        });

        return {
          ...snapshot,
          addedFingerprints,
          addedIds,
          lastMergedAttemptId,
        };
      }, ATTEMPT_HISTORY_LIMIT);
      studyListeners.forEach((listener) => listener());
    });
  return statsWriteQueue;
}

// 학습 통계 전체 삭제
export function clearDailyStats(): Promise<void> {
  statsWriteQueue = statsWriteQueue.catch(() => undefined).then(clearStatsData);
  return statsWriteQueue;
}

// 연속 학습 일수 계산
export function computeStreak(stats: DailyStatMap, now: number): number {
  let cursor = now;
  // 오늘 미학습 상태에서는 어제까지의 스트릭 유지 표시
  if ((stats[toDateKey(cursor)]?.answered ?? 0) === 0) cursor -= DAY_MS;

  let streak = 0;
  while ((stats[toDateKey(cursor)]?.answered ?? 0) > 0) {
    streak += 1;
    cursor -= DAY_MS;
  }
  return streak;
}

// 저장 대기 작업 종료 대기
export async function settleStatsStore(): Promise<void> {
  await statsWriteQueue.catch(() => undefined);
}
