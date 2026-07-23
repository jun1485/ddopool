import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  loadBookmarks,
  saveBookmarks,
  subscribeBookmarks,
} from "@/storage/bookmark-store";
import { enqueueLearningSync } from "@/sync/learning-sync-outbox";

// 저장 문제 상태 관리
export function useBookmarks() {
  const [bookmarkedQuestionIds, setBookmarkedQuestionIds] = useState<string[]>(
    [],
  );
  const bookmarkIdsRef = useRef<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 저장 문제 상태 즉시 반영
  const applyBookmarks = useCallback((questionIds: string[]) => {
    bookmarkIdsRef.current = questionIds;
    setBookmarkedQuestionIds(questionIds);
  }, []);

  // 저장 문제 목록 갱신
  const reload = useCallback(async () => {
    applyBookmarks(await loadBookmarks());
    setIsLoading(false);
  }, [applyBookmarks]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  // 저장 문제 변경 실시간 반영
  useEffect(() => subscribeBookmarks(applyBookmarks), [applyBookmarks]);

  // 문제 저장 상태 전환
  const toggleBookmark = useCallback(
    (questionId: string) => {
      const currentQuestionIds = bookmarkIdsRef.current;
      const bookmarked = currentQuestionIds.includes(questionId);
      const nextQuestionIds = bookmarked
        ? currentQuestionIds.filter(
            (storedQuestionId) => storedQuestionId !== questionId,
          )
        : [...currentQuestionIds, questionId];
      applyBookmarks(nextQuestionIds);
      void saveBookmarks(nextQuestionIds);
      void enqueueLearningSync({
        type: bookmarked ? "bookmark-remove" : "bookmark-add",
        payload: { questionId },
      });
    },
    [applyBookmarks],
  );

  // 저장 문제 일괄 추가
  const addBookmarks = useCallback(
    (questionIds: string[]) => {
      const currentQuestionIds = bookmarkIdsRef.current;
      const newQuestionIds = questionIds.filter(
        (questionId) => !currentQuestionIds.includes(questionId),
      );
      const nextQuestionIds = [
        ...new Set([...currentQuestionIds, ...questionIds]),
      ];
      applyBookmarks(nextQuestionIds);
      void saveBookmarks(nextQuestionIds);
      newQuestionIds.forEach((questionId) => {
        void enqueueLearningSync({
          type: "bookmark-add",
          payload: { questionId },
        });
      });
    },
    [applyBookmarks],
  );

  return {
    bookmarkedQuestionIds,
    isLoading,
    toggleBookmark,
    addBookmarks,
  };
}
