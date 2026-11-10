import "react-native-url-polyfill/auto";
import "./install-local-storage";
import "./install-neon-polyfills";

import { createClient } from "@neon/neon-js/supabase";
import Constants from "expo-constants";
import { Platform } from "react-native";

const authUrl = process.env.EXPO_PUBLIC_NEON_AUTH_URL;
const dataApiUrl = process.env.EXPO_PUBLIC_NEON_DATA_API_URL;
const siteUrl = process.env.EXPO_PUBLIC_SITE_URL || "http://localhost:8081";

export const isSupabaseConfigured =
  authUrl != null &&
  authUrl.length > 0 &&
  dataApiUrl != null &&
  dataApiUrl.length > 0;

if (Constants.expoConfig?.extra?.releaseMode === true && !isSupabaseConfigured)
  throw new Error("출시 서버 설정이 누락됐습니다.");

// 인증 메일 링크 복귀 주소
export const authWebCallbackUrl = `${
  Platform.OS === "web" && typeof location !== "undefined"
    ? location.origin
    : siteUrl
}/auth/callback`;

// Neon 클라이언트 조건부 생성
function createSupabaseClient() {
  if (
    !isSupabaseConfigured ||
    authUrl == null ||
    dataApiUrl == null ||
    typeof localStorage === "undefined"
  )
    return null;
  return createClient({
    auth: {
      url: authUrl,
      allowAnonymous: true,
      // 네이티브 인증 요청 Origin 보강
      fetchOptions:
        Platform.OS === "web" ? undefined : { headers: { origin: siteUrl } },
    },
    dataApi: { url: dataApiUrl },
  });
}

export const supabase = createSupabaseClient();
