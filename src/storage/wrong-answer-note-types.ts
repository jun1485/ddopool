export const WRONG_ANSWER_NOTES_KEY = "exam-loop:wrong-answer-notes:v1";

export type WrongAnswerTag = "concept" | "calculation" | "misread" | "guess";

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

// 동기화 시작 후 바뀌지 않은 오답 노트에만 병합값 적용
export function mergeUnchangedNotes(
  current: WrongAnswerNoteMap,
  expected: WrongAnswerNoteMap,
  merged: WrongAnswerNoteMap,
): WrongAnswerNoteMap {
  const next = { ...current };
  for (const id of new Set([
    ...Object.keys(expected),
    ...Object.keys(merged),
  ])) {
    if (JSON.stringify(current[id]) !== JSON.stringify(expected[id])) continue;
    if (merged[id] == null) delete next[id];
    else next[id] = merged[id];
  }
  return next;
}
