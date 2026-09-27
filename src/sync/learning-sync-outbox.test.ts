import { beforeEach, expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";
import type { LearningSyncApi } from "../../packages/contracts/src";
import { deleteOwnerRows } from "@/storage/learning-rows";
import { OWNER_KEY } from "@/storage/vault-owner";
import { PermanentLearningSyncError } from "./learning-sync-error";
import {
  clearLearningSyncOutbox,
  enqueueLearningSync,
  flushLearningSyncOutbox,
  isLearningSyncOutboxRecoveryPending,
  loadLearningSyncOutbox,
} from "./learning-sync-outbox";
import {
  LEARNING_SYNC_CORRUPT_OUTBOX_KEY,
  LEARNING_SYNC_OUTBOX_KEY,
} from "./learning-sync-outbox-keys";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("@/lib/monitoring", () => ({ captureHandledError: jest.fn() }));
jest.mock("expo-crypto", () => {
  let sequence = 0;
  return { randomUUID: () => `uuid-${(sequence += 1)}` };
});
jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(async () => ({
        data: { session: { user: { id: "user-a" } } },
        error: null,
      })),
    },
  },
}));

const api = {
  enrollExam: jest.fn<LearningSyncApi["enrollExam"]>(),
  unenrollExam: jest.fn<LearningSyncApi["unenrollExam"]>(),
  listMyEnrollments: jest.fn<LearningSyncApi["listMyEnrollments"]>(),
  recordAttempt: jest.fn<LearningSyncApi["recordAttempt"]>(),
  upsertProgress: jest.fn<LearningSyncApi["upsertProgress"]>(),
  listMyProgress: jest.fn<LearningSyncApi["listMyProgress"]>(),
  listMyAttempts: jest.fn<LearningSyncApi["listMyAttempts"]>(),
  addBookmark: jest.fn<LearningSyncApi["addBookmark"]>(),
  removeBookmark: jest.fn<LearningSyncApi["removeBookmark"]>(),
  listMyBookmarks: jest.fn<LearningSyncApi["listMyBookmarks"]>(),
} satisfies LearningSyncApi;

// 시험 등록 대기 작업 생성
function enrollOperation(id: string, examId: string) {
  return {
    id,
    type: "enroll",
    payload: { examId },
    userId: "user-a",
    createdAt: "2026-09-25T00:00:00.000Z",
  };
}

// 저장된 제외 기록 행 수 조회
async function countDeadLetters(): Promise<number> {
  const database = await SQLite.openDatabaseAsync("ddopool-learning.db");
  const row = await database.getFirstAsync<{ total: number }>(
    "SELECT COUNT(*) AS total FROM learning_rows WHERE collection = ?",
    ["learning-sync-dead-letter"],
  );
  return row?.total ?? 0;
}

beforeEach(async () => {
  await clearLearningSyncOutbox();
  await AsyncStorage.clear();
  await Promise.all(["guest", "A", "B"].map(deleteOwnerRows));
  jest.clearAllMocks();
  for (const method of [
    api.enrollExam,
    api.unenrollExam,
    api.recordAttempt,
    api.upsertProgress,
    api.addBookmark,
    api.removeBookmark,
  ])
    method.mockResolvedValue(undefined);
});

test("기존 대기열 키를 순서대로 행으로 옮기고 전송 후 비운다", async () => {
  await AsyncStorage.setItem(
    LEARNING_SYNC_OUTBOX_KEY,
    JSON.stringify([enrollOperation("o1", "e1"), enrollOperation("o2", "e2")]),
  );

  expect((await loadLearningSyncOutbox()).map(({ id }) => id)).toEqual([
    "o1",
    "o2",
  ]);
  await expect(
    AsyncStorage.getItem(LEARNING_SYNC_OUTBOX_KEY),
  ).resolves.toBeNull();

  await expect(flushLearningSyncOutbox(api)).resolves.toEqual({
    syncedCount: 2,
    pendingCount: 0,
    discardedCount: 0,
  });
  expect(api.enrollExam.mock.calls).toEqual([["e1"], ["e2"]]);
  await expect(loadLearningSyncOutbox()).resolves.toEqual([]);
});

test("같은 대상 작업은 최신값 하나로 합쳐진다", async () => {
  await enqueueLearningSync({
    type: "bookmark-add",
    payload: { questionId: "q1" },
  });
  await enqueueLearningSync({ type: "enroll", payload: { examId: "e1" } });
  await enqueueLearningSync({
    type: "bookmark-remove",
    payload: { questionId: "q1" },
  });

  expect((await loadLearningSyncOutbox()).map(({ type }) => type)).toEqual([
    "enroll",
    "bookmark-remove",
  ]);
});

test("일시 실패 작업부터 순서를 유지해 남긴다", async () => {
  for (const examId of ["e1", "e2", "e3"])
    await enqueueLearningSync({ type: "enroll", payload: { examId } });
  api.enrollExam
    .mockResolvedValueOnce(undefined)
    .mockRejectedValueOnce(new Error("연결 실패"));

  const result = await flushLearningSyncOutbox(api);

  expect(result).toEqual({
    syncedCount: 1,
    pendingCount: 2,
    discardedCount: 0,
  });
  expect(
    (await loadLearningSyncOutbox()).map((operation) =>
      operation.type === "enroll" ? operation.payload.examId : null,
    ),
  ).toEqual(["e2", "e3"]);
});

test("영구 실패 작업은 제외 기록으로 옮기고 다음 작업을 계속 보낸다", async () => {
  for (const examId of ["e1", "e2"])
    await enqueueLearningSync({ type: "enroll", payload: { examId } });
  api.enrollExam.mockRejectedValueOnce(
    new PermanentLearningSyncError("22023", "잘못된 시험"),
  );

  const result = await flushLearningSyncOutbox(api);

  expect(result).toEqual({
    syncedCount: 1,
    pendingCount: 0,
    discardedCount: 1,
  });
  await expect(loadLearningSyncOutbox()).resolves.toEqual([]);
  await expect(countDeadLetters()).resolves.toBe(1);
  await clearLearningSyncOutbox();
  await expect(countDeadLetters()).resolves.toBe(0);
});

test("손상된 기존 대기열 키는 격리하고 복구를 예약한다", async () => {
  await AsyncStorage.setItem(LEARNING_SYNC_OUTBOX_KEY, "{broken");

  await expect(loadLearningSyncOutbox()).resolves.toEqual([]);
  await expect(
    AsyncStorage.getItem(LEARNING_SYNC_CORRUPT_OUTBOX_KEY),
  ).resolves.toBe("{broken");
  await expect(isLearningSyncOutboxRecoveryPending()).resolves.toBe(true);
});

test("대기열은 기기 기록 소유 계정마다 분리된다", async () => {
  await AsyncStorage.setItem(OWNER_KEY, "A");
  await enqueueLearningSync({ type: "enroll", payload: { examId: "e1" } });
  await AsyncStorage.setItem(OWNER_KEY, "B");
  await expect(loadLearningSyncOutbox()).resolves.toEqual([]);
  await AsyncStorage.setItem(OWNER_KEY, "A");
  expect(await loadLearningSyncOutbox()).toHaveLength(1);
});
