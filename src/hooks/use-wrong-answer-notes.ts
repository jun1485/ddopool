import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  loadWrongAnswerNotes,
  subscribeWrongAnswerNotes,
  updateWrongAnswerNote,
  WrongAnswerNoteMap,
} from "@/storage/wrong-answer-note-store";
import type {
  WrongAnswerNote,
  WrongAnswerTag,
} from "@/storage/wrong-answer-note-store";

// 오답 노트 목록·편집 상태 관리
export function useWrongAnswerNotes() {
  const [notes, setNotes] = useState<WrongAnswerNoteMap>({});
  const [isLoading, setIsLoading] = useState(true);

  // 오답 노트 목록 갱신
  const reload = useCallback(async () => {
    setNotes(await loadWrongAnswerNotes());
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  // 오답 노트 변경 실시간 반영
  useEffect(() => subscribeWrongAnswerNotes(setNotes), []);

  // 문제별 오답 원인·메모 갱신
  const updateNote = useCallback(
    (
      questionId: string,
      updates: Partial<Pick<WrongAnswerNote, "tags" | "memo">>,
    ) => updateWrongAnswerNote(questionId, updates),
    [],
  );

  const unresolvedNotes = useMemo(
    () =>
      Object.values(notes)
        .filter((note) => note.resolvedAt == null)
        .sort((left, right) => right.lastWrongAt - left.lastWrongAt),
    [notes],
  );
  const resolvedNotes = useMemo(
    () =>
      Object.values(notes)
        .filter((note) => note.resolvedAt != null)
        .sort(
          (left, right) => (right.resolvedAt ?? 0) - (left.resolvedAt ?? 0),
        ),
    [notes],
  );

  // 문제별 오답 태그 전환
  const toggleTag = useCallback(
    (questionId: string, tag: WrongAnswerTag) => {
      const note = notes[questionId];
      if (note == null) return Promise.resolve();
      const tags = note.tags.includes(tag)
        ? note.tags.filter((storedTag) => storedTag !== tag)
        : [...note.tags, tag];
      return updateWrongAnswerNote(questionId, { tags });
    },
    [notes],
  );

  return {
    notes,
    unresolvedNotes,
    resolvedNotes,
    isLoading,
    reload,
    updateNote,
    toggleTag,
  };
}
