import { describe, expect, test } from "@jest/globals";

import { getConfidenceReviewQuality } from "@/learning/answer-confidence";
import {
  calculateLearningProgression,
  calculateSessionXp,
} from "@/learning/progression";
import { calculateWeeklyGoalProgress } from "@/learning/weekly-goal";

describe("학습 계산 모듈", () => {
  // 주간 목표 잔여 학습량 배분 검증
  test("주간 잔여 문제를 남은 학습일에 맞춰 오늘 목표로 배분한다", () => {
    const progress = calculateWeeklyGoalProgress({
      goal: 70,
      answered: 10,
      todayAnswered: 2,
      elapsedDays: 2,
    });

    expect(progress.remaining).toBe(60);
    expect(progress.todayTarget).toBe(11);
    expect(progress.remainingToday).toBe(9);
    expect(progress.status).toBe("catchUp");
  });

  // 목표 달성 상태 상한 처리 검증
  test("주간 목표 초과 학습은 완료 상태와 100퍼센트 진행률로 제한한다", () => {
    const progress = calculateWeeklyGoalProgress({
      goal: 20,
      answered: 25,
      todayAnswered: 5,
      elapsedDays: 7,
    });

    expect(progress.progress).toBe(1);
    expect(progress.remaining).toBe(0);
    expect(progress.status).toBe("complete");
  });

  // 정오답 XP와 레벨 경계 계산 검증
  test("정답과 오답 XP를 합산해 레벨 경계를 계산한다", () => {
    expect(calculateSessionXp(8, 10)).toBe(88);

    const progression = calculateLearningProgression({
      correct: 10,
      answered: 10,
    });
    expect(progression).toEqual({
      totalXp: 100,
      level: 2,
      currentLevelXp: 100,
      nextLevelXp: 400,
      levelProgress: 0,
    });
  });

  // 정오답 확신도 SRS 품질 변환 검증
  test("정오답과 확신도를 SRS 품질 점수로 변환한다", () => {
    expect(getConfidenceReviewQuality(true, "confident")).toBe(5);
    expect(getConfidenceReviewQuality(true, "forgot")).toBe(2);
    expect(getConfidenceReviewQuality(false, "confident")).toBe(2);
    expect(getConfidenceReviewQuality(false, "forgot")).toBe(0);
  });
});
