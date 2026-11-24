export interface ReviewPromptState {
  finishedSessions: number;
  lastPromptAt: number | null;
}

export const INITIAL_REVIEW_PROMPT_STATE: ReviewPromptState = {
  finishedSessions: 0,
  lastPromptAt: null,
};

const MIN_FINISHED_SESSIONS = 3;
const MIN_SESSION_QUESTIONS = 5;
const MIN_ACCURACY = 70;
const PROMPT_INTERVAL_MS = 60 * 24 * 60 * 60 * 1000;

// 학습 완료 횟수 누적, 문항이 너무 적은 세션은 제외
export function countFinishedSession(
  state: ReviewPromptState,
  totalCount: number,
): ReviewPromptState {
  return totalCount >= MIN_SESSION_QUESTIONS
    ? { ...state, finishedSessions: state.finishedSessions + 1 }
    : state;
}

// 스토어 리뷰 요청 시점 판정
export function shouldRequestReview(
  state: ReviewPromptState,
  accuracy: number,
  now: number,
): boolean {
  return (
    state.finishedSessions >= MIN_FINISHED_SESSIONS &&
    accuracy >= MIN_ACCURACY &&
    (state.lastPromptAt == null ||
      now - state.lastPromptAt >= PROMPT_INTERVAL_MS)
  );
}
