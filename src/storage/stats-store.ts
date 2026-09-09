import { retryableWrite } from "./retry-write";
import {
  dailyStatsSchema,
  idsSchema,
  performanceSchema,
} from "@/storage/data-schemas";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

import type { QuestionAttemptRow } from "../../packages/contracts/src";

import { ExamId } from "@/types/exam";

const DAILY_STATS_KEY = "exam-loop:daily-stats";
const PERFORMANCE_STATS_KEY = "exam-loop:performance-stats";
const ATTEMPT_FINGERPRINTS_KEY = "exam-loop:attempt-fingerprints:v1";
const MERGED_REMOTE_ATTEMPTS_KEY = "exam-loop:merged-remote-attempts:v1";
const LAST_MERGED_ATTEMPT_AT_KEY =
  "exam-loop:last-merged-attempt-answered-at:v1";
const DAY_MS = 24 * 60 * 60 * 1000;
const ATTEMPT_HISTORY_LIMIT = 10_000;
let statsWriteQueue: Promise<void> = Promise.resolve();
const studyListeners = new Set<() => void>();

// 학습 기록 변경 구독
export function subscribeStudyActivity(listener: () => void): () => void {
  studyListeners.add(listener);
  return () => {
    studyListeners.delete(listener);
  };
}

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

const EMPTY_PERFORMANCE_STATS: PerformanceStats = {
  overall: { answered: 0, correct: 0 },
  byExam: {},
  bySubject: {},
};

interface AnswerAggregateInput {
  examId: ExamId;
  subject: string;
  isCorrect: boolean;
  answeredAt: number;
}

interface UpdatedStats {
  daily: DailyStatMap;
  performance: PerformanceStats;
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

// 동기화된 풀이 기록 식별자 로드
async function loadAttemptIdentityState(): Promise<{
  fingerprints: string[];
  remoteIds: number[];
  lastMergedAttemptAt: string | null;
}> {
  try {
    const [fingerprintsRaw, remoteIdsRaw, lastMergedAttemptAtRaw] =
      await AsyncStorage.multiGet([
        ATTEMPT_FINGERPRINTS_KEY,
        MERGED_REMOTE_ATTEMPTS_KEY,
        LAST_MERGED_ATTEMPT_AT_KEY,
      ]);
    return {
      fingerprints:
        fingerprintsRaw[1] == null
          ? []
          : idsSchema.parse(JSON.parse(fingerprintsRaw[1])),
      remoteIds:
        remoteIdsRaw[1] == null
          ? []
          : z.array(z.number().int()).parse(JSON.parse(remoteIdsRaw[1])),
      lastMergedAttemptAt: lastMergedAttemptAtRaw[1],
    };
  } catch {
    return {
      fingerprints: [],
      remoteIds: [],
      lastMergedAttemptAt: null,
    };
  }
}

// 풀이 1건 통계 집계
function aggregateAnswer(
  dailyStats: DailyStatMap,
  performance: PerformanceStats,
  input: AnswerAggregateInput,
): UpdatedStats {
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
    const raw = await AsyncStorage.getItem(DAILY_STATS_KEY);
    return raw != null ? dailyStatsSchema.parse(JSON.parse(raw)) : {};
  } catch {
    return {};
  }
}

// 저장된 누적 학습 성과 로드
export async function loadPerformanceStats(): Promise<PerformanceStats> {
  try {
    const raw = await AsyncStorage.getItem(PERFORMANCE_STATS_KEY);
    return raw != null
      ? performanceSchema.parse(JSON.parse(raw))
      : EMPTY_PERFORMANCE_STATS;
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
  const [stats, performance, identityState] = await Promise.all([
    loadDailyStats(),
    loadPerformanceStats(),
    loadAttemptIdentityState(),
  ]);
  if (
    identityState.fingerprints.includes(
      createAttemptFingerprint(questionId, now),
    )
  )
    return;
  const nextStats = aggregateAnswer(stats, performance, {
    examId,
    subject,
    isCorrect,
    answeredAt: now,
  });
  const fingerprints = [
    ...identityState.fingerprints,
    createAttemptFingerprint(questionId, now),
  ].slice(-ATTEMPT_HISTORY_LIMIT);

  const entries: [string, string][] = [
    [DAILY_STATS_KEY, JSON.stringify(nextStats.daily)],
    [PERFORMANCE_STATS_KEY, JSON.stringify(nextStats.performance)],
    [ATTEMPT_FINGERPRINTS_KEY, JSON.stringify(fingerprints)],
  ];
  await retryableWrite(() => AsyncStorage.multiSet(entries));
  studyListeners.forEach((listener) => listener());
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

// 마지막 서버 풀이 병합 시각 로드
export async function loadLastMergedAttemptAt(): Promise<string | undefined> {
  await waitForStatsWrites();
  return (await loadAttemptIdentityState()).lastMergedAttemptAt ?? undefined;
}

// 서버 풀이 기록 로컬 통계 병합
export async function mergeRemoteAttempts(
  attempts: QuestionAttemptRow[],
): Promise<void> {
  statsWriteQueue = statsWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const [dailyStats, performance, identityState] = await Promise.all([
        loadDailyStats(),
        loadPerformanceStats(),
        loadAttemptIdentityState(),
      ]);
      const knownFingerprints = new Set(identityState.fingerprints);
      const mergedRemoteIds = new Set(identityState.remoteIds);
      let lastMergedAttemptAt = identityState.lastMergedAttemptAt;
      let nextStats: UpdatedStats = {
        daily: dailyStats,
        performance,
      };

      attempts.forEach((attempt) => {
        const answeredAt = new Date(attempt.answered_at).getTime();
        if (
          lastMergedAttemptAt == null ||
          answeredAt > new Date(lastMergedAttemptAt).getTime()
        )
          lastMergedAttemptAt = new Date(answeredAt).toISOString();
        if (mergedRemoteIds.has(attempt.id)) return;
        const fingerprint = createAttemptFingerprint(
          attempt.question_id,
          answeredAt,
        );
        mergedRemoteIds.add(attempt.id);
        if (knownFingerprints.has(fingerprint)) return;
        knownFingerprints.add(fingerprint);
        nextStats = aggregateAnswer(nextStats.daily, nextStats.performance, {
          examId: attempt.exam_id,
          subject: attempt.subject,
          isCorrect: attempt.is_correct,
          answeredAt,
        });
      });

      const statsEntries: [string, string][] = [
        [DAILY_STATS_KEY, JSON.stringify(nextStats.daily)],
        [PERFORMANCE_STATS_KEY, JSON.stringify(nextStats.performance)],
        [
          ATTEMPT_FINGERPRINTS_KEY,
          JSON.stringify([...knownFingerprints].slice(-ATTEMPT_HISTORY_LIMIT)),
        ],
        [
          MERGED_REMOTE_ATTEMPTS_KEY,
          JSON.stringify([...mergedRemoteIds].slice(-ATTEMPT_HISTORY_LIMIT)),
        ],
      ];
      if (lastMergedAttemptAt != null)
        statsEntries.push([LAST_MERGED_ATTEMPT_AT_KEY, lastMergedAttemptAt]);
      await AsyncStorage.multiSet(statsEntries);
      studyListeners.forEach((listener) => listener());
    });
  return statsWriteQueue;
}

// 학습 통계 전체 삭제
export function clearDailyStats(): Promise<void> {
  statsWriteQueue = statsWriteQueue
    .catch(() => undefined)
    .then(() =>
      AsyncStorage.multiRemove([
        DAILY_STATS_KEY,
        PERFORMANCE_STATS_KEY,
        ATTEMPT_FINGERPRINTS_KEY,
        MERGED_REMOTE_ATTEMPTS_KEY,
        LAST_MERGED_ATTEMPT_AT_KEY,
      ]),
    );
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
