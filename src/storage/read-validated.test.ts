import { beforeEach, expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { readValidated } from "./read-validated";
import { dailyStatsSchema, idsSchema } from "./data-schemas";
import { loadDailyStats, recordAnswer, toDateKey } from "./stats-store";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

jest.mock("@/lib/monitoring", () => ({ captureHandledError: jest.fn() }));

beforeEach(async () => {
  await AsyncStorage.clear();
});

test("손상된 항목만 제외하고 나머지 기록을 복원한다", async () => {
  await AsyncStorage.setItem(
    "stats",
    JSON.stringify({
      "2026-09-01": { answered: 5, correct: 3 },
      "2026-09-02": { answered: "잘못된 값", correct: 1 },
    }),
  );

  await expect(readValidated("stats", dailyStatsSchema, {})).resolves.toEqual({
    "2026-09-01": { answered: 5, correct: 3 },
  });
});

test("배열은 형식이 맞는 원소만 남긴다", async () => {
  await AsyncStorage.setItem("ids", JSON.stringify(["q1", 2, "q3"]));

  await expect(readValidated("ids", idsSchema, [])).resolves.toEqual([
    "q1",
    "q3",
  ]);
});

test("최초 손상 원본을 덮어쓰지 않고 보존한다", async () => {
  await AsyncStorage.setItem("ids", "{깨진 JSON");
  await readValidated("ids", idsSchema, []);
  await AsyncStorage.setItem("ids", JSON.stringify([1]));
  await readValidated("ids", idsSchema, []);

  await expect(AsyncStorage.getItem("ids:corrupt")).resolves.toBe("{깨진 JSON");
});

test("일부 손상된 일일 통계에 새 풀이를 더해도 기존 기록이 유지된다", async () => {
  await AsyncStorage.setItem(
    "exam-loop:daily-stats",
    JSON.stringify({
      "2026-09-01": { answered: 5, correct: 3 },
      broken: null,
    }),
  );
  const now = Date.now();

  await recordAnswer(true, "computer-1", "스프레드시트", now, "q-1");

  const stats = await loadDailyStats();
  expect(stats["2026-09-01"]).toEqual({ answered: 5, correct: 3 });
  expect(stats[toDateKey(now)]).toEqual({ answered: 1, correct: 1 });
});
