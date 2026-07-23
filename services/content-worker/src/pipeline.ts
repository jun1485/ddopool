import type { ContentQuestion } from "../../../packages/contracts/src";

import { classifyQuestionSubject } from "./classify-subject";
import { estimateQuestionDifficulty } from "./difficulty";
import type {
  ContentWorkerInput,
  ContentWorkerResult,
  QuestionEvidence,
  SubjectClassification,
} from "./types";
import { validateQuestionDraft } from "./validate-question";

// 문제 초안 난이도 보정
function applyDifficulty(question: ContentQuestion): ContentQuestion {
  return {
    ...question,
    difficulty: question.difficulty ?? estimateQuestionDifficulty(question),
    sourceType: question.sourceType ?? "ai_generated",
  };
}

// 문제 과목 자동 분류 반영
function applySubjectClassification(
  question: ContentQuestion,
  classification: SubjectClassification | null,
): ContentQuestion {
  return classification == null
    ? question
    : { ...question, subject: classification.subject };
}

// 콘텐츠 초안 자동 검증·사람 검수 대기열 분류
export function processContentDrafts(
  input: ContentWorkerInput,
): ContentWorkerResult {
  const reviewQueue: ContentQuestion[] = [];
  const rejected: ContentQuestion[] = [];
  const evidence: QuestionEvidence[] = [];
  const comparisonPool = [...input.existingQuestions];

  input.drafts.forEach((draft) => {
    const subjectClassification = classifyQuestionSubject(
      draft,
      input.exam,
      input.subjectProfiles,
    );
    const question = applySubjectClassification(
      applyDifficulty(draft),
      subjectClassification,
    );
    const issues = validateQuestionDraft(
      question,
      input.source,
      comparisonPool,
      input.exam.subjects,
    );
    const hasError = issues.some((issue) => issue.severity === "error");
    if (hasError) rejected.push(question);
    else {
      reviewQueue.push(question);
      comparisonPool.push(question);
    }
    evidence.push({
      questionId: question.id,
      sourceId: input.source.id,
      sourceUrl: input.source.url,
      license: input.source.license,
      examVersion: input.source.examVersion,
      difficulty: question.difficulty ?? estimateQuestionDifficulty(question),
      subjectClassification,
      requiresHumanReview: true,
      issues,
    });
  });

  return {
    bundle: {
      exams: [input.exam],
      questions: reviewQueue,
    },
    reviewQueue,
    rejected,
    evidence,
    summary: {
      received: input.drafts.length,
      reviewRequired: reviewQueue.length,
      rejected: rejected.length,
    },
  };
}
