import type { AccuracyStat, DailyStat } from "@/storage/stats-store";

// 일일 학습 퀘스트
export interface DailyQuest {
  id: "warmup" | "correct" | "goal";
  label: string;
  description: string;
  icon: string;
  progress: number;
  target: number;
  completed: boolean;
}

// 학습 XP·레벨 상태
export interface LearningProgression {
  totalXp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  levelProgress: number;
}

// 레벨 구간 표시 상태
export interface LevelMilestone {
  level: number;
  requiredXp: number;
  unlocked: boolean;
  current: boolean;
}

// 풀이 결과 XP 계산
export function calculateSessionXp(
  correctCount: number,
  answeredCount: number,
): number {
  return correctCount * 10 + Math.max(answeredCount - correctCount, 0) * 4;
}

// 누적 풀이 기록 XP·레벨 변환
export function calculateLearningProgression(
  lifetime: AccuracyStat,
): LearningProgression {
  const totalXp = calculateSessionXp(lifetime.correct, lifetime.answered);
  const level = Math.floor(Math.sqrt(totalXp / 100)) + 1;
  const currentLevelXp = (level - 1) ** 2 * 100;
  const nextLevelXp = level ** 2 * 100;
  return {
    totalXp,
    level,
    currentLevelXp,
    nextLevelXp,
    levelProgress: (totalXp - currentLevelXp) / (nextLevelXp - currentLevelXp),
  };
}

// 현재 레벨 주변 구간 구성
export function createLevelMilestones(
  progression: LearningProgression,
): LevelMilestone[] {
  const firstLevel = Math.max(progression.level - 2, 1);
  return Array.from({ length: 6 }, (_, index) => {
    const level = firstLevel + index;
    return {
      level,
      requiredXp: (level - 1) ** 2 * 100,
      unlocked: progression.totalXp >= (level - 1) ** 2 * 100,
      current: level === progression.level,
    };
  });
}

// 오늘 풀이 기록 기반 일일 퀘스트 구성
export function createDailyQuests(
  today: DailyStat,
  dailyGoal: number,
): DailyQuest[] {
  const warmupTarget = Math.min(dailyGoal, 5);
  const correctTarget = Math.min(dailyGoal, 3);
  return [
    {
      id: "warmup",
      label: "워밍업",
      description: `${warmupTarget}문제 풀기`,
      icon: "⚡",
      progress: Math.min(today.answered, warmupTarget),
      target: warmupTarget,
      completed: today.answered >= warmupTarget,
    },
    {
      id: "correct",
      label: "정답 감각",
      description: `${correctTarget}문제 맞히기`,
      icon: "🎯",
      progress: Math.min(today.correct, correctTarget),
      target: correctTarget,
      completed: today.correct >= correctTarget,
    },
    {
      id: "goal",
      label: "오늘의 완주",
      description: `${dailyGoal}문제 목표 달성`,
      icon: "🏁",
      progress: Math.min(today.answered, dailyGoal),
      target: dailyGoal,
      completed: today.answered >= dailyGoal,
    },
  ];
}
