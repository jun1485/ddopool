import { useExamEnrollmentContext } from "@/providers/exam-enrollment-provider";

// 내 시험 등록 상태 연결
export function useExamEnrollment() {
  return useExamEnrollmentContext();
}
