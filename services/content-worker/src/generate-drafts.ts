import {
  createQuestionDraftSystemPrompt,
  createQuestionDraftUserPrompt,
} from "./prompts";
import type { DraftGenerationRequest, QuestionDraftGenerator } from "./types";

// AI 공급자 기반 문제 초안 생성
export async function generateQuestionDrafts(
  request: DraftGenerationRequest,
  generator: QuestionDraftGenerator,
) {
  return generator.generate(
    createQuestionDraftSystemPrompt(),
    createQuestionDraftUserPrompt(request),
  );
}
