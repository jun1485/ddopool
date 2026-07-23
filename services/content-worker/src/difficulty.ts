import type { ContentQuestion } from "../../../packages/contracts/src";

// 문제 문장 구조 기반 난이도 태깅
export function estimateQuestionDifficulty(question: ContentQuestion): number {
  const promptScore =
    question.prompt.length >= 120 ? 2 : question.prompt.length >= 70 ? 1 : 0;
  const choiceScore = question.choices.some((choice) => choice.length >= 55)
    ? 1
    : 0;
  const explanationScore = question.explanation.length >= 180 ? 1 : 0;
  return Math.min(1 + promptScore + choiceScore + explanationScore, 5);
}
