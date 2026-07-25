import { useEffect, useMemo, useState } from "react";

import {
  AchievementMetrics,
  createAchievements,
  findReachedAchievementIds,
} from "@/learning/achievements";
import type { AchievementId } from "@/learning/achievements";
import {
  loadUnlockedAchievements,
  unlockAchievements,
} from "@/storage/achievement-store";

// 누적 업적 해제·진행 상태 관리
export function useAchievements(metrics: AchievementMetrics) {
  const [unlockedIds, setUnlockedIds] = useState<AchievementId[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { answered, correct, streak, bookmarked, enrolled, studied } = metrics;

  // 현재 학습 지표의 신규 업적 누적
  useEffect(() => {
    let active = true;

    // 저장 업적과 현재 달성 업적 병합
    const hydrateAchievements = async () => {
      const storedIds = await loadUnlockedAchievements();
      const reachedIds = findReachedAchievementIds({
        answered,
        correct,
        streak,
        bookmarked,
        enrolled,
        studied,
      });
      const nextIds =
        reachedIds.some((achievementId) => !storedIds.includes(achievementId))
          ? await unlockAchievements(reachedIds)
          : storedIds;
      if (!active) return;
      setUnlockedIds(nextIds);
      setIsLoading(false);
    };

    void hydrateAchievements();
    return () => {
      active = false;
    };
  }, [answered, bookmarked, correct, enrolled, streak, studied]);

  const achievements = useMemo(
    () => createAchievements(metrics, unlockedIds),
    [metrics, unlockedIds],
  );
  const unlockedCount = achievements.filter(
    (achievement) => achievement.unlocked,
  ).length;

  return { achievements, unlockedCount, isLoading };
}
