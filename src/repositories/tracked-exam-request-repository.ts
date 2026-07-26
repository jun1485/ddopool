import { TABLES, type ExamRequestRow } from "../../packages/contracts/src";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { examPlatformApi } from "@/repositories/exam-platform-api";

interface TrackedExamRequest {
  row: ExamRequestRow;
  hasVoted: boolean;
  isOwned: boolean;
}

type TrackedExamRequestRawRow = ExamRequestRow & {
  requester_id: string | null;
};

const EXAM_REQUEST_FIELDS =
  "id,normalized_name,display_name,organization,grade_level,exam_url,language,note,status,vote_count,published_exam_id,created_at,updated_at,requester_id";

// 본인 작성·공감 시험 요청 목록 조회
export async function listTrackedExamRequests(): Promise<TrackedExamRequest[]> {
  if (!isSupabaseConfigured)
    return (await examPlatformApi.getMyVotedRequests()).map((row) => ({
      row,
      hasVoted: true,
      isOwned: true,
    }));
  if (supabase == null) throw new Error("계정 서버가 연결되지 않았습니다.");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError != null || user == null)
    throw new Error("로그인이 필요합니다.");

  const voteResult = await supabase
    .from(TABLES.examRequestVotes)
    .select("request_id")
    .eq("voter_id", user.id)
    .returns<{ request_id: string }[]>();
  if (voteResult.error != null) throw voteResult.error;
  const votedRequestIds = (voteResult.data ?? []).map(
    (vote) => vote.request_id,
  );
  const query = supabase
    .from(TABLES.examRequests)
    .select(EXAM_REQUEST_FIELDS)
    .order("updated_at", { ascending: false });
  const requestResult =
    votedRequestIds.length > 0
      ? await query
          .or(`requester_id.eq.${user.id},id.in.(${votedRequestIds.join(",")})`)
          .returns<TrackedExamRequestRawRow[]>()
      : await query
          .eq("requester_id", user.id)
          .returns<TrackedExamRequestRawRow[]>();
  if (requestResult.error != null) throw requestResult.error;

  const votedRequestIdSet = new Set(votedRequestIds);
  return (requestResult.data ?? []).map(
    ({ requester_id: requesterId, ...row }) => ({
      row,
      hasVoted: votedRequestIdSet.has(row.id),
      isOwned: requesterId === user.id,
    }),
  );
}
