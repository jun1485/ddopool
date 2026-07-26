import { examPlatformApi } from "@/repositories/exam-platform-api";

// 인증 사용자 계정 전체 삭제
export async function deleteMyAccount(): Promise<void> {
  await examPlatformApi.deleteMyAccount();
}
