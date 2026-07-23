import type { ContentQuestion } from "../../../packages/contracts/src";

import { calculateTextSimilarity, normalizeContentText } from "./normalize";
import type { ContentSource, ValidationIssue } from "./types";

const ALLOWED_LICENSES = new Set([
  "public-domain",
  "cc0",
  "cc-by",
  "cc-by-sa",
  "official-permission",
  "original",
]);

const VOLATILE_PATTERNS = [
  /\b20\d{2}년\b/,
  /현행\s*(법|규정|기준)/,
  /(법률|시행령|고시)\s*제?\d+조/,
  /(금리|세율|요율|기준금액)/,
];

// 문제 필수 필드 검증
function validateRequiredFields(question: ContentQuestion): ValidationIssue[] {
  return [
    ["prompt", question.prompt],
    ["subject", question.subject],
    ["explanation", question.explanation],
  ].flatMap(([field, value]) =>
    value.trim().length === 0
      ? [
          {
            questionId: question.id,
            code: "missing-field" as const,
            severity: "error" as const,
            message: `${field} 값이 비어 있습니다.`,
          },
        ]
      : [],
  );
}

// 문제 보기 구조 검증
function validateChoices(question: ContentQuestion): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (question.choices.length < 2 || question.choices.length > 6)
    issues.push({
      questionId: question.id,
      code: "choice-count",
      severity: "error",
      message: "보기 개수는 2개 이상 6개 이하여야 합니다.",
    });
  if (
    question.answerIndex < 0 ||
    question.answerIndex >= question.choices.length
  )
    issues.push({
      questionId: question.id,
      code: "answer-range",
      severity: "error",
      message: "정답 위치가 보기 범위를 벗어났습니다.",
    });

  const normalizedChoices = question.choices.map(normalizeContentText);
  if (new Set(normalizedChoices).size !== normalizedChoices.length)
    issues.push({
      questionId: question.id,
      code: "duplicate-choice",
      severity: "error",
      message: "내용이 같은 보기가 포함되어 있습니다.",
    });
  return issues;
}

// 문제 해설 근거 검증
function validateExplanation(question: ContentQuestion): ValidationIssue[] {
  const correctChoice = question.choices[question.answerIndex] ?? "";
  return question.explanation.length < 25 ||
    (correctChoice.length > 0 &&
      calculateTextSimilarity(question.explanation, correctChoice) < 0.03)
    ? [
        {
          questionId: question.id,
          code: "weak-explanation",
          severity: "warning",
          message:
            "해설이 정답 근거를 충분히 설명하는지 사람 검수가 필요합니다.",
        },
      ]
    : [];
}

// 변경 가능 정보 검증
function validateVolatileContent(question: ContentQuestion): ValidationIssue[] {
  const content = `${question.prompt} ${question.explanation}`;
  return VOLATILE_PATTERNS.some((pattern) => pattern.test(content))
    ? [
        {
          questionId: question.id,
          code: "volatile-content",
          severity: "warning",
          message: "연도·법령·제도 변경 가능성이 있는 내용입니다.",
        },
      ]
    : [];
}

// 문제 출처 라이선스 검증
function validateLicense(
  question: ContentQuestion,
  source: ContentSource,
): ValidationIssue[] {
  return ALLOWED_LICENSES.has(source.license.toLocaleLowerCase())
    ? []
    : [
        {
          questionId: question.id,
          code: "license-risk",
          severity: "error",
          message: "공개 허용이 확인된 라이선스가 아닙니다.",
        },
      ];
}

// 시험 과목 분류 결과 검증
function validateSubject(
  question: ContentQuestion,
  examSubjects: string[],
): ValidationIssue[] {
  return examSubjects.includes(question.subject)
    ? []
    : [
        {
          questionId: question.id,
          code: "subject-unclassified",
          severity: "error",
          message: "시험 과목으로 분류되지 않아 사람 지정이 필요합니다.",
        },
      ];
}

// 기존 문제 유사도 검증
function validateDuplicateQuestion(
  question: ContentQuestion,
  existingQuestions: ContentQuestion[],
): ValidationIssue[] {
  const duplicate = existingQuestions.find(
    (existing) =>
      existing.id !== question.id &&
      calculateTextSimilarity(existing.prompt, question.prompt) >= 0.82,
  );
  return duplicate == null
    ? []
    : [
        {
          questionId: question.id,
          code: "duplicate-question",
          severity: "error",
          message: `${duplicate.id} 문제와 내용이 매우 유사합니다.`,
        },
      ];
}

// 문제 초안 전체 자동 검증
export function validateQuestionDraft(
  question: ContentQuestion,
  source: ContentSource,
  existingQuestions: ContentQuestion[],
  examSubjects: string[],
): ValidationIssue[] {
  return [
    ...validateRequiredFields(question),
    ...validateChoices(question),
    ...validateExplanation(question),
    ...validateVolatileContent(question),
    ...validateLicense(question, source),
    ...validateSubject(question, examSubjects),
    ...validateDuplicateQuestion(question, existingQuestions),
  ];
}
