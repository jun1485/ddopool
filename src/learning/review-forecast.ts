import type { SrsCardMap } from "@/storage/srs-store";

const DEFAULT_FORECAST_DAYS = 7;
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"] as const;

// 날짜별 복습 예정 정보
export interface ReviewForecastDay {
  dateKey: string;
  dayLabel: string;
  dateLabel: string;
  count: number;
  questionIds: string[];
  examCounts: Record<string, number>;
  isToday: boolean;
}

// 복습 예정 기간 요약
export interface ReviewForecast {
  days: ReviewForecastDay[];
  totalCount: number;
  overdueCount: number;
  peakDay: ReviewForecastDay;
}

// 로컬 날짜 시작 시각 생성
function startOfLocalDay(timestamp: number, offsetDays = 0): number {
  const date = new Date(timestamp);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + offsetDays,
  ).getTime();
}

// 로컬 날짜 키 생성
function toLocalDateKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// 날짜별 복습 예정 기본값 생성
function createForecastDay(
  timestamp: number,
  dayIndex: number,
): ReviewForecastDay {
  const date = new Date(timestamp);
  return {
    dateKey: toLocalDateKey(timestamp),
    dayLabel:
      dayIndex === 0
        ? "오늘"
        : dayIndex === 1
          ? "내일"
          : WEEKDAY_LABELS[date.getDay()],
    dateLabel: `${date.getMonth() + 1}/${date.getDate()}`,
    count: 0,
    questionIds: [],
    examCounts: {},
    isToday: dayIndex === 0,
  };
}

// 복습 예정 시각의 기간 내 날짜 위치 조회
function findForecastDayIndex(
  dueAt: number,
  dayStarts: number[],
): number {
  if (dueAt < dayStarts[1]) return 0;
  return dayStarts.findIndex(
    (dayStart, index) =>
      index > 0 &&
      index < dayStarts.length - 1 &&
      dueAt >= dayStart &&
      dueAt < dayStarts[index + 1],
  );
}

// SRS 카드 기반 복습 예보 생성
export function createReviewForecast(
  cards: SrsCardMap,
  now: number,
  dayCount = DEFAULT_FORECAST_DAYS,
): ReviewForecast {
  const normalizedDayCount = Math.max(Math.floor(dayCount), 1);
  const dayStarts = Array.from(
    { length: normalizedDayCount + 1 },
    (_, index) => startOfLocalDay(now, index),
  );
  const days = dayStarts
    .slice(0, -1)
    .map((dayStart, index) => createForecastDay(dayStart, index));
  let overdueCount = 0;

  Object.values(cards)
    .filter((card) => Number.isFinite(card.dueAt))
    .sort((left, right) => left.dueAt - right.dueAt)
    // 복습 예정 문항 날짜·시험별 누적
    .forEach((card) => {
      const dayIndex = findForecastDayIndex(card.dueAt, dayStarts);
      if (dayIndex < 0) return;
      if (card.dueAt < now) overdueCount += 1;
      const day = days[dayIndex];
      day.count += 1;
      day.questionIds.push(card.questionId);
      day.examCounts[card.examId] = (day.examCounts[card.examId] ?? 0) + 1;
    });

  const peakDay = days.reduce((peak, day) =>
    day.count > peak.count ? day : peak,
  );

  return {
    days,
    totalCount: days.reduce((total, day) => total + day.count, 0),
    overdueCount,
    peakDay,
  };
}
