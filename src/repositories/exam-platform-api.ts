import type { ExamPlatformApi } from "../../packages/contracts/src";

import type { MockExamPlatformApi as MockApi } from "@/repositories/mock-exam-platform-api";
import { SupabaseExamPlatformApi } from "@/repositories/supabase-exam-platform-api";

// 운영 빌드에서 로컬 시드 문항 번들 제외용 mock 지연 로드
function createMockExamPlatformApi(): ExamPlatformApi {
  const { MockExamPlatformApi }: { MockExamPlatformApi: typeof MockApi } =
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@/repositories/mock-exam-platform-api");
  return new MockExamPlatformApi();
}

// 앱 전역 시험 플랫폼 API 구현체
export const examPlatformApi: ExamPlatformApi =
  process.env.EXPO_PUBLIC_SUPABASE_URL &&
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    ? new SupabaseExamPlatformApi()
    : createMockExamPlatformApi();
