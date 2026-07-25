// 업적 산정용 학습 지표
export interface AchievementMetrics {
  answered: number;
  correct: number;
  streak: number;
  bookmarked: number;
  enrolled: number;
  studied: number;
}

export type AchievementId =
  | "first-answer"
  | "answer-25"
  | "answer-100"
  | "correct-50"
  | "streak-3"
  | "streak-7"
  | "bookmark-10"
  | "enroll-3"
  | "study-30";

type AchievementMetric = keyof AchievementMetrics;

interface AchievementDefinition {
  id: AchievementId;
  title: string;
  description: string;
  icon: string;
  metric: AchievementMetric;
  target: number;
}

// 사용자 표시용 업적 진행 상태
export interface Achievement extends AchievementDefinition {
  progress: number;
  unlocked: boolean;
}

const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: "first-answer",
    title: "첫 발자국",
    description: "첫 문제를 풀어 학습 루프 시작",
    icon: "👣",
    metric: "answered",
    target: 1,
  },
  {
    id: "answer-25",
    title: "루프 러너",
    description: "누적 25문제 풀이",
    icon: "🏃",
    metric: "answered",
    target: 25,
  },
  {
    id: "answer-100",
    title: "문제 해결사",
    description: "누적 100문제 풀이",
    icon: "🧠",
    metric: "answered",
    target: 100,
  },
  {
    id: "correct-50",
    title: "정답 수집가",
    description: "누적 50문제 정답",
    icon: "🎯",
    metric: "correct",
    target: 50,
  },
  {
    id: "streak-3",
    title: "학습의 불씨",
    description: "3일 연속 학습",
    icon: "🔥",
    metric: "streak",
    target: 3,
  },
  {
    id: "streak-7",
    title: "일주일 루프",
    description: "7일 연속 학습",
    icon: "⚡",
    metric: "streak",
    target: 7,
  },
  {
    id: "bookmark-10",
    title: "복습 설계자",
    description: "문제 10개 저장",
    icon: "🔖",
    metric: "bookmarked",
    target: 10,
  },
  {
    id: "enroll-3",
    title: "멀티 챌린저",
    description: "시험 3개를 내 시험에 추가",
    icon: "🧭",
    metric: "enrolled",
    target: 3,
  },
  {
    id: "study-30",
    title: "기억 건축가",
    description: "문제 30개의 복습 일정 생성",
    icon: "🏛️",
    metric: "studied",
    target: 30,
  },
];

// 현재 지표로 달성한 업적 식별자 추출
export function findReachedAchievementIds(
  metrics: AchievementMetrics,
): AchievementId[] {
  return ACHIEVEMENT_DEFINITIONS.filter(
    (achievement) => metrics[achievement.metric] >= achievement.target,
  ).map((achievement) => achievement.id);
}

// 누적 해제 상태를 포함한 업적 목록 구성
export function createAchievements(
  metrics: AchievementMetrics,
  unlockedIds: AchievementId[],
): Achievement[] {
  const unlocked = new Set(unlockedIds);
  return ACHIEVEMENT_DEFINITIONS.map((achievement) => {
    const isUnlocked = unlocked.has(achievement.id);
    return {
      ...achievement,
      progress: isUnlocked
        ? achievement.target
        : Math.min(metrics[achievement.metric], achievement.target),
      unlocked: isUnlocked,
    };
  });
}
