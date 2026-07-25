import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import {
  computeStreak,
  DailyStat,
  loadDailyStats,
  toDateKey,
} from "@/storage/stats-store";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// 일별 학습 활동
export interface DailyActivity {
  dateKey: string;
  dayLabel: string;
  answered: number;
  correct: number;
  isToday: boolean;
  isFuture: boolean;
}

// 최근 7일 학습 활동 구성
function createWeeklyActivity(
  stats: Record<string, DailyStat>,
  now: number,
): DailyActivity[] {
  const todayKey = toDateKey(now);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now - (6 - index) * DAY_MS);
    const dateKey = toDateKey(date.getTime());
    const stat = stats[dateKey] ?? { answered: 0, correct: 0 };
    return {
      dateKey,
      dayLabel: WEEKDAY_LABELS[date.getDay()],
      answered: stat.answered,
      correct: stat.correct,
      isToday: dateKey === todayKey,
      isFuture: false,
    };
  });
}

// 월요일 기준 현재 주간 활동 구성
function createCurrentWeekActivity(
  stats: Record<string, DailyStat>,
  now: number,
): DailyActivity[] {
  const today = new Date(now);
  const todayKey = toDateKey(now);
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = new Date(today);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(today.getDate() - mondayOffset);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);
    const dateKey = toDateKey(date.getTime());
    const stat = stats[dateKey] ?? { answered: 0, correct: 0 };
    return {
      dateKey,
      dayLabel: WEEKDAY_LABELS[date.getDay()],
      answered: stat.answered,
      correct: stat.correct,
      isToday: dateKey === todayKey,
      isFuture: date.getTime() > now,
    };
  });
}

// 오늘 학습량·스트릭 집계 훅
export function useDailyStats() {
  const [todayStat, setTodayStat] = useState<DailyStat>({
    answered: 0,
    correct: 0,
  });
  const [weeklyActivity, setWeeklyActivity] = useState<DailyActivity[]>([]);
  const [currentWeekActivity, setCurrentWeekActivity] = useState<
    DailyActivity[]
  >([]);
  const [streak, setStreak] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 일일 집계·스트릭 재계산
  const reload = useCallback(async () => {
    const stats = await loadDailyStats();
    const now = Date.now();
    setTodayStat(stats[toDateKey(now)] ?? { answered: 0, correct: 0 });
    setWeeklyActivity(createWeeklyActivity(stats, now));
    setCurrentWeekActivity(createCurrentWeekActivity(stats, now));
    setStreak(computeStreak(stats, now));
    setIsLoading(false);
  }, []);

  // 화면 포커스 시 집계 갱신
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  return {
    todayStat,
    weeklyActivity,
    currentWeekActivity,
    streak,
    isLoading,
  };
}
