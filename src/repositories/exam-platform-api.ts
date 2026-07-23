import type { ExamPlatformApi } from "../../packages/contracts/src";

import { isSupabaseConfigured } from "@/lib/supabase";
import { MockExamPlatformApi } from "@/repositories/mock-exam-platform-api";
import { SupabaseExamPlatformApi } from "@/repositories/supabase-exam-platform-api";

// 앱 전역 시험 플랫폼 API 구현체
export const examPlatformApi: ExamPlatformApi = isSupabaseConfigured
  ? new SupabaseExamPlatformApi()
  : new MockExamPlatformApi();
