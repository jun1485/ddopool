import type {
  LearningSyncApi,
  UserQuestionProgressRow,
} from "../../packages/contracts/src";

import { loadBookmarks, saveBookmarks } from "@/storage/bookmark-store";
import {
  loadExamEnrollment,
  saveExamEnrollment,
} from "@/storage/exam-enrollment-store";
import { loadSrsCards, saveSrsCards, SrsCardMap } from "@/storage/srs-store";
import { mergeRemoteAttempts } from "@/storage/stats-store";
import { SrsCard } from "@/types/exam";

// 서버 SRS 상태 앱 카드 변환
function toSrsCard(progress: UserQuestionProgressRow): SrsCard {
  return {
    questionId: progress.question_id,
    examId: progress.exam_id,
    repetitions: progress.repetitions,
    easeFactor: Number(progress.ease_factor),
    intervalDays: progress.interval_days,
    dueAt: new Date(progress.due_at).getTime(),
    lastReviewedAt: new Date(progress.last_reviewed_at).getTime(),
  };
}

// 서버·로컬 학습 상태 최신값 병합
export async function hydrateRemoteLearningData(
  api: LearningSyncApi,
): Promise<void> {
  const [
    remoteEnrollments,
    remoteProgress,
    remoteBookmarks,
    remoteAttempts,
    localEnrollment,
    localCards,
    localBookmarks,
  ] = await Promise.all([
    api.listMyEnrollments(),
    api.listMyProgress(),
    api.listMyBookmarks(),
    api.listMyAttempts(),
    loadExamEnrollment(),
    loadSrsCards(),
    loadBookmarks(),
  ]);
  const examIds = [
    ...new Set([
      ...(localEnrollment?.examIds ?? []),
      ...remoteEnrollments.map((enrollment) => enrollment.exam_id),
    ]),
  ];
  const mergedCards = remoteProgress.reduce<SrsCardMap>((cards, progress) => {
    const remoteCard = toSrsCard(progress);
    const localCard = cards[remoteCard.questionId];
    return localCard != null &&
      localCard.lastReviewedAt > remoteCard.lastReviewedAt
      ? cards
      : { ...cards, [remoteCard.questionId]: remoteCard };
  }, localCards);
  const bookmarkIds = [
    ...new Set([
      ...localBookmarks,
      ...remoteBookmarks.map((bookmark) => bookmark.question_id),
    ]),
  ];

  await Promise.all([
    saveExamEnrollment({
      examIds,
      onboardingCompleted:
        localEnrollment?.onboardingCompleted === true || examIds.length > 0,
    }),
    saveSrsCards(mergedCards),
    saveBookmarks(bookmarkIds),
    mergeRemoteAttempts(remoteAttempts),
  ]);
}
