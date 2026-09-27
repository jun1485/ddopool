import { beforeEach, expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { deleteOwnerRows } from "./learning-rows";
import { OWNER_KEY } from "./vault-owner";
import {
  applySyncedWrongAnswerNotes,
  loadWrongAnswerNotes,
  recordWrongAnswerState,
  subscribeWrongAnswerNotes,
  updateWrongAnswerNote,
  type WrongAnswerNote,
} from "./wrong-answer-note-store";
import { WRONG_ANSWER_NOTES_KEY } from "./wrong-answer-note-types";

import type { Question } from "@/types/exam";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("@/lib/monitoring", () => ({ captureHandledError: jest.fn() }));

// 문항 생성
function question(id: string): Question {
  return {
    id,
    examId: "computer-1",
    subject: "과목",
    prompt: "문제",
    choices: ["가", "나"],
    answerIndex: 0,
    explanation: "해설",
  };
}

// 오답 노트 생성
function note(questionId: string, memo = ""): WrongAnswerNote {
  return {
    questionId,
    examId: "computer-1",
    subject: "과목",
    tags: [],
    memo,
    wrongCount: 1,
    lastWrongAt: 100,
    resolvedAt: null,
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await Promise.all(["guest", "A", "B"].map(deleteOwnerRows));
});

test("기존 키의 오답 노트를 행으로 옮기고 키를 지운다", async () => {
  await AsyncStorage.setItem(
    WRONG_ANSWER_NOTES_KEY,
    JSON.stringify({ q1: note("q1"), q2: note("q2") }),
  );

  await expect(loadWrongAnswerNotes()).resolves.toEqual({
    q1: note("q1"),
    q2: note("q2"),
  });
  await expect(
    AsyncStorage.getItem(WRONG_ANSWER_NOTES_KEY),
  ).resolves.toBeNull();
});

test("정오답 기록은 해당 문항 노트만 바꾸고 변경을 알린다", async () => {
  const listener = jest.fn();
  const unsubscribe = subscribeWrongAnswerNotes(listener);
  await recordWrongAnswerState(question("q1"), false, 100);
  await recordWrongAnswerState(question("q2"), false, 100);
  await recordWrongAnswerState(question("q3"), true, 200);
  await recordWrongAnswerState(question("q1"), true, 300);
  unsubscribe();

  expect(listener).toHaveBeenCalledTimes(3);
  await expect(loadWrongAnswerNotes()).resolves.toEqual({
    q1: { ...note("q1"), resolvedAt: 300 },
    q2: note("q2"),
  });
});

test("동기화 병합은 그사이 편집한 노트를 덮지 않는다", async () => {
  await recordWrongAnswerState(question("q1"), false, 100);
  await recordWrongAnswerState(question("q2"), false, 100);
  const expected = await loadWrongAnswerNotes();
  await updateWrongAnswerNote("q1", { memo: "새 메모" });

  await applySyncedWrongAnswerNotes(expected, {
    q1: note("q1", "서버 메모"),
    q2: note("q2", "서버 메모"),
    q3: note("q3", "서버 메모"),
  });

  await expect(loadWrongAnswerNotes()).resolves.toEqual({
    q1: note("q1", "새 메모"),
    q2: note("q2", "서버 메모"),
    q3: note("q3", "서버 메모"),
  });
});

test("오답 노트는 기기 기록 소유 계정마다 분리된다", async () => {
  await AsyncStorage.setItem(OWNER_KEY, "A");
  await recordWrongAnswerState(question("q1"), false, 100);
  await AsyncStorage.setItem(OWNER_KEY, "B");
  await expect(loadWrongAnswerNotes()).resolves.toEqual({});
  await deleteOwnerRows("A");
  await AsyncStorage.setItem(OWNER_KEY, "A");
  await expect(loadWrongAnswerNotes()).resolves.toEqual({});
});
