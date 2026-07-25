import type { DailyStatMap } from "@/storage/stats-store";

// 월간 캘린더 날짜 활동
export interface CalendarActivityDay {
  dateKey: string;
  day: number;
  answered: number;
  correct: number;
  inMonth: boolean;
  isToday: boolean;
}

// 월간 학습 활동 요약
export interface ActivityMonth {
  monthKey: string;
  label: string;
  days: CalendarActivityDay[];
  totalAnswered: number;
  totalCorrect: number;
  activeDays: number;
  bestAnswered: number;
}

// 월 키 생성
export function toMonthKey(time: number): string {
  const date = new Date(time);
  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, "0")}`;
}

// 월 키 기준 이전·다음 월 이동
export function shiftMonthKey(monthKey: string, offset: number): string {
  const [year, month] = monthKey.split("-").map(Number);
  return toMonthKey(new Date(year, month - 1 + offset, 1).getTime());
}

// 월간 활동 캘린더 구성
export function createActivityMonth(
  stats: DailyStatMap,
  monthKey: string,
  todayKey: string,
): ActivityMonth {
  const [year, month] = monthKey.split("-").map(Number);
  const monthIndex = month - 1;
  const firstDay = new Date(year, monthIndex, 1);
  const gridStart = new Date(year, monthIndex, 1 - firstDay.getDay());
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + index,
    );
    const dateKey = `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(
      2,
      "0",
    )}-${`${date.getDate()}`.padStart(2, "0")}`;
    const stat = stats[dateKey] ?? { answered: 0, correct: 0 };
    return {
      dateKey,
      day: date.getDate(),
      answered: stat.answered,
      correct: stat.correct,
      inMonth: date.getMonth() === monthIndex,
      isToday: dateKey === todayKey,
    };
  });
  const monthDays = days.filter((day) => day.inMonth);
  const totalAnswered = monthDays.reduce(
    (total, day) => total + day.answered,
    0,
  );
  const totalCorrect = monthDays.reduce(
    (total, day) => total + day.correct,
    0,
  );

  return {
    monthKey,
    label: `${year}년 ${month}월`,
    days,
    totalAnswered,
    totalCorrect,
    activeDays: monthDays.filter((day) => day.answered > 0).length,
    bestAnswered: Math.max(...monthDays.map((day) => day.answered), 0),
  };
}
