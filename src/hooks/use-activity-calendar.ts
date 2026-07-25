import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import {
  createActivityMonth,
  shiftMonthKey,
  toMonthKey,
} from "@/learning/activity-calendar";
import { loadDailyStats, toDateKey } from "@/storage/stats-store";
import type { DailyStatMap } from "@/storage/stats-store";

// 월간 학습 활동 탐색 상태 관리
export function useActivityCalendar() {
  const [stats, setStats] = useState<DailyStatMap>({});
  const [monthKey, setMonthKey] = useState("");
  const [currentMonthKey, setCurrentMonthKey] = useState("");
  const [todayKey, setTodayKey] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // 학습 활동·현재 월 갱신
  const reload = useCallback(async () => {
    const now = Date.now();
    const nextCurrentMonthKey = toMonthKey(now);
    setStats(await loadDailyStats());
    setCurrentMonthKey(nextCurrentMonthKey);
    setTodayKey(toDateKey(now));
    setMonthKey((current) => current || nextCurrentMonthKey);
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  // 이전 달 이동
  const goPreviousMonth = useCallback(() => {
    setMonthKey((current) => shiftMonthKey(current, -1));
  }, []);

  // 다음 달 이동
  const goNextMonth = useCallback(() => {
    setMonthKey((current) =>
      current < currentMonthKey ? shiftMonthKey(current, 1) : current,
    );
  }, [currentMonthKey]);

  const activityMonth = useMemo(
    () =>
      monthKey === "" || todayKey === ""
        ? null
        : createActivityMonth(stats, monthKey, todayKey),
    [monthKey, stats, todayKey],
  );

  return {
    activityMonth,
    isLoading,
    canGoNext: monthKey < currentMonthKey,
    goPreviousMonth,
    goNextMonth,
  };
}
