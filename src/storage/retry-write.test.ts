import { expect, jest, test } from "@jest/globals";
import {
  hasStorageFailure,
  retryableWrite,
  retryStorageWrite,
} from "./retry-write";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { recordAnswer, loadDailyStats, toDateKey } from "./stats-store";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

jest.mock("@/lib/monitoring", () => ({ captureHandledError: jest.fn() }));

test("저장 실패 시 다음 쓰기를 보류하고 같은 값을 재시도한다", async () => {
  const order: string[] = [];
  let fail = true;
  const first = retryableWrite(async () => {
    if (fail) throw new Error("저장 공간 부족");
    order.push("첫 값");
  });
  const second = retryableWrite(async () => {
    order.push("다음 값");
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(hasStorageFailure()).toBe(true);
  expect(order).toEqual([]);
  fail = false;
  retryStorageWrite();
  await Promise.all([first, second]);
  expect(order).toEqual(["첫 값", "다음 값"]);
  expect(hasStorageFailure()).toBe(false);
});

test("채점 저장 재시도와 같은 답안 재전송은 한 번만 집계한다", async () => {
  await AsyncStorage.clear();
  const now = Date.now();
  jest
    .mocked(AsyncStorage.multiSet)
    .mockRejectedValueOnce(new Error("저장 공간 부족"));
  const saved = recordAnswer(true, "computer-1", "시험", now, "question-1");
  await new Promise((resolve) => setTimeout(resolve, 0));
  expect(hasStorageFailure()).toBe(true);
  retryStorageWrite();
  await saved;
  await recordAnswer(true, "computer-1", "시험", now, "question-1");
  expect((await loadDailyStats())[toDateKey(now)]).toEqual({
    answered: 1,
    correct: 1,
  });
});
