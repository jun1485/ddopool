import AsyncStorage from "@react-native-async-storage/async-storage";

import type { Question } from "@/types/exam";

const WRONG_ANSWER_NOTES_KEY = "exam-loop:wrong-answer-notes:v1";
let wrongAnswerWriteQueue: Promise<void> = Promise.resolve();

export type WrongAnswerTag =
  | "concept"
  | "calculation"
  | "misread"
  | "guess";

// 문제별 오답 노트
export interface WrongAnswerNote {
  questionId: string;
  examId: string;
  subject: string;
  tags: WrongAnswerTag[];
  memo: string;
  wrongCount: number;
  lastWrongAt: number;
  resolvedAt: number | null;
}

export type WrongAnswerNoteMap = Record<string, WrongAnswerNote>;

const wrongAnswerListeners = new Set<(notes: WrongAnswerNoteMap) => void>();

// 오답 노트 원본 로드
async function readWrongAnswerNotes(): Promise<WrongAnswerNoteMap> {
  try {
    const raw = await AsyncStorage.getItem(WRONG_ANSWER_NOTES_KEY);
    return raw == null ? {} : (JSON.parse(raw) as WrongAnswerNoteMap);
  } catch {
    return {};
  }
}

// 오답 노트 변경 전파
function notifyWrongAnswerNotes(notes: WrongAnswerNoteMap) {
  wrongAnswerListeners.forEach((listener) => listener(notes));
}

// 오답 노트 변경 구독
export function subscribeWrongAnswerNotes(
  listener: (notes: WrongAnswerNoteMap) => void,
): () => void {
  wrongAnswerListeners.add(listener);
  return () => {
    wrongAnswerListeners.delete(listener);
  };
}

// 오답 노트 전체 로드
export async function loadWrongAnswerNotes(): Promise<WrongAnswerNoteMap> {
  await wrongAnswerWriteQueue.catch(() => undefined);
  return readWrongAnswerNotes();
}

// 정오답 결과 기반 오답 노트 갱신
export function recordWrongAnswerState(
  question: Question,
  isCorrect: boolean,
  now: number,
): Promise<void> {
  wrongAnswerWriteQueue = wrongAnswerWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const notes = await readWrongAnswerNotes();
      const current = notes[question.id];
      if (isCorrect && current == null) return;
      const nextNotes: WrongAnswerNoteMap = {
        ...notes,
        [question.id]: isCorrect
          ? { ...current, resolvedAt: now }
          : {
              questionId: question.id,
              examId: question.examId,
              subject: question.subject,
              tags: current?.tags ?? [],
              memo: current?.memo ?? "",
              wrongCount: (current?.wrongCount ?? 0) + 1,
              lastWrongAt: now,
              resolvedAt: null,
            },
      };
      await AsyncStorage.setItem(
        WRONG_ANSWER_NOTES_KEY,
        JSON.stringify(nextNotes),
      );
      notifyWrongAnswerNotes(nextNotes);
    });
  return wrongAnswerWriteQueue;
}

// 불확실한 정답 오답 노트 유지
export function recordUncertainAnswerState(
  question: Question,
  now: number,
): Promise<void> {
  wrongAnswerWriteQueue = wrongAnswerWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const notes = await readWrongAnswerNotes();
      const current = notes[question.id];
      const nextNotes: WrongAnswerNoteMap = {
        ...notes,
        [question.id]: {
          questionId: question.id,
          examId: question.examId,
          subject: question.subject,
          tags: [...new Set([...(current?.tags ?? []), "guess" as const])],
          memo: current?.memo ?? "",
          wrongCount: current?.wrongCount ?? 0,
          lastWrongAt: now,
          resolvedAt: null,
        },
      };
      await AsyncStorage.setItem(
        WRONG_ANSWER_NOTES_KEY,
        JSON.stringify(nextNotes),
      );
      notifyWrongAnswerNotes(nextNotes);
    });
  return wrongAnswerWriteQueue;
}

// 오답 원인 태그·메모 저장
export function updateWrongAnswerNote(
  questionId: string,
  updates: Partial<Pick<WrongAnswerNote, "tags" | "memo">>,
): Promise<void> {
  wrongAnswerWriteQueue = wrongAnswerWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const notes = await readWrongAnswerNotes();
      const current = notes[questionId];
      if (current == null) return;
      const nextNotes = {
        ...notes,
        [questionId]: { ...current, ...updates },
      };
      await AsyncStorage.setItem(
        WRONG_ANSWER_NOTES_KEY,
        JSON.stringify(nextNotes),
      );
      notifyWrongAnswerNotes(nextNotes);
    });
  return wrongAnswerWriteQueue;
}

// 오답 노트 전체 초기화
export function clearWrongAnswerNotes(): Promise<void> {
  wrongAnswerWriteQueue = wrongAnswerWriteQueue
    .catch(() => undefined)
    .then(async () => {
      await AsyncStorage.removeItem(WRONG_ANSWER_NOTES_KEY);
      notifyWrongAnswerNotes({});
    });
  return wrongAnswerWriteQueue;
}
