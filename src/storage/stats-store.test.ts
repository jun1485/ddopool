import { beforeEach, expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { QuestionAttemptRow } from "../../packages/contracts/src";

import { ACCOUNT_DATA_KEYS } from "./account-vault";
import { deleteOwnerRows } from "./learning-rows";
import { commitAnswerStats, readStatsSnapshot } from "./stats-persistence";
import {
  clearDailyStats,
  loadDailyStats,
  loadLastMergedAttemptId,
  loadPerformanceStats,
  mergeRemoteAttempts,
  recordAnswer,
  toDateKey,
} from "./stats-store";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

jest.mock("@/lib/monitoring", () => ({ captureHandledError: jest.fn() }));
jest.mock("@/storage/settle-learning-writes", () => ({
  settleLearningWrites: jest.fn(),
}));

// 서버 풀이 이력 행 생성
function attempt(id: number, answeredAt: string): QuestionAttemptRow {
  return {
    id,
    user_id: "user",
    question_id: `q-${id}`,
    exam_id: "computer-1",
    subject: "스프레드시트",
    selected_index: 0,
    is_correct: true,
    mode: "learn",
    answered_at: answeredAt,
    client_attempt_id: `client-${id}`,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await deleteOwnerRows("guest");
});

test("서버 풀이 id 워터마크는 가장 큰 id로 갱신된다", async () => {
  await mergeRemoteAttempts([
    attempt(12, "2026-09-01T01:00:00.000Z"),
    attempt(7, "2026-09-02T01:00:00.000Z"),
  ]);

  await expect(loadLastMergedAttemptId()).resolves.toBe(12);
});

test("백업 복원 이전 서버 이력은 통계에 합산하지 않는다", async () => {
  await AsyncStorage.setItem(
    "exam-loop:merge-skip-before:v1",
    "2026-09-10T00:00:00.000Z",
  );
  const before = "2026-09-05T01:00:00.000Z";
  const after = "2026-09-12T01:00:00.000Z";

  await mergeRemoteAttempts([attempt(1, before), attempt(2, after)]);

  const stats = await loadDailyStats();
  expect(stats[toDateKey(Date.parse(before))]).toBeUndefined();
  expect(stats[toDateKey(Date.parse(after))]).toEqual({
    answered: 1,
    correct: 1,
  });
  await expect(loadLastMergedAttemptId()).resolves.toBe(2);
});

test("풀이 워터마크 키는 계정별로 보관된다", () => {
  expect(ACCOUNT_DATA_KEYS).toContain("exam-loop:last-merged-attempt-id:v1");
  expect(ACCOUNT_DATA_KEYS).toContain("exam-loop:merge-skip-before:v1");
});

test("기존 키의 통계·식별자를 옮기고 같은 답안은 다시 집계하지 않는다", async () => {
  const answeredAt = Date.parse("2026-09-15T03:00:00.000Z");
  const dateKey = toDateKey(answeredAt);
  await AsyncStorage.multiSet([
    [
      "exam-loop:daily-stats",
      JSON.stringify({ [dateKey]: { answered: 3, correct: 2 } }),
    ],
    [
      "exam-loop:performance-stats",
      JSON.stringify({
        overall: { answered: 3, correct: 2 },
        byExam: {},
        bySubject: {},
      }),
    ],
    [
      "exam-loop:attempt-fingerprints:v1",
      JSON.stringify([`q-1:${answeredAt}`]),
    ],
  ]);

  await recordAnswer(true, "computer-1", "스프레드시트", answeredAt, "q-1");
  await recordAnswer(false, "computer-1", "스프레드시트", answeredAt, "q-2");

  expect((await loadDailyStats())[dateKey]).toEqual({
    answered: 4,
    correct: 2,
  });
  expect((await loadPerformanceStats()).overall).toEqual({
    answered: 4,
    correct: 2,
  });
  await expect(
    AsyncStorage.getItem("exam-loop:daily-stats"),
  ).resolves.toBeNull();
});

test("백업 복원이 쓴 빈 식별자 목록은 기존 식별자 행을 비운다", async () => {
  const answeredAt = Date.parse("2026-09-15T03:00:00.000Z");
  await recordAnswer(true, "computer-1", "스프레드시트", answeredAt, "q-1");

  await AsyncStorage.setItem("exam-loop:attempt-fingerprints:v1", "[]");
  await recordAnswer(true, "computer-1", "스프레드시트", answeredAt, "q-1");

  expect((await loadDailyStats())[toDateKey(answeredAt)]).toEqual({
    answered: 2,
    correct: 2,
  });
});

test("풀이 식별자는 한도를 넘으면 오래된 것부터 정리된다", async () => {
  const identity = (snapshot: Awaited<ReturnType<typeof readStatsSnapshot>>) =>
    snapshot;
  for (const fingerprint of ["a", "b", "c"])
    await commitAnswerStats(fingerprint, identity, 2);

  await expect(commitAnswerStats("a", identity, 2)).resolves.toBe(true);
  await expect(commitAnswerStats("c", identity, 2)).resolves.toBe(false);
});

test("통계 전체 삭제는 집계와 식별자, 워터마크를 비운다", async () => {
  const answeredAt = Date.parse("2026-09-15T03:00:00.000Z");
  await recordAnswer(true, "computer-1", "스프레드시트", answeredAt, "q-1");
  await mergeRemoteAttempts([attempt(5, "2026-09-16T01:00:00.000Z")]);

  await clearDailyStats();

  await expect(loadDailyStats()).resolves.toEqual({});
  await expect(loadLastMergedAttemptId()).resolves.toBeUndefined();
  await recordAnswer(true, "computer-1", "스프레드시트", answeredAt, "q-1");
  expect((await loadDailyStats())[toDateKey(answeredAt)]).toEqual({
    answered: 1,
    correct: 1,
  });
});
