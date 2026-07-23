import { useExamRequestContext } from "@/providers/exam-request-provider";

// 시험 요청 상태 연결
export function useExamRequests() {
  return useExamRequestContext();
}
