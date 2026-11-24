import { describe, expect, it } from "@jest/globals";

import {
  countFinishedSession,
  INITIAL_REVIEW_PROMPT_STATE,
  shouldRequestReview,
} from "@/learning/review-prompt-policy";

const DAY = 24 * 60 * 60 * 1000;

describe("스토어 리뷰 요청 시점", () => {
  it("문항 5개 미만 세션은 완료 횟수에서 뺀다", () => {
    expect(
      countFinishedSession(INITIAL_REVIEW_PROMPT_STATE, 4).finishedSessions,
    ).toBe(0);
    expect(
      countFinishedSession(INITIAL_REVIEW_PROMPT_STATE, 5).finishedSessions,
    ).toBe(1);
  });

  it("세 번째 완료부터 정답률 70% 이상일 때만 요청한다", () => {
    const state = { finishedSessions: 3, lastPromptAt: null };
    expect(shouldRequestReview({ ...state, finishedSessions: 2 }, 90, 0)).toBe(
      false,
    );
    expect(shouldRequestReview(state, 69, 0)).toBe(false);
    expect(shouldRequestReview(state, 70, 0)).toBe(true);
  });

  it("마지막 요청 뒤 60일이 지나야 다시 요청한다", () => {
    const state = { finishedSessions: 10, lastPromptAt: 0 };
    expect(shouldRequestReview(state, 100, 59 * DAY)).toBe(false);
    expect(shouldRequestReview(state, 100, 60 * DAY)).toBe(true);
  });
});
