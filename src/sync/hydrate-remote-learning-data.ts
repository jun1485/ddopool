import type {
  LearningSyncApi,
  UserQuestionProgressRow,
} from "../../packages/contracts/src";

import { supabase } from "@/lib/supabase";
import { saveBookmarks } from "@/storage/bookmark-store";
import {
  loadExamEnrollment,
  saveExamEnrollment,
} from "@/storage/exam-enrollment-store";
import { loadPendingLearningAttempts } from "@/storage/pending-learning-attempt-store";
import { SrsCardMap, updateSrsCards } from "@/storage/srs-store";
import {
  loadLastMergedAttemptAt,
  mergeRemoteAttempts,
} from "@/storage/stats-store";
import { loadLearningSyncOutbox } from "@/sync/learning-sync-outbox";
import { SrsCard } from "@/types/exam";

let hydrationVersion = 0;

// 학습 데이터 병합 사용자 식별자 로드
async function loadHydrationUserId(): Promise<string | null> {
  if (supabase == null) return null;
  const { data, error } = await supabase.auth.getSession();
  if (error != null) throw error;
  return data.session?.user.id ?? null;
}

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

// 진행 중인 서버 학습 상태 병합 무효화
export function invalidateRemoteLearningHydration(): void {
  hydrationVersion += 1;
}

// 서버·로컬 학습 상태 최신값 병합
export async function hydrateRemoteLearningData(
  api: LearningSyncApi,
): Promise<void> {
  const currentHydrationVersion = hydrationVersion;
  const userId = await loadHydrationUserId();
  if (userId == null) return;
  if (
    (await loadLearningSyncOutbox()).length > 0 ||
    (await loadPendingLearningAttempts()).length > 0
  )
    return;
  const attemptsSince = await loadLastMergedAttemptAt();
  const [
    remoteEnrollments,
    remoteProgress,
    remoteBookmarks,
    remoteAttempts,
    localEnrollment,
  ] = await Promise.all([
    api.listMyEnrollments(),
    api.listMyProgress(),
    api.listMyBookmarks(),
    api.listMyAttempts(attemptsSince),
    loadExamEnrollment(),
  ]);
  if (currentHydrationVersion !== hydrationVersion) return;
  if ((await loadHydrationUserId()) !== userId) return;
  if (
    (await loadLearningSyncOutbox()).length > 0 ||
    (await loadPendingLearningAttempts()).length > 0
  )
    return;
  const examIds = remoteEnrollments.map((enrollment) => enrollment.exam_id);
  const bookmarkIds = remoteBookmarks.map((bookmark) => bookmark.question_id);

  await Promise.all([
    saveExamEnrollment({
      examIds,
      onboardingCompleted:
        localEnrollment?.onboardingCompleted === true || examIds.length > 0,
    }),
    updateSrsCards((cards) =>
      remoteProgress.reduce<SrsCardMap>((result, progress) => {
        const remoteCard = toSrsCard(progress);
        const localCard = result[remoteCard.questionId];
        return localCard != null &&
          localCard.lastReviewedAt > remoteCard.lastReviewedAt
          ? result
          : { ...result, [remoteCard.questionId]: remoteCard };
      }, cards),
    ),
    saveBookmarks(bookmarkIds),
    mergeRemoteAttempts(remoteAttempts),
  ]);
}
