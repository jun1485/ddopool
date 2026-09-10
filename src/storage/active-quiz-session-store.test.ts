import { describe, expect, jest, test } from "@jest/globals";

import {
  type ActiveQuizSession,
  isActiveQuizSessionValid,
  shouldResumeActiveQuizSession,
} from "@/storage/active-quiz-session-store";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

const QUESTION = {
  id: "q",
  examId: "test",
  subject: "과목",
  prompt: "문제",
  choices: ["1", "2"],
  answerIndex: 0,
  explanation: "해설",
};

// 이어 풀기 세션 기본값 생성
function createSession(startedAt: number): ActiveQuizSession {
  return {
    examId: "test",
    mode: "learn",
    questions: [QUESTION],
    currentIndex: 0,
    selectedIndex: null,
    isSubmitted: false,
    correctCount: 0,
    answers: [],
    startedAt,
    updatedAt: startedAt,
  };
}

describe("이어 풀기 세션 유효기간", () => {
  // 당일 세션 유지 검증
  test("같은 날에는 세션을 유지한다", () => {
    const startedAt = new Date(2026, 8, 10, 9).getTime();
    expect(
      isActiveQuizSessionValid(
        createSession(startedAt),
        new Date(2026, 8, 10, 23, 59).getTime(),
      ),
    ).toBe(true);
  });

  // 날짜 변경 세션 만료 검증
  test("다음 날에는 이전 세션을 만료한다", () => {
    const startedAt = new Date(2026, 8, 10, 23, 59).getTime();
    expect(
      isActiveQuizSessionValid(
        createSession(startedAt),
        new Date(2026, 8, 11).getTime(),
      ),
    ).toBe(false);
  });
});

describe("이어 풀기 세션 재진입", () => {
  // 일반 문제풀기 자동 복원 검증
  test("같은 시험 문제풀기에 다시 들어가면 세션을 복원한다", () => {
    const session = createSession(new Date(2026, 8, 10, 9).getTime());
    expect(
      shouldResumeActiveQuizSession(session, "test", "learn", [], false),
    ).toBe(true);
  });

  // 다른 시험 세션 분리 검증
  test("다른 시험에 들어가면 저장 세션을 복원하지 않는다", () => {
    const session = createSession(new Date(2026, 8, 10, 9).getTime());
    expect(
      shouldResumeActiveQuizSession(session, "other", "learn", [], false),
    ).toBe(false);
  });

  // 다른 맞춤 문제 구성 분리 검증
  test("문제 구성이 다른 맞춤 학습은 새 세션으로 시작한다", () => {
    const session = createSession(new Date(2026, 8, 10, 9).getTime());
    expect(
      shouldResumeActiveQuizSession(session, "test", "learn", ["other"], false),
    ).toBe(false);
  });
});
