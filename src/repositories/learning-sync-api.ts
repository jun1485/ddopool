import type { LearningSyncApi } from "../../packages/contracts/src";

import { isSupabaseConfigured } from "@/lib/supabase";
import { SupabaseLearningSyncApi } from "@/repositories/supabase-learning-sync-api";

// 계정 연결 학습 동기화 API 구현체
export const learningSyncApi: LearningSyncApi | null = isSupabaseConfigured
  ? new SupabaseLearningSyncApi()
  : null;
