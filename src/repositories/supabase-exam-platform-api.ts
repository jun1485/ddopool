import type {
  ExamPlatformApi,
  ExamRequestRow,
  ExamRequestStatusHistoryRow,
  ExamRow,
  ExamSubjectRow,
  NotificationRow,
  QuestionRow,
  RemoteExam,
  RemoteQuestion,
  RequestExamInput,
} from "../../packages/contracts/src";
import {
  RPC,
  TABLES,
  toRemoteExam,
  toRemoteQuestion,
  toRequestExamParams,
} from "../../packages/contracts/src";

import { supabase } from "@/lib/supabase";

// 설정된 Supabase 클라이언트 제공
function getSupabaseClient() {
  if (supabase == null) throw new Error("Supabase 프로젝트 설정이 필요합니다.");
  return supabase;
}

// 현재 인증 사용자 식별자 조회
async function getCurrentUserId(): Promise<string> {
  const client = getSupabaseClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error != null || user == null) throw new Error("로그인이 필요합니다.");
  return user.id;
}

// Supabase 시험 플랫폼 API 구현체
export class SupabaseExamPlatformApi implements ExamPlatformApi {
  // 공개 시험 목록 조회
  async listActiveExams(): Promise<RemoteExam[]> {
    const client = getSupabaseClient();
    const [examResult, subjectResult] = await Promise.all([
      client
        .from(TABLES.exams)
        .select("id,title,short_title,description,icon,status,published_at")
        .eq("status", "active")
        .returns<ExamRow[]>(),
      client
        .from(TABLES.examSubjects)
        .select("id,exam_id,name,sort_order")
        .returns<ExamSubjectRow[]>(),
    ]);
    if (examResult.error != null) throw examResult.error;
    if (subjectResult.error != null) throw subjectResult.error;
    return (examResult.data ?? []).map((exam) =>
      toRemoteExam(exam, subjectResult.data ?? []),
    );
  }

  // 시험별 공개 문제 목록 조회
  async listPublishedQuestions(examId: string): Promise<RemoteQuestion[]> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.questions)
      .select(
        "id,exam_id,subject,prompt,choices,answer_index,explanation,difficulty,status",
      )
      .eq("exam_id", examId)
      .eq("status", "published")
      .returns<QuestionRow[]>();
    if (error != null) throw error;
    return (data ?? []).map(toRemoteQuestion);
  }

  // 시험 요청 검색
  async searchExamRequests(keyword: string): Promise<ExamRequestRow[]> {
    const client = getSupabaseClient();
    const displayQuery = keyword.trim().replaceAll(/[^0-9a-z가-힣\s]/gi, "");
    const normalizedQuery = displayQuery.replaceAll(/\s/g, "");
    if (normalizedQuery.length < 2) return [];
    const { data, error } = await client
      .from(TABLES.examRequests)
      .select(
        "id,normalized_name,display_name,organization,grade_level,exam_url,language,note,status,vote_count,published_exam_id,created_at,updated_at",
      )
      .or(
        `display_name.ilike.%${displayQuery}%,normalized_name.ilike.%${normalizedQuery}%`,
      )
      .returns<ExamRequestRow[]>();
    if (error != null) throw error;
    return data ?? [];
  }

  // 시험 요청 등록 또는 기존 요청 투표
  async requestExam(input: RequestExamInput): Promise<ExamRequestRow> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .rpc(RPC.requestExam, toRequestExamParams(input))
      .returns<ExamRequestRow[]>()
      .single();
    if (error != null) throw error;
    if (data == null) throw new Error("시험 요청 결과가 없습니다.");
    return data;
  }

  // 기존 시험 요청 투표
  async voteExamRequest(requestId: string): Promise<void> {
    const client = getSupabaseClient();
    const userId = await getCurrentUserId();
    const { error } = await client
      .from(TABLES.examRequestVotes)
      .upsert({ request_id: requestId, voter_id: userId });
    if (error != null) throw error;
  }

  // 기존 시험 요청 투표 취소
  async cancelExamRequestVote(requestId: string): Promise<void> {
    const client = getSupabaseClient();
    const userId = await getCurrentUserId();
    const { error } = await client
      .from(TABLES.examRequestVotes)
      .delete()
      .eq("request_id", requestId)
      .eq("voter_id", userId);
    if (error != null) throw error;
  }

  // 내가 투표한 시험 요청 목록 조회
  async getMyVotedRequests(): Promise<ExamRequestRow[]> {
    const client = getSupabaseClient();
    const userId = await getCurrentUserId();
    const voteResult = await client
      .from(TABLES.examRequestVotes)
      .select("request_id")
      .eq("voter_id", userId)
      .returns<{ request_id: string }[]>();
    if (voteResult.error != null) throw voteResult.error;
    const requestIds = (voteResult.data ?? []).map((vote) => vote.request_id);
    if (requestIds.length === 0) return [];
    const { data, error } = await client
      .from(TABLES.examRequests)
      .select(
        "id,normalized_name,display_name,organization,grade_level,exam_url,language,note,status,vote_count,published_exam_id,created_at,updated_at",
      )
      .in("id", requestIds)
      .order("updated_at", { ascending: false })
      .returns<ExamRequestRow[]>();
    if (error != null) throw error;
    return data ?? [];
  }

  // 시험 요청 상태 타임라인 조회
  async getRequestStatusHistory(
    requestId: string,
  ): Promise<ExamRequestStatusHistoryRow[]> {
    const client = getSupabaseClient();
    const { data, error } = await client
      .from(TABLES.examRequestStatusHistory)
      .select("id,request_id,from_status,to_status,note,created_at")
      .eq("request_id", requestId)
      .order("created_at", { ascending: true })
      .returns<ExamRequestStatusHistoryRow[]>();
    if (error != null) throw error;
    return data ?? [];
  }

  // 내 알림 목록 조회
  async listMyNotifications(): Promise<NotificationRow[]> {
    const client = getSupabaseClient();
    const userId = await getCurrentUserId();
    const { data, error } = await client
      .from(TABLES.notifications)
      .select("id,user_id,type,payload,read_at,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .returns<NotificationRow[]>();
    if (error != null) throw error;
    return data ?? [];
  }

  // 알림 읽음 처리
  async markNotificationRead(notificationId: number): Promise<void> {
    const client = getSupabaseClient();
    const userId = await getCurrentUserId();
    const { error } = await client
      .from(TABLES.notifications)
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("user_id", userId);
    if (error != null) throw error;
  }

  // 문제 오류 신고
  async reportQuestion(questionId: string, reason: string): Promise<void> {
    const client = getSupabaseClient();
    const userId = await getCurrentUserId();
    const { error } = await client.from(TABLES.questionReports).insert({
      question_id: questionId,
      reporter_id: userId,
      reason,
    });
    if (error != null) throw error;
  }
}
