import { expect, test } from "@jest/globals";

import { learningSyncRetryDelay } from "./learning-sync-retry";

test("연속 실패마다 재시도 간격이 두 배로 늘고 5분에서 멈춘다", () => {
  const delays = [1, 2, 3, 4, 10, 20].map((failures) =>
    learningSyncRetryDelay(failures, () => 0.5),
  );

  expect(delays).toEqual([5_000, 10_000, 20_000, 40_000, 300_000, 300_000]);
});

test("재시도 간격은 기준값의 ±20% 안에서 분산된다", () => {
  expect(learningSyncRetryDelay(1, () => 0)).toBe(4_000);
  expect(learningSyncRetryDelay(1, () => 1)).toBe(6_000);
});
