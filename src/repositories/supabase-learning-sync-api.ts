import type {
  LearningSyncApi,
  QuestionAttemptRow,
  RecordAttemptInput,
  UpsertProgressInput,
  UserBookmarkRow,
  UserExamEnrollmentRow,
  UserQuestionProgressRow,
} from "../../packages/contracts/src";
import type { PostgrestError } from "@supabase/supabase-js";
import {
  TABLES,
  toQuestionAttemptInsert,
  toUserQuestionProgressUpsert,
} from "../../packages/contracts/src";

import { supabase } from "@/lib/supabase";
import { PermanentLearningSyncError } from "@/sync/learning-sync-error";

const PAGE_SIZE = 1_000;

// 설정된 학습 동기화 클라이언트 제공
function getSyncClient() {
  if (supabase == null) throw new Error("Supabase 프로젝트 설정이 필요합니다.");
  return supabase;
}

// 학습 동기화 사용자 식별자 조회
async function getSyncUserId(): Promise<string> {
  const client = getSyncClient();
  const {
    data: { session },
    error,
  } = await client.auth.getSession();
  if (error != null || session == null) throw new Error("로그인이 필요합니다.");
  return session.user.id;
}

// 영구 저장 오류 분류
function throwMutationError(error: PostgrestError, status: number): never {
  if (
    /^(22|23)/.test(error.code) ||
    error.code === "42501" ||
    (status >= 400 && status < 500)
  )
    throw new PermanentLearningSyncError(error.code, error.message);
  throw error;
}

// Supabase 학습 동기화 API 구현체
export class SupabaseLearningSyncApi implements LearningSyncApi {
  // 내 시험 등록
  async enrollExam(examId: string): Promise<void> {
    const client = getSyncClient();
    const userId = await getSyncUserId();
    const { error, status } = await client
      .from(TABLES.userExamEnrollments)
      .upsert({ user_id: userId, exam_id: examId });
    if (error != null) throwMutationError(error, status);
  }

  // 내 시험 해제
  async unenrollExam(examId: string): Promise<void> {
    const client = getSyncClient();
    const userId = await getSyncUserId();
    const { error, status } = await client
      .from(TABLES.userExamEnrollments)
      .delete()
      .eq("user_id", userId)
      .eq("exam_id", examId);
    if (error != null) throwMutationError(error, status);
  }

  // 내 시험 목록 조회
  async listMyEnrollments(): Promise<UserExamEnrollmentRow[]> {
    const client = getSyncClient();
    const userId = await getSyncUserId();
    const { data, error } = await client
      .from(TABLES.userExamEnrollments)
      .select("user_id,exam_id,enrolled_at")
      .eq("user_id", userId)
      .returns<UserExamEnrollmentRow[]>();
    if (error != null) throw error;
    return data ?? [];
  }

  // 풀이 이력 적재
  async recordAttempt(input: RecordAttemptInput): Promise<void> {
    const client = getSyncClient();
    const userId = await getSyncUserId();
    const { error, status } = await client
      .from(TABLES.questionAttempts)
      .upsert(toQuestionAttemptInsert(input, userId), {
        onConflict: "user_id,client_attempt_id",
        ignoreDuplicates: true,
      });
    if (error != null) throwMutationError(error, status);
  }

  // SRS 진행 상태 일괄 저장
  async upsertProgress(items: UpsertProgressInput[]): Promise<void> {
    if (items.length === 0) return;
    const client = getSyncClient();
    const userId = await getSyncUserId();
    const { error, status } = await client
      .from(TABLES.userQuestionProgress)
      .upsert(items.map((item) => toUserQuestionProgressUpsert(item, userId)));
    if (error != null) throwMutationError(error, status);
  }

  // SRS 진행 상태 조회
  async listMyProgress(examId?: string): Promise<UserQuestionProgressRow[]> {
    const client = getSyncClient();
    const userId = await getSyncUserId();
    const rows: UserQuestionProgressRow[] = [];

    for (let from = 0; ; from += PAGE_SIZE) {
      let query = client
        .from(TABLES.userQuestionProgress)
        .select(
          "user_id,question_id,exam_id,repetitions,ease_factor,interval_days,due_at,last_reviewed_at",
        )
        .eq("user_id", userId)
        .order("question_id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (examId != null) query = query.eq("exam_id", examId);
      const { data, error } = await query.returns<UserQuestionProgressRow[]>();
      if (error != null) throw error;
      const page = data ?? [];
      rows.push(...page);
      if (page.length < PAGE_SIZE) return rows;
    }
  }

  // 풀이 이력 조회
  async listMyAttempts(sinceIso?: string): Promise<QuestionAttemptRow[]> {
    const client = getSyncClient();
    const userId = await getSyncUserId();
    const rows: QuestionAttemptRow[] = [];

    for (let from = 0; ; from += PAGE_SIZE) {
      let query = client
        .from(TABLES.questionAttempts)
        .select(
          "id,user_id,question_id,exam_id,subject,selected_index,is_correct,mode,answered_at,client_attempt_id",
        )
        .eq("user_id", userId)
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);
      if (sinceIso != null) query = query.gte("answered_at", sinceIso);
      const { data, error } = await query.returns<QuestionAttemptRow[]>();
      if (error != null) throw error;
      const page = data ?? [];
      rows.push(...page);
      if (page.length < PAGE_SIZE) return rows;
    }
  }

  // 문제 북마크 추가
  async addBookmark(questionId: string): Promise<void> {
    const client = getSyncClient();
    const userId = await getSyncUserId();
    const { error, status } = await client
      .from(TABLES.userBookmarks)
      .upsert({ user_id: userId, question_id: questionId });
    if (error != null) throwMutationError(error, status);
  }

  // 문제 북마크 제거
  async removeBookmark(questionId: string): Promise<void> {
    const client = getSyncClient();
    const userId = await getSyncUserId();
    const { error, status } = await client
      .from(TABLES.userBookmarks)
      .delete()
      .eq("user_id", userId)
      .eq("question_id", questionId);
    if (error != null) throwMutationError(error, status);
  }

  // 내 북마크 조회
  async listMyBookmarks(): Promise<UserBookmarkRow[]> {
    const client = getSyncClient();
    const userId = await getSyncUserId();
    const rows: UserBookmarkRow[] = [];

    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await client
        .from(TABLES.userBookmarks)
        .select("user_id,question_id,created_at")
        .eq("user_id", userId)
        .order("question_id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1)
        .returns<UserBookmarkRow[]>();
      if (error != null) throw error;
      const page = data ?? [];
      rows.push(...page);
      if (page.length < PAGE_SIZE) return rows;
    }
  }
}
