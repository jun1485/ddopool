import { Platform, Share } from "react-native";

import { SITE_URL } from "@/constants/site";

export type ShareOutcome = "shared" | "copied" | "cancelled";

interface ResultShareInput {
  examId: string;
  examTitle?: string;
  correctCount: number;
  totalCount: number;
}

// 학습 결과 공유 문구 생성
export function buildResultShareMessage({
  examId,
  examTitle,
  correctCount,
  totalCount,
}: ResultShareInput): string {
  const accuracy = Math.round((correctCount / Math.max(totalCount, 1)) * 100);
  const link = examId === "all" ? SITE_URL : `${SITE_URL}/exams/${examId}`;
  const title = examTitle ? `${examTitle} ` : "";
  return `또풀에서 ${title}${totalCount}문제 중 ${correctCount}문제를 맞혔어요 (정답률 ${accuracy}%)\n같이 풀어 보기 ${link}`;
}

// 학습 결과 공유 시트 열기, 공유 시트가 없는 웹은 문구 복사
export async function shareResultMessage(
  message: string,
): Promise<ShareOutcome> {
  try {
    if (Platform.OS !== "web") {
      const result = await Share.share({ message });
      return result.action === Share.dismissedAction ? "cancelled" : "shared";
    }
    if (typeof navigator.share === "function") {
      await navigator.share({ text: message });
      return "shared";
    }
    await navigator.clipboard.writeText(message);
    return "copied";
  } catch {
    return "cancelled";
  }
}
