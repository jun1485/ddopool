import "react-native-url-polyfill/auto";
import "expo-sqlite/localStorage/install";

import { createClient, processLock } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured =
  supabaseUrl != null &&
  supabaseUrl.length > 0 &&
  supabasePublishableKey != null &&
  supabasePublishableKey.length > 0;

// Supabase 클라이언트 조건부 생성
function createSupabaseClient() {
  if (
    !isSupabaseConfigured ||
    supabaseUrl == null ||
    supabasePublishableKey == null
  )
    return null;
  return createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      storage: localStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      lock: processLock,
    },
  });
}

export const supabase = createSupabaseClient();

// 앱 활성 상태 기준 인증 토큰 갱신
if (Platform.OS !== "web" && supabase != null) {
  AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
