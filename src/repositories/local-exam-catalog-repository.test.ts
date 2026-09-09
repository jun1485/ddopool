import { beforeEach, expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ExamPlatformApi } from "../../packages/contracts/src";
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

beforeEach(async () => {
  await AsyncStorage.clear();
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
  jest
    .mocked(AsyncStorage.setItem)
    .mockRejectedValueOnce(new Error("저장 공간 부족"));
  await examCatalogRepository.loadCatalog(["a"]);
  await examCatalogRepository.loadCatalog(["a"]);
  expect(examPlatformApi.listPublishedQuestions).toHaveBeenCalledTimes(2);
});

test("본문이 유실됐으면 갱신 시각이 남아 있어도 다운로드한다", async () => {
  await examCatalogRepository.loadCatalog(["a"]);
  const keys = await AsyncStorage.getAllKeys();
  const bodyKey = keys.find(
    (key) =>
      key.includes("exam-catalog-cache:v2:") &&
      !key.endsWith(":time") &&
      !key.endsWith(":exams"),
  );
  expect(bodyKey).toBeDefined();
  await AsyncStorage.removeItem(bodyKey!);
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
