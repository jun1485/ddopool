import { router } from "expo-router";

// 이전 화면이 없으면 학습 홈으로 대체 이동
export function goBack(): void {
  if (router.canGoBack()) {
    router.back();
    return;
  }
  router.replace("/");
}
