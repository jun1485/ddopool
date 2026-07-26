import type { PushPlatform } from "../../packages/contracts/src";

import { examPlatformApi } from "@/repositories/exam-platform-api";

export type PushTokenPlatform = PushPlatform;

// 기기 푸시 토큰 등록
export async function registerPushToken(
  token: string,
  platform: PushTokenPlatform,
): Promise<void> {
  await examPlatformApi.registerPushToken(token, platform);
}
