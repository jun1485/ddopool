import type { DraftGenerationRequest } from "./types";

// 문제 초안 생성 시스템 프롬프트 구성
export function createQuestionDraftSystemPrompt(): string {
  return [
    "역할: 시험 문제 초안 작성 보조자",
    "공식 출제 기준과 제공된 원문 범위만 사용한다.",
    "원문 문제를 그대로 복제하지 않고 같은 개념의 새로운 문제를 작성한다.",
    "정답은 반드시 하나만 성립해야 한다.",
    "오답 보기는 그럴듯하지만 명확히 틀려야 한다.",
    "해설에는 정답 근거와 오답이 틀린 이유를 포함한다.",
    "날짜·법령·요율처럼 바뀔 수 있는 정보는 원문 기준 시점을 명시한다.",
    "추측한 사실이나 원문에 없는 수치를 만들지 않는다.",
    "사람 검수 전 공개 가능한 상태라고 판단하지 않는다.",
    "출력은 JSON 배열만 사용한다.",
  ].join("\n");
}

// 문제 초안 생성 사용자 프롬프트 구성
export function createQuestionDraftUserPrompt(
  request: DraftGenerationRequest,
): string {
  return JSON.stringify(
    {
      task: "multiple_choice_question_drafts",
      exam: request.exam,
      source: {
        name: request.source.name,
        url: request.source.url,
        license: request.source.license,
        examVersion: request.source.examVersion,
      },
      count: request.count,
      sourceText: request.sourceText,
      outputSchema: {
        id: "string",
        examId: request.exam.id,
        subject: "string",
        prompt: "string",
        choices: ["string"],
        answerIndex: "zero-based integer",
        explanation: "string",
        difficulty: "integer 1-5",
        sourceType: "ai_generated",
      },
    },
    null,
    2,
  );
}
