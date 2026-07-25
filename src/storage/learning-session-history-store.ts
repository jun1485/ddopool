import AsyncStorage from "@react-native-async-storage/async-storage";

import type { QuizMode } from "@/types/exam";

const LEARNING_SESSION_HISTORY_KEY = "exam-loop:learning-session-history:v1";
const LEARNING_SESSION_HISTORY_LIMIT = 100;
let learningSessionHistoryWriteQueue: Promise<void> = Promise.resolve();

// 완료 학습 세션 기록
export interface LearningSessionResult {
  id: string;
  examIds: string[];
  questionIds: string[];
  mode: QuizMode;
  questionCount: number;
  answeredCount: number;
  correctCount: number;
  durationSeconds: number;
  completedAt: number;
}

export type NewLearningSessionResult = Omit<LearningSessionResult, "id">;

// 완료 학습 세션 원본 로드
async function readLearningSessionHistory(): Promise<LearningSessionResult[]> {
  try {
    const raw = await AsyncStorage.getItem(LEARNING_SESSION_HISTORY_KEY);
    return raw == null ? [] : (JSON.parse(raw) as LearningSessionResult[]);
  } catch {
    return [];
  }
}

// 완료 학습 세션 전체 로드
export async function loadLearningSessionHistory(): Promise<
  LearningSessionResult[]
> {
  await learningSessionHistoryWriteQueue.catch(() => undefined);
  return readLearningSessionHistory();
}

// 완료 학습 세션 순차 저장
export function recordLearningSessionResult(
  result: NewLearningSessionResult,
): Promise<void> {
  learningSessionHistoryWriteQueue = learningSessionHistoryWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const current = await readLearningSessionHistory();
      const nextResult: LearningSessionResult = {
        ...result,
        id: `${result.completedAt}-${result.mode}-${result.questionIds[0] ?? "empty"}`,
      };
      await AsyncStorage.setItem(
        LEARNING_SESSION_HISTORY_KEY,
        JSON.stringify(
          [nextResult, ...current].slice(0, LEARNING_SESSION_HISTORY_LIMIT),
        ),
      );
    });
  return learningSessionHistoryWriteQueue;
}

// 완료 학습 세션 기록 전체 제거
export function clearLearningSessionHistory(): Promise<void> {
  learningSessionHistoryWriteQueue = learningSessionHistoryWriteQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.removeItem(LEARNING_SESSION_HISTORY_KEY));
  return learningSessionHistoryWriteQueue;
}
