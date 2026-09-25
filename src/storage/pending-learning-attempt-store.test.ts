import { beforeEach, expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { deleteOwnerRows } from "./learning-rows";
import {
  addPendingLearningAttempt,
  clearPendingLearningAttempts,
  loadPendingLearningAttempts,
  type PendingLearningAttempt,
  removePendingLearningAttempts,
} from "./pending-learning-attempt-store";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

jest.mock("@/lib/monitoring", () => ({ captureHandledError: jest.fn() }));

const LEGACY_KEY = "exam-loop:pending-learning-attempts:v1";

// 대기 풀이 기록 생성
function attempt(clientAttemptId: string): PendingLearningAttempt {
  return {
    questionId: `q-${clientAttemptId}`,
    examId: "computer-1",
    subject: "스프레드시트",
    selectedIndex: 1,
    isCorrect: false,
    mode: "learn",
    answeredAt: "2026-09-20T01:00:00.000Z",
    clientAttemptId,
    userId: null,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await deleteOwnerRows("guest");
});

test("추가 순서대로 조회하고 완료 기록만 제거한다", async () => {
  await addPendingLearningAttempt(attempt("a"));
  await addPendingLearningAttempt(attempt("b"));
  await addPendingLearningAttempt(attempt("c"));

  await removePendingLearningAttempts(["b"]);

  expect(
    (await loadPendingLearningAttempts()).map((item) => item.clientAttemptId),
  ).toEqual(["a", "c"]);
});

test("기존 키의 대기 기록을 순서대로 옮긴다", async () => {
  await AsyncStorage.setItem(
    LEGACY_KEY,
    JSON.stringify([attempt("x"), attempt("y")]),
  );

  expect(
    (await loadPendingLearningAttempts()).map((item) => item.clientAttemptId),
  ).toEqual(["x", "y"]);
  await expect(AsyncStorage.getItem(LEGACY_KEY)).resolves.toBeNull();
});

test("저장 한도에 도달하면 새 기록을 거부하고 기존 기록 갱신은 허용한다", async () => {
  await AsyncStorage.setItem(
    LEGACY_KEY,
    JSON.stringify(
      Array.from({ length: 1_000 }, (_, index) => attempt(`id-${index}`)),
    ),
  );

  await expect(addPendingLearningAttempt(attempt("new"))).rejects.toThrow(
    "한도",
  );
  await expect(
    addPendingLearningAttempt(attempt("id-3")),
  ).resolves.toBeUndefined();
  expect(await loadPendingLearningAttempts()).toHaveLength(1_000);
});

test("전체 삭제 후 대기 기록이 비어 있다", async () => {
  await addPendingLearningAttempt(attempt("a"));

  await clearPendingLearningAttempts();

  await expect(loadPendingLearningAttempts()).resolves.toEqual([]);
});
