import { examPlatformApi } from "@/repositories/exam-platform-api";

// 시험 요청 신고 접수
export async function reportExamRequest(
  requestId: string,
  reason: string,
): Promise<void> {
  await examPlatformApi.reportExamRequest(requestId, reason);
}
