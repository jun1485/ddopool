import type { SrsReviewQuality } from "@/srs/sm2";

export type AnswerConfidence = "confident" | "unsure" | "forgot";

// 정오답·확신도 기반 SRS 품질 점수 산출
export function getConfidenceReviewQuality(
  isCorrect: boolean,
  confidence: AnswerConfidence,
): SrsReviewQuality {
  if (!isCorrect)
    return confidence === "confident"
      ? 2
      : confidence === "unsure"
        ? 1
        : 0;
  if (confidence === "confident") return 5;
  return confidence === "unsure" ? 3 : 2;
}
