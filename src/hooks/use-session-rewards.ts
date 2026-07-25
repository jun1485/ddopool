import { useEffect, useState } from "react";

import {
  createAchievements,
  findReachedAchievementIds,
} from "@/learning/achievements";
import type { Achievement } from "@/learning/achievements";
import {
  calculateLearningProgression,
  calculateSessionXp,
} from "@/learning/progression";
import type { LearningProgression } from "@/learning/progression";
import {
  loadUnlockedAchievements,
  unlockAchievements,
} from "@/storage/achievement-store";
import { loadBookmarks } from "@/storage/bookmark-store";
import { loadSrsCards } from "@/storage/srs-store";
import {
  computeStreak,
  loadDailyStats,
  toDateKey,
  waitForStatsWrites,
} from "@/storage/stats-store";

// 퀴즈 종료 보상 요약
export interface SessionRewards {
  earnedXp: number;
  progression: LearningProgression;
  previousLevel: number;
  levelUp: boolean;
  dailyGoalReached: boolean;
  dailyGoalProgress: number;
  newAchievements: Achievement[];
}

interface UseSessionRewardsInput {
  finished: boolean;
  correctCount: number;
  answeredCount: number;
  dailyGoal: number;
  enrolledExamCount: number;
}

// 퀴즈 종료 보상 판정 상태 관리
export function useSessionRewards({
  finished,
  correctCount,
  answeredCount,
  dailyGoal,
  enrolledExamCount,
}: UseSessionRewardsInput) {
  const [rewards, setRewards] = useState<SessionRewards | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 저장 완료 후 누적 보상 판정
  useEffect(() => {
    if (!finished) return;
    let active = true;

    // 학습 통계·업적 보상 병합
    const resolveRewards = async () => {
      setIsLoading(true);
      await waitForStatsWrites();
      const evaluatedAt = Date.now();
      const [dailyStats, bookmarks, cards, storedAchievementIds] =
        await Promise.all([
          loadDailyStats(),
          loadBookmarks(),
          loadSrsCards(),
          loadUnlockedAchievements(),
        ]);
      const lifetime = Object.values(dailyStats).reduce(
        (total, stat) => ({
          answered: total.answered + stat.answered,
          correct: total.correct + stat.correct,
        }),
        { answered: 0, correct: 0 },
      );
      const previousLifetime = {
        answered: Math.max(lifetime.answered - answeredCount, 0),
        correct: Math.max(lifetime.correct - correctCount, 0),
      };
      const metrics = {
        answered: lifetime.answered,
        correct: lifetime.correct,
        streak: computeStreak(dailyStats, evaluatedAt),
        bookmarked: bookmarks.length,
        enrolled: enrolledExamCount,
        studied: Object.keys(cards).length,
      };
      const reachedIds = findReachedAchievementIds(metrics);
      const newAchievementIds = reachedIds.filter(
        (achievementId) => !storedAchievementIds.includes(achievementId),
      );
      const unlockedIds =
        newAchievementIds.length > 0
          ? await unlockAchievements(newAchievementIds)
          : storedAchievementIds;
      const progression = calculateLearningProgression(lifetime);
      const previousProgression =
        calculateLearningProgression(previousLifetime);
      const todayStat = dailyStats[toDateKey(evaluatedAt)] ?? {
        answered: 0,
        correct: 0,
      };
      const previousTodayAnswered = Math.max(
        todayStat.answered - answeredCount,
        0,
      );
      const newAchievementIdSet = new Set(newAchievementIds);
      const newAchievements = createAchievements(
        metrics,
        unlockedIds,
      ).filter((achievement) => newAchievementIdSet.has(achievement.id));
      if (!active) return;
      setRewards({
        earnedXp: calculateSessionXp(correctCount, answeredCount),
        progression,
        previousLevel: previousProgression.level,
        levelUp: progression.level > previousProgression.level,
        dailyGoalReached:
          previousTodayAnswered < dailyGoal &&
          todayStat.answered >= dailyGoal,
        dailyGoalProgress: Math.min(todayStat.answered / dailyGoal, 1),
        newAchievements,
      });
      setIsLoading(false);
    };

    void resolveRewards();
    return () => {
      active = false;
    };
  }, [
    answeredCount,
    correctCount,
    dailyGoal,
    enrolledExamCount,
    finished,
  ]);

  return { rewards, isLoading };
}
