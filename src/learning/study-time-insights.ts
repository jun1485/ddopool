import type { LearningSessionResult } from "@/storage/learning-session-history-store";
import type { QuizMode } from "@/types/exam";

export type StudyTimeRange = 7 | 30;
export type StudyTimeMode = "learn" | "review" | "mock";

// 날짜별 학습 시간
export interface StudyTimeDay {
  dateKey: string;
  label: string;
  displayLabel: string;
  durationSeconds: number;
  sessionCount: number;
  isToday: boolean;
}

// 기간별 학습 시간 인사이트
export interface StudyTimeInsights {
  days: StudyTimeDay[];
  totalSeconds: number;
  sessionCount: number;
  averageSessionSeconds: number;
  longestSessionSeconds: number;
  activeDays: number;
  bestDay: StudyTimeDay | null;
  byMode: Record<StudyTimeMode, number>;
}

// 로컬 날짜 키 생성
function toLocalDateKey(time: number): string {
  const date = new Date(time);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// 세션 모드 시간 집계 그룹 변환
function getStudyTimeMode(mode: QuizMode): StudyTimeMode {
  if (mode === "mock") return "mock";
  if (mode === "review") return "review";
  return "learn";
}

// 기간별 세션 학습 시간 집계
export function calculateStudyTimeInsights(
  results: LearningSessionResult[],
  range: StudyTimeRange,
  now: number,
): StudyTimeInsights {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: range }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (range - index - 1));
    return {
      dateKey: toLocalDateKey(date.getTime()),
      label:
        range === 7
          ? ["일", "월", "화", "수", "목", "금", "토"][date.getDay()]
          : `${date.getMonth() + 1}/${date.getDate()}`,
      displayLabel: `${date.getMonth() + 1}월 ${date.getDate()}일`,
      durationSeconds: 0,
      sessionCount: 0,
      isToday: index === range - 1,
    };
  });
  const dayIndex = new Map(days.map((day) => [day.dateKey, day]));
  const byMode: Record<StudyTimeMode, number> = {
    learn: 0,
    review: 0,
    mock: 0,
  };
  let longestSessionSeconds = 0;

  results.forEach((result) => {
    if (result.completedAt > now) return;
    const day = dayIndex.get(toLocalDateKey(result.completedAt));
    if (day == null) return;
    day.durationSeconds += result.durationSeconds;
    day.sessionCount += 1;
    byMode[getStudyTimeMode(result.mode)] += result.durationSeconds;
    longestSessionSeconds = Math.max(
      longestSessionSeconds,
      result.durationSeconds,
    );
  });

  const totalSeconds = days.reduce(
    (total, day) => total + day.durationSeconds,
    0,
  );
  const sessionCount = days.reduce(
    (total, day) => total + day.sessionCount,
    0,
  );
  const activeDays = days.filter((day) => day.sessionCount > 0).length;
  const bestDay =
    [...days].sort(
      (left, right) => right.durationSeconds - left.durationSeconds,
    )[0] ?? null;

  return {
    days,
    totalSeconds,
    sessionCount,
    averageSessionSeconds:
      sessionCount === 0 ? 0 : Math.round(totalSeconds / sessionCount),
    longestSessionSeconds,
    activeDays,
    bestDay: bestDay?.durationSeconds === 0 ? null : bestDay,
    byMode,
  };
}
