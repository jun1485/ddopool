import { notesSchema } from "@/storage/data-schemas";
import {
  type LearningRows,
  type LegacyImport,
  withLearningRows,
} from "@/storage/learning-rows";
import { readValidated } from "@/storage/read-validated";
import {
  mergeUnchangedNotes,
  WRONG_ANSWER_NOTES_KEY,
  type WrongAnswerNote,
  type WrongAnswerNoteMap,
} from "@/storage/wrong-answer-note-types";

const COLLECTION = "wrong-answer-notes";
const noteSchema = notesSchema.valueType;

const legacyImport: LegacyImport = {
  collection: COLLECTION,
  legacyKey: WRONG_ANSWER_NOTES_KEY,
  decode: async () =>
    Object.entries(
      await readValidated(WRONG_ANSWER_NOTES_KEY, notesSchema, {}),
    ).map(([id, note]) => [id, JSON.stringify(note)]),
};

// 행 값 오답 노트 검증 변환
function parseNote(value: string | null): WrongAnswerNote | undefined {
  if (value == null) return undefined;
  try {
    const parsed = noteSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

// 유효한 오답 노트 행 전체 로드
async function readNoteMap(rows: LearningRows): Promise<WrongAnswerNoteMap> {
  const notes: WrongAnswerNoteMap = {};
  for (const [id, value] of await rows.entries(COLLECTION)) {
    const note = parseNote(value);
    if (note != null) notes[id] = note;
  }
  return notes;
}

// 오답 노트 전체 조회
export function readWrongAnswerNoteMap(): Promise<WrongAnswerNoteMap> {
  return withLearningRows([legacyImport], readNoteMap);
}

// questionId 오답 노트 한 건 갱신 후 전체 반환
export function updateWrongAnswerNoteRow(
  questionId: string,
  createNext: (
    current: WrongAnswerNote | undefined,
  ) => WrongAnswerNote | undefined,
): Promise<WrongAnswerNoteMap | null> {
  return withLearningRows([legacyImport], async (rows) => {
    const next = createNext(parseNote(await rows.get(COLLECTION, questionId)));
    if (next == null) return null;
    await rows.put(COLLECTION, [[questionId, JSON.stringify(next)]]);
    return readNoteMap(rows);
  });
}

// 동기화 병합 결과 중 로컬 미편집 행만 반영
export function mergeWrongAnswerNoteRows(
  expected: WrongAnswerNoteMap,
  merged: WrongAnswerNoteMap,
): Promise<WrongAnswerNoteMap | null> {
  return withLearningRows([legacyImport], async (rows) => {
    const current = await readNoteMap(rows);
    const next = mergeUnchangedNotes(current, expected, merged);
    const changed = Object.entries(next).flatMap(
      ([id, note]): [string, string][] => {
        const value = JSON.stringify(note);
        return JSON.stringify(current[id]) === value ? [] : [[id, value]];
      },
    );
    const removed = Object.keys(current).filter((id) => !(id in next));
    if (changed.length === 0 && removed.length === 0) return null;
    await rows.put(COLLECTION, changed);
    await rows.remove(COLLECTION, removed);
    return next;
  });
}

// 오답 노트 전체 삭제
export async function clearWrongAnswerNoteMap(): Promise<void> {
  await withLearningRows([legacyImport], (rows) => rows.clear(COLLECTION));
}
