import type { ContentBundle } from "../../../packages/contracts/src";

// 콘텐츠 업로드 번들 JSON 직렬화
export function serializeContentBundle(bundle: ContentBundle): string {
  return `${JSON.stringify(bundle, null, 2)}\n`;
}
