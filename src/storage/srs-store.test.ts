import { beforeEach, expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { deleteOwnerRows } from "./learning-rows";
import {
  clearSrsCards,
  loadSrsCards,
  updateSrsCard,
  updateSrsCards,
} from "./srs-store";
import { OWNER_KEY } from "./vault-owner";

import type { SrsCard } from "@/types/exam";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);

jest.mock("@/lib/monitoring", () => ({ captureHandledError: jest.fn() }));

const LEGACY_KEY = "exam-loop:srs-cards";

// SRS 카드 생성
function card(questionId: string, repetitions = 1): SrsCard {
  return {
    questionId,
    examId: "computer-1",
    repetitions,
    easeFactor: 2.5,
    intervalDays: 1,
    dueAt: 1_000,
    lastReviewedAt: 500,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await Promise.all(["guest", "A", "B"].map(deleteOwnerRows));
});

test("기존 키의 SRS 카드를 행으로 옮기고 키를 지운다", async () => {
  await AsyncStorage.setItem(
    LEGACY_KEY,
    JSON.stringify({ q1: card("q1"), q2: card("q2") }),
  );

  await expect(loadSrsCards()).resolves.toEqual({
    q1: card("q1"),
    q2: card("q2"),
  });
  await expect(AsyncStorage.getItem(LEGACY_KEY)).resolves.toBeNull();
});

test("한 문항 갱신은 다른 카드를 유지한다", async () => {
  await updateSrsCards(() => ({ q1: card("q1"), q2: card("q2") }));

  await updateSrsCard("q2", (current) =>
    card("q2", (current?.repetitions ?? 0) + 1),
  );

  await expect(loadSrsCards()).resolves.toEqual({
    q1: card("q1"),
    q2: card("q2", 2),
  });
});

test("전체 갱신에서 빠진 카드는 삭제된다", async () => {
  await updateSrsCards(() => ({ q1: card("q1"), q2: card("q2") }));

  await updateSrsCards(({ q1 }) => ({ q1 }));

  await expect(loadSrsCards()).resolves.toEqual({ q1: card("q1") });
});

test("계정마다 SRS 카드가 분리되고 삭제 계정 행만 지워진다", async () => {
  await AsyncStorage.setItem(OWNER_KEY, "A");
  await updateSrsCard("q1", () => card("q1"));
  await AsyncStorage.setItem(OWNER_KEY, "B");
  await expect(loadSrsCards()).resolves.toEqual({});
  await updateSrsCard("q9", () => card("q9"));

  await deleteOwnerRows("B");
  await expect(loadSrsCards()).resolves.toEqual({});
  await AsyncStorage.setItem(OWNER_KEY, "A");
  await expect(loadSrsCards()).resolves.toEqual({ q1: card("q1") });
});

test("백업 복원이 쓴 기존 키는 행 전체를 교체한다", async () => {
  await updateSrsCards(() => ({ q1: card("q1"), q2: card("q2") }));

  await AsyncStorage.setItem(LEGACY_KEY, JSON.stringify({ q3: card("q3") }));

  await expect(loadSrsCards()).resolves.toEqual({ q3: card("q3") });
});

test("손상된 기존 카드는 제외하고 나머지를 옮긴다", async () => {
  await AsyncStorage.setItem(
    LEGACY_KEY,
    JSON.stringify({ q1: card("q1"), q2: { questionId: "q2" } }),
  );

  await expect(loadSrsCards()).resolves.toEqual({ q1: card("q1") });
});

test("전체 삭제 후 카드가 비어 있다", async () => {
  await updateSrsCard("q1", () => card("q1"));

  await clearSrsCards();

  await expect(loadSrsCards()).resolves.toEqual({});
});
