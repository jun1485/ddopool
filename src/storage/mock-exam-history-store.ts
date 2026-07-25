import AsyncStorage from "@react-native-async-storage/async-storage";

import type { ExamId } from "@/types/exam";

const MOCK_EXAM_HISTORY_KEY = "exam-loop:mock-exam-history:v1";
const MOCK_EXAM_HISTORY_LIMIT = 50;
let mockExamHistoryWriteQueue: Promise<void> = Promise.resolve();

// 모의고사 과목별 결과
export interface MockExamSubjectResult {
  examId: ExamId;
  subject: string;
  correct: number;
  total: number;
}

// 모의고사 회차 결과
export interface MockExamResult {
  id: string;
  examIds: ExamId[];
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  durationSeconds: number;
  subjectResults: MockExamSubjectResult[];
  completedAt: number;
}

export type NewMockExamResult = Omit<MockExamResult, "id">;

// 저장된 모의고사 회차 목록 로드
async function loadStoredMockExamHistory(): Promise<MockExamResult[]> {
  try {
    const raw = await AsyncStorage.getItem(MOCK_EXAM_HISTORY_KEY);
    return raw == null ? [] : (JSON.parse(raw) as MockExamResult[]);
  } catch {
    return [];
  }
}

// 저장된 모의고사 회차 목록 조회
export async function loadMockExamHistory(): Promise<MockExamResult[]> {
  await mockExamHistoryWriteQueue.catch(() => undefined);
  return loadStoredMockExamHistory();
}

// 모의고사 회차 결과 순차 저장
export function recordMockExamResult(
  result: NewMockExamResult,
): Promise<void> {
  mockExamHistoryWriteQueue = mockExamHistoryWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const current = await loadStoredMockExamHistory();
      const nextResult: MockExamResult = {
        ...result,
        id: `${result.completedAt}-${result.examIds.join("-")}`,
      };
      await AsyncStorage.setItem(
        MOCK_EXAM_HISTORY_KEY,
        JSON.stringify([nextResult, ...current].slice(0, MOCK_EXAM_HISTORY_LIMIT)),
      );
    });
  return mockExamHistoryWriteQueue;
}

// 모의고사 회차 기록 전체 제거
export function clearMockExamHistory(): Promise<void> {
  mockExamHistoryWriteQueue = mockExamHistoryWriteQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.removeItem(MOCK_EXAM_HISTORY_KEY));
  return mockExamHistoryWriteQueue;
}
