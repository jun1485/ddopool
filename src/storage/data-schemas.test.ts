import { expect, jest, test } from "@jest/globals";
import {
  activeSessionSchema,
  backupSchema,
  pendingAttemptsSchema,
  settingsSchema,
} from "./data-schemas";
import { DEFAULT_SETTINGS } from "./settings-store";
jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

test("손상된 설정과 미지원 백업 버전을 거부한다", () => {
  expect(
    settingsSchema.safeParse({ ...DEFAULT_SETTINGS, dailyGoal: -10 }).success,
  ).toBe(false);
  expect(backupSchema.safeParse({ schemaVersion: 2 }).success).toBe(false);
});

test("모의고사 종료 시각과 답안 범위를 검증한다", () => {
  const session = {
    examId: "test",
    mode: "mock",
    questions: [
      {
        id: "q",
        examId: "test",
        subject: "과목",
        prompt: "문제",
        choices: ["가", "나"],
        answerIndex: 0,
        explanation: "해설",
      },
    ],
    currentIndex: 0,
    selectedIndex: null,
    isSubmitted: false,
    correctCount: 0,
    answers: [],
    updatedAt: Date.now(),
  };
  expect(activeSessionSchema.safeParse(session).success).toBe(false);
  expect(
    activeSessionSchema.safeParse({
      ...session,
      mockDeadline: Date.now() + 1000,
    }).success,
  ).toBe(true);
  expect(
    activeSessionSchema.safeParse({
      ...session,
      mode: "learn",
      currentIndex: 2,
    }).success,
  ).toBe(false);
});

test("풀이 이력에 비정상 식별자·시각·답안이 있으면 거부한다", () => {
  expect(
    pendingAttemptsSchema.safeParse([
      { questionId: 123, answeredAt: "yesterday" },
    ]).success,
  ).toBe(false);
});
