import AsyncStorage from "@react-native-async-storage/async-storage";
import { requireOptionalNativeModule } from "expo";
import { z } from "zod";

import {
  countFinishedSession,
  INITIAL_REVIEW_PROMPT_STATE,
  type ReviewPromptState,
  shouldRequestReview,
} from "@/learning/review-prompt-policy";
import { trackEvent } from "@/lib/analytics";

type StoreReviewModule = typeof import("expo-store-review");

const REVIEW_PROMPT_KEY = "ddopool:review-prompt:v1";

// 스토어 리뷰 모듈 로드, 모듈이 없는 빌드는 리뷰 요청 생략
const storeReview: StoreReviewModule | null =
  requireOptionalNativeModule("ExpoStoreReview") == null
    ? null
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("expo-store-review");

const stateSchema = z.object({
  finishedSessions: z.number().int().min(0),
  lastPromptAt: z.number().nullable(),
});

// 저장된 리뷰 요청 기록 로드
async function loadState(): Promise<ReviewPromptState> {
  const raw = await AsyncStorage.getItem(REVIEW_PROMPT_KEY);
  const parsed = raw == null ? null : stateSchema.safeParse(JSON.parse(raw));
  return parsed?.success ? parsed.data : INITIAL_REVIEW_PROMPT_STATE;
}

// 학습 완료 기록 후 조건이 맞으면 스토어 리뷰 요청
export async function recordFinishedSession(
  examId: string,
  accuracy: number,
  totalCount: number,
): Promise<void> {
  try {
    const counted = countFinishedSession(await loadState(), totalCount);
    const now = Date.now();
    const canRequest =
      storeReview != null &&
      shouldRequestReview(counted, accuracy, now) &&
      (await storeReview.hasAction());
    const next = canRequest ? { ...counted, lastPromptAt: now } : counted;
    await AsyncStorage.setItem(REVIEW_PROMPT_KEY, JSON.stringify(next));
    if (!canRequest || storeReview == null) return;
    // 표시 여부는 스토어가 정하므로 요청 사실만 기록
    trackEvent("review_prompt", { examId, value: accuracy });
    await storeReview.requestReview();
  } catch {
    // 리뷰 요청 실패는 학습 결과 화면에 영향 없음
  }
}
