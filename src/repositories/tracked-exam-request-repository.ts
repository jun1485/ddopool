import {
  RPC,
  toRpcRows,
  type ExamRequestRow,
} from "../../packages/contracts/src";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { examPlatformApi } from "@/repositories/exam-platform-api";

interface TrackedExamRequest {
  row: ExamRequestRow;
  hasVoted: boolean;
  isOwned: boolean;
}

type TrackedExamRequestRawRow = ExamRequestRow & {
  is_owned: boolean;
  has_voted: boolean;
};

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

  const { data, error } = await supabase
    .rpc(RPC.listTrackedExamRequests)
    .select<"*", TrackedExamRequestRawRow>("*");
  if (error != null) throw error;
  return toRpcRows(data).map(
    ({ is_owned: isOwned, has_voted: hasVoted, ...row }) => ({
      row,
      hasVoted,
      isOwned,
    }),
  );
}
