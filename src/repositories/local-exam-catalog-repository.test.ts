import { beforeEach, expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";
import type { ExamPlatformApi } from "../../packages/contracts/src";
import { DEVICE_OWNER, deleteOwnerRows } from "@/storage/learning-rows";
import {
  EXAM_CATALOG_CACHE_KEY,
  EXAM_CATALOG_CACHE_TIME_KEY,
  EXAM_CATALOG_EXAM_TIMES_KEY,
} from "./exam-catalog-cache-types";
import { examPlatformApi } from "./exam-platform-api";
import { examCatalogRepository } from "./local-exam-catalog-repository";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("./exam-platform-api", () => ({
  examPlatformApi: {
    listActiveExams: jest.fn<ExamPlatformApi["listActiveExams"]>(),
    listPublishedQuestions:
      jest.fn<ExamPlatformApi["listPublishedQuestions"]>(),
  },
}));
const exams = ["a", "b"].map((id) => ({
  id,
  title: id,
  shortTitle: id,
  description: "시험",
  icon: "책",
  subjects: ["과목"],
  status: "active" as const,
}));

// 시험별 문항 생성
function question(examId: string, id: string) {
  return {
    id,
    examId,
    subject: "과목",
    prompt: "문제",
    choices: ["가", "나"],
    answerIndex: 0,
    explanation: "해설",
  };
}

// 학습 기록 데이터베이스 연결 조회
function openDatabase() {
  return SQLite.openDatabaseAsync("ddopool-learning.db");
}

beforeEach(async () => {
  await AsyncStorage.clear();
  await deleteOwnerRows(DEVICE_OWNER);
  jest.clearAllMocks();
  jest.mocked(examPlatformApi.listActiveExams).mockResolvedValue(exams);
  jest.mocked(examPlatformApi.listPublishedQuestions).mockResolvedValue([]);
});

test("등록 전에는 시험 목록만 받고 선택 시험만 다운로드한다", async () => {
  await examCatalogRepository.loadCatalog([]);
  expect(examPlatformApi.listPublishedQuestions).not.toHaveBeenCalled();
  await Promise.all([
    examCatalogRepository.loadCatalog(["a"]),
    examCatalogRepository.loadCatalog(["a"]),
  ]);
  expect(examPlatformApi.listPublishedQuestions).toHaveBeenCalledTimes(1);
  expect(examPlatformApi.listPublishedQuestions).toHaveBeenCalledWith("a");
  await examCatalogRepository.loadCatalog(["a", "b"]);
  expect(examPlatformApi.listPublishedQuestions).toHaveBeenCalledTimes(2);
});

test("본문 캐시 저장 실패 시 다음 요청이 다시 다운로드한다", async () => {
  const runAsync = jest
    .spyOn(await openDatabase(), "runAsync")
    .mockRejectedValueOnce(new Error("저장 공간 부족"));
  await examCatalogRepository.loadCatalog(["a"]);
  await examCatalogRepository.loadCatalog(["a"]);
  runAsync.mockRestore();
  expect(examPlatformApi.listPublishedQuestions).toHaveBeenCalledTimes(2);
});

test("본문이 유실됐으면 갱신 시각이 남아 있어도 다운로드한다", async () => {
  await examCatalogRepository.loadCatalog(["a"]);
  await (
    await openDatabase()
  ).runAsync("DELETE FROM learning_rows WHERE owner = ? AND id = ?", [
    DEVICE_OWNER,
    "q:a",
  ]);
  await examCatalogRepository.loadCatalog(["a"]);
  expect(examPlatformApi.listPublishedQuestions).toHaveBeenCalledTimes(2);
});

test("한 시험 다운로드 실패가 다른 시험 결과를 버리지 않는다", async () => {
  jest
    .mocked(examPlatformApi.listPublishedQuestions)
    .mockImplementation(async (id) => {
      if (id === "b") throw new Error("연결 실패");
      return [];
    });
  const result = await examCatalogRepository.loadCatalog(["a", "b"]);
  expect(result.unavailableExamIds).toEqual(["b"]);
  expect(result.exams).toHaveLength(2);
  await examCatalogRepository.loadCatalog(["a"]);
  expect(examPlatformApi.listPublishedQuestions).toHaveBeenCalledTimes(2);
});

test("기존 캐시 키의 문항을 행으로 옮겨 다시 다운로드하지 않는다", async () => {
  const now = Date.now();
  await AsyncStorage.multiSet([
    [
      EXAM_CATALOG_CACHE_KEY,
      JSON.stringify({ exams, questions: [question("a", "a-1")] }),
    ],
    [EXAM_CATALOG_CACHE_TIME_KEY, String(now)],
    [EXAM_CATALOG_EXAM_TIMES_KEY, JSON.stringify({ a: now })],
  ]);

  const result = await examCatalogRepository.loadCatalog(["a"]);

  expect(result.questions.map((item) => item.id)).toEqual(["a-1"]);
  expect(examPlatformApi.listActiveExams).not.toHaveBeenCalled();
  expect(examPlatformApi.listPublishedQuestions).not.toHaveBeenCalled();
  await expect(
    AsyncStorage.multiGet([
      EXAM_CATALOG_CACHE_KEY,
      EXAM_CATALOG_CACHE_TIME_KEY,
      EXAM_CATALOG_EXAM_TIMES_KEY,
    ]),
  ).resolves.toEqual([
    [EXAM_CATALOG_CACHE_KEY, null],
    [EXAM_CATALOG_CACHE_TIME_KEY, null],
    [EXAM_CATALOG_EXAM_TIMES_KEY, null],
  ]);
});

test("읽을 수 없는 기존 캐시 키는 버리고 새로 다운로드한다", async () => {
  await AsyncStorage.setItem(EXAM_CATALOG_CACHE_KEY, "{}");
  jest
    .mocked(AsyncStorage.getItem)
    .mockRejectedValueOnce(new Error("Row too big to fit into CursorWindow"));
  jest
    .mocked(examPlatformApi.listPublishedQuestions)
    .mockResolvedValue([question("a", "a-1")]);

  const result = await examCatalogRepository.loadCatalog(["a"]);

  expect(result.questions.map((item) => item.id)).toEqual(["a-1"]);
  await expect(
    AsyncStorage.getItem(EXAM_CATALOG_CACHE_KEY),
  ).resolves.toBeNull();
});

test("새로 다운로드한 시험 문항 행만 다시 저장한다", async () => {
  jest
    .mocked(examPlatformApi.listPublishedQuestions)
    .mockImplementation(async (id) => [question(id, `${id}-1`)]);
  await examCatalogRepository.loadCatalog(["a"]);
  const runAsync = jest.spyOn(await openDatabase(), "runAsync");

  const result = await examCatalogRepository.loadCatalog(["a", "b"]);

  const written = runAsync.mock.calls.flatMap(([, ...params]) => params.flat());
  runAsync.mockRestore();
  expect(written).toContain("q:b");
  expect(written).not.toContain("q:a");
  expect(result.questions.map((item) => item.id).sort()).toEqual([
    "a-1",
    "b-1",
  ]);
});
