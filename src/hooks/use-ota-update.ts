import * as Updates from "expo-updates";
import { useEffect, useRef } from "react";
import { AppState } from "react-native";

import { useRefresh } from "@/providers/refresh-provider";

// 앱으로 돌아올 때 새 버전 확인 간격
const CHECK_EVERY_MS = 30 * 60 * 1000;
// 당겨서 새로고침할 때 새 버전 확인 최소 간격
const REFRESH_CHECK_MS = 10 * 1000;
// 앱 복귀 직후 화면 이동이 끝나기를 기다리는 시간
const RESUME_SETTLE_MS = 1500;

// 새 버전이 있으면 받아 두기, 받은 뒤 업데이트 안내 창이 뜸
function fetchNewUpdate() {
  Updates.checkForUpdateAsync()
    .then((result) => (result.isAvailable ? Updates.fetchUpdateAsync() : null))
    .catch((error: Error) =>
      console.warn(`업데이트 확인 실패: ${error.message}`),
    );
}

// 받아 둔 새 코드는 앱 복귀 때 적용, 복귀·당겨서 새로고침 때 새 버전 확인
export function useOtaUpdate() {
  const { isUpdatePending } = Updates.useUpdates();
  const { refreshKey } = useRefresh();
  const pending = useRef(false);
  // 마지막으로 새 버전을 확인한 시각
  const lastCheck = useRef(0);

  useEffect(() => {
    pending.current = isUpdatePending;
  }, [isUpdatePending]);

  // 당겨서 새로고침할 때 새 버전 확인
  useEffect(() => {
    if (
      refreshKey === 0 ||
      !Updates.isEnabled ||
      pending.current ||
      Date.now() - lastCheck.current < REFRESH_CHECK_MS
    )
      return;
    lastCheck.current = Date.now();
    fetchNewUpdate();
  }, [refreshKey]);

  useEffect(() => {
    if (!Updates.isEnabled) return;
    lastCheck.current = Date.now();
    const subscription = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      // 받아 둔 새 코드가 있으면 복귀 때 적용
      if (pending.current) {
        setTimeout(() => {
          if (AppState.currentState !== "active") return;
          Updates.reloadAsync().catch((error: Error) =>
            console.warn(`업데이트 적용 실패: ${error.message}`),
          );
        }, RESUME_SETTLE_MS);
        return;
      }
      if (Date.now() - lastCheck.current < CHECK_EVERY_MS) return;
      lastCheck.current = Date.now();
      fetchNewUpdate();
    });
    return () => subscription.remove();
  }, []);
}
