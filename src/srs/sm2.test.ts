import { describe, expect, test } from "@jest/globals";

import { createSrsCard, reviewSrsCard } from "@/srs/sm2";

const DAY_MS = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 0, 1);

describe("SM-2 복습 계산", () => {
  // 신규 카드 초기 복습 상태 검증
  test("신규 문제는 즉시 복습 가능한 카드로 생성한다", () => {
    const card = createSrsCard("question-1", "exam-1", NOW);

    expect(card).toEqual({
      questionId: "question-1",
      examId: "exam-1",
      repetitions: 0,
      easeFactor: 2.5,
      intervalDays: 0,
      dueAt: NOW,
      lastReviewedAt: NOW,
    });
  });

  // 연속 정답 복습 간격 확장 검증
  test("연속 정답은 1일과 3일 순서로 복습 간격을 늘린다", () => {
    const initialCard = createSrsCard("question-1", "exam-1", NOW);
    const firstReview = reviewSrsCard(initialCard, true, NOW);
    const secondReview = reviewSrsCard(firstReview, true, NOW + DAY_MS);

    expect(firstReview.intervalDays).toBe(1);
    expect(firstReview.dueAt).toBe(NOW + DAY_MS);
    expect(secondReview.repetitions).toBe(2);
    expect(secondReview.intervalDays).toBe(3);
    expect(secondReview.dueAt).toBe(NOW + DAY_MS * 4);
  });

  // 회상 실패 반복 단계 초기화 검증
  test("회상 실패는 반복 단계를 초기화하고 즉시 복습 대상으로 돌린다", () => {
    const reviewedCard = {
      ...createSrsCard("question-1", "exam-1", NOW),
      repetitions: 4,
      easeFactor: 2,
      intervalDays: 12,
    };
    const failedReview = reviewSrsCard(reviewedCard, false, NOW + DAY_MS);

    expect(failedReview.repetitions).toBe(0);
    expect(failedReview.intervalDays).toBe(0);
    expect(failedReview.dueAt).toBe(NOW + DAY_MS);
    expect(failedReview.easeFactor).toBeGreaterThanOrEqual(1.3);
  });
});
