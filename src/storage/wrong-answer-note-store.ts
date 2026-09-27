import {
  clearWrongAnswerNoteMap,
  mergeWrongAnswerNoteRows,
  readWrongAnswerNoteMap,
  updateWrongAnswerNoteRow,
} from "@/storage/wrong-answer-note-persistence";
import type {
  WrongAnswerNote,
  WrongAnswerNoteMap,
} from "@/storage/wrong-answer-note-types";

import type { Question } from "@/types/exam";

export type {
  WrongAnswerNote,
  WrongAnswerNoteMap,
  WrongAnswerTag,
} from "@/storage/wrong-answer-note-types";

let wrongAnswerWriteQueue: Promise<void> = Promise.resolve();

const wrongAnswerListeners = new Set<(notes: WrongAnswerNoteMap) => void>();

// 오답 노트 원본 로드
async function readWrongAnswerNotes(): Promise<WrongAnswerNoteMap> {
  try {
    return await readWrongAnswerNoteMap();
  } catch {
    return {};
  }
}

// 오답 노트 변경 전파
function notifyWrongAnswerNotes(notes: WrongAnswerNoteMap) {
  wrongAnswerListeners.forEach((listener) => listener(notes));
}

// 오답 노트 저장 작업 직렬 실행·변경 전파
function enqueueWrongAnswerWrite(
  write: () => Promise<WrongAnswerNoteMap | null>,
): Promise<void> {
  wrongAnswerWriteQueue = wrongAnswerWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const notes = await write();
      if (notes != null) notifyWrongAnswerNotes(notes);
    });
  return wrongAnswerWriteQueue;
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

// 동기화용 오답 노트 전체 로드
export async function loadWrongAnswerNotesForSync(): Promise<WrongAnswerNoteMap> {
  await wrongAnswerWriteQueue.catch(() => undefined);
  return readWrongAnswerNoteMap();
}

// 정오답 결과 기반 오답 노트 갱신
export function recordWrongAnswerState(
  question: Question,
  isCorrect: boolean,
  now: number,
): Promise<void> {
  return enqueueWrongAnswerWrite(() =>
    updateWrongAnswerNoteRow(
      question.id,
      (current): WrongAnswerNote | undefined => {
        if (isCorrect) return current && { ...current, resolvedAt: now };
        return {
          questionId: question.id,
          examId: question.examId,
          subject: question.subject,
          tags: current?.tags ?? [],
          memo: current?.memo ?? "",
          wrongCount: (current?.wrongCount ?? 0) + 1,
          lastWrongAt: now,
          resolvedAt: null,
        };
      },
    ),
  );
}

// 불확실한 정답 오답 노트 유지
export function recordUncertainAnswerState(
  question: Question,
  now: number,
): Promise<void> {
  return enqueueWrongAnswerWrite(() =>
    updateWrongAnswerNoteRow(question.id, (current) => ({
      questionId: question.id,
      examId: question.examId,
      subject: question.subject,
      tags: [...new Set([...(current?.tags ?? []), "guess" as const])],
      memo: current?.memo ?? "",
      wrongCount: current?.wrongCount ?? 0,
      lastWrongAt: now,
      resolvedAt: null,
    })),
  );
}

// 오답 원인 태그·메모 저장
export function updateWrongAnswerNote(
  questionId: string,
  updates: Partial<Pick<WrongAnswerNote, "tags" | "memo">>,
): Promise<void> {
  return enqueueWrongAnswerWrite(() =>
    updateWrongAnswerNoteRow(
      questionId,
      (current) => current && { ...current, ...updates },
    ),
  );
}

// 서버 병합 오답 노트 중 동기화 이후 미편집 항목 반영
export function applySyncedWrongAnswerNotes(
  expected: WrongAnswerNoteMap,
  merged: WrongAnswerNoteMap,
): Promise<void> {
  return enqueueWrongAnswerWrite(() =>
    mergeWrongAnswerNoteRows(expected, merged),
  );
}

// 오답 노트 전체 초기화
export function clearWrongAnswerNotes(): Promise<void> {
  return enqueueWrongAnswerWrite(async () => {
    await clearWrongAnswerNoteMap();
    return {};
  });
}

// 저장 대기 작업 종료 대기
export async function settleWrongAnswerNoteStore(): Promise<void> {
  await wrongAnswerWriteQueue.catch(() => undefined);
}
