import type * as NativePersistence from "@/storage/wrong-answer-note-persistence.native";
import { notesSchema } from "@/storage/data-schemas";
import { readValidated } from "@/storage/read-validated";
import {
  mergeUnchangedNotes,
  WRONG_ANSWER_NOTES_KEY,
  type WrongAnswerNoteMap,
} from "@/storage/wrong-answer-note-types";
import AsyncStorage from "@react-native-async-storage/async-storage";

// 오답 노트 맵 저장
async function writeNoteMap(notes: WrongAnswerNoteMap): Promise<void> {
  await AsyncStorage.setItem(WRONG_ANSWER_NOTES_KEY, JSON.stringify(notes));
}

// 오답 노트 전체 조회
export const readWrongAnswerNoteMap: typeof NativePersistence.readWrongAnswerNoteMap =
  () => readValidated(WRONG_ANSWER_NOTES_KEY, notesSchema, {});

// questionId 오답 노트 한 건 갱신 후 전체 반환
export const updateWrongAnswerNoteRow: typeof NativePersistence.updateWrongAnswerNoteRow =
  async (questionId, createNext) => {
    const notes = await readWrongAnswerNoteMap();
    const next = createNext(notes[questionId]);
    if (next == null) return null;
    const nextNotes = { ...notes, [questionId]: next };
    await writeNoteMap(nextNotes);
    return nextNotes;
  };

// 동기화 병합 결과 중 로컬 미편집 항목만 반영
export const mergeWrongAnswerNoteRows: typeof NativePersistence.mergeWrongAnswerNoteRows =
  async (expected, merged) => {
    const notes = await readWrongAnswerNoteMap();
    const next = mergeUnchangedNotes(notes, expected, merged);
    if (JSON.stringify(next) === JSON.stringify(notes)) return null;
    await writeNoteMap(next);
    return next;
  };

// 오답 노트 전체 삭제
export const clearWrongAnswerNoteMap: typeof NativePersistence.clearWrongAnswerNoteMap =
  () => AsyncStorage.removeItem(WRONG_ANSWER_NOTES_KEY);
