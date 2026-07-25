import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AnswerConfidence } from "@/learning/answer-confidence";
import type { Question, QuizMode } from "@/types/exam";

const ACTIVE_QUIZ_SESSION_KEY = "exam-loop:active-quiz-session:v1";
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
let activeSessionWriteQueue: Promise<void> = Promise.resolve();

// 저장 세션 답안
export interface StoredQuizAnswer {
  questionId: string;
  subject: string;
  selectedIndex: number | null;
  isCorrect: boolean;
  confidence?: AnswerConfidence | null;
}

// 이어 풀기 세션 상태
export interface ActiveQuizSession {
  examId: string;
  mode: Exclude<QuizMode, "mock">;
  questions: Question[];
  currentIndex: number;
  selectedIndex: number | null;
  isSubmitted: boolean;
  answerConfidence?: AnswerConfidence | null;
  correctCount: number;
  answers: StoredQuizAnswer[];
  startedAt?: number;
  elapsedSeconds?: number;
  updatedAt: number;
}

const activeSessionListeners = new Set<
  (session: ActiveQuizSession | null) => void
>();

// 이어 풀기 세션 변경 전파
function notifyActiveSession(session: ActiveQuizSession | null) {
  activeSessionListeners.forEach((listener) => listener(session));
}

// 이어 풀기 세션 변경 구독
export function subscribeActiveQuizSession(
  listener: (session: ActiveQuizSession | null) => void,
): () => void {
  activeSessionListeners.add(listener);
  return () => {
    activeSessionListeners.delete(listener);
  };
}

// 이어 풀기 세션 유효성 판정
export function isActiveQuizSessionValid(
  session: ActiveQuizSession,
  now: number,
): boolean {
  return (
    session.questions.length > 0 &&
    session.currentIndex >= 0 &&
    session.currentIndex < session.questions.length &&
    now - session.updatedAt <= SESSION_TTL_MS
  );
}

// 이어 풀기 세션 로드
export async function loadActiveQuizSession(
  now: number,
): Promise<ActiveQuizSession | null> {
  try {
    await activeSessionWriteQueue.catch(() => undefined);
    const raw = await AsyncStorage.getItem(ACTIVE_QUIZ_SESSION_KEY);
    if (raw == null) return null;
    const session = JSON.parse(raw) as ActiveQuizSession;
    if (isActiveQuizSessionValid(session, now)) return session;
    await AsyncStorage.removeItem(ACTIVE_QUIZ_SESSION_KEY);
    return null;
  } catch {
    return null;
  }
}

// 이어 풀기 세션 순차 저장
export function saveActiveQuizSession(
  session: ActiveQuizSession,
): Promise<void> {
  notifyActiveSession(session);
  activeSessionWriteQueue = activeSessionWriteQueue
    .catch(() => undefined)
    .then(() =>
      AsyncStorage.setItem(ACTIVE_QUIZ_SESSION_KEY, JSON.stringify(session)),
    );
  return activeSessionWriteQueue;
}

// 이어 풀기 세션 제거
export function clearActiveQuizSession(): Promise<void> {
  notifyActiveSession(null);
  activeSessionWriteQueue = activeSessionWriteQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.removeItem(ACTIVE_QUIZ_SESSION_KEY));
  return activeSessionWriteQueue;
}
