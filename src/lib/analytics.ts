import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { Platform } from "react-native";

import { RPC } from "../../packages/contracts/src";

import { supabase } from "@/lib/supabase";

export type AppEventName =
  | "app_open"
  | "onboarding_finish"
  | "quiz_start"
  | "quiz_finish"
  | "share_result"
  | "review_prompt";

interface AppEventProps {
  examId?: string;
  value?: number;
  detail?: string;
}

const INSTALL_ID_KEY = "ddopool:install-id:v1";
let installIdPromise: Promise<string> | null = null;

// 익명 설치 ID 조회, 없으면 생성 후 저장
function loadInstallId(): Promise<string> {
  installIdPromise ??= AsyncStorage.getItem(INSTALL_ID_KEY).then(
    async (saved) => {
      if (saved != null) return saved;
      const created = [0, 1, 2]
        .map(() => Math.random().toString(36).slice(2, 10))
        .join("");
      await AsyncStorage.setItem(INSTALL_ID_KEY, created);
      return created;
    },
  );
  return installIdPromise;
}

// 앱 사용 이벤트 기록, 실패해도 학습 흐름에 영향 없음
export function trackEvent(name: AppEventName, props: AppEventProps = {}) {
  const client = supabase;
  if (client == null || __DEV__) return;
  loadInstallId()
    .then((installId) =>
      client.rpc(RPC.recordAppEvent, {
        p_install_id: installId,
        p_name: name,
        p_exam_id: props.examId ?? null,
        p_value: props.value ?? null,
        p_detail: props.detail ?? null,
        p_platform: Platform.OS,
        p_app_version: Constants.expoConfig?.version ?? null,
      }),
    )
    .then(
      () => undefined,
      () => undefined,
    );
}
