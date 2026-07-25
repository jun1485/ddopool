export type WeeklyGoalStatus = "complete" | "onTrack" | "catchUp";

// 주간 학습 목표 진행 상태
export interface WeeklyGoalProgress {
  goal: number;
  answered: number;
  progress: number;
  remaining: number;
  todayTarget: number;
  remainingToday: number;
  status: WeeklyGoalStatus;
}

interface WeeklyGoalInput {
  goal: number;
  answered: number;
  todayAnswered: number;
  elapsedDays: number;
}

// 현재 주간 잔여량 기반 오늘 권장량 산출
export function calculateWeeklyGoalProgress({
  goal,
  answered,
  todayAnswered,
  elapsedDays,
}: WeeklyGoalInput): WeeklyGoalProgress {
  const safeGoal = Math.max(goal, 1);
  const safeAnswered = Math.max(answered, 0);
  const safeElapsedDays = Math.min(Math.max(elapsedDays, 1), 7);
  const remainingDays = 8 - safeElapsedDays;
  const answeredBeforeToday = Math.max(safeAnswered - todayAnswered, 0);
  const remaining = Math.max(safeGoal - safeAnswered, 0);
  const todayTarget = Math.min(
    Math.ceil(
      Math.max(safeGoal - answeredBeforeToday, 0) / remainingDays,
    ),
    safeGoal,
  );
  const remainingToday = Math.min(
    Math.max(todayTarget - todayAnswered, 0),
    remaining,
  );

  return {
    goal: safeGoal,
    answered: safeAnswered,
    progress: Math.min(safeAnswered / safeGoal, 1),
    remaining,
    todayTarget,
    remainingToday,
    status:
      remaining === 0
        ? "complete"
        : remainingToday === 0
          ? "onTrack"
          : "catchUp",
  };
}
