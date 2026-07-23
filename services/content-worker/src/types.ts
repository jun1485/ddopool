import type {
  ContentBundle,
  ContentExam,
  ContentQuestion,
  QuestionSourceType,
} from "../../../packages/contracts/src";

// 콘텐츠 원문 메타데이터
export interface ContentSource {
  id: string;
  name: string;
  url: string;
  license: string;
  sourceType: QuestionSourceType;
  collectedAt: string;
  examVersion: string;
}

// 원문 입력 형식
export type SourceDocumentFormat =
  "plain-text" | "html" | "csv" | "extracted-pdf-text";

// 수집 원문 입력
export interface SourceDocumentInput {
  sourceId: string;
  format: SourceDocumentFormat;
  content: string;
}

// 원문 구간
export interface ParsedSourceSection {
  id: string;
  title: string;
  content: string;
}

// 정규화 원문 결과
export interface ParsedSourceDocument {
  sourceId: string;
  plainText: string;
  sections: ParsedSourceSection[];
  warnings: string[];
}

// 시험 과목 분류 기준
export interface SubjectProfile {
  name: string;
  keywords: string[];
}

// 문제 과목 분류 근거
export interface SubjectClassification {
  subject: string;
  confidence: number;
  matchedKeywords: string[];
}

// 문제 검증 심각도
export type ValidationSeverity = "warning" | "error";

// 문제 검증 결과 항목
export interface ValidationIssue {
  questionId: string;
  code:
    | "missing-field"
    | "choice-count"
    | "answer-range"
    | "duplicate-choice"
    | "weak-explanation"
    | "volatile-content"
    | "duplicate-question"
    | "license-risk"
    | "subject-unclassified";
  severity: ValidationSeverity;
  message: string;
}

// 문제 검증 근거
export interface QuestionEvidence {
  questionId: string;
  sourceId: string;
  sourceUrl: string;
  license: string;
  examVersion: string;
  difficulty: number;
  subjectClassification: SubjectClassification | null;
  requiresHumanReview: true;
  issues: ValidationIssue[];
}

// 콘텐츠 worker 입력
export interface ContentWorkerInput {
  exam: ContentExam;
  source: ContentSource;
  drafts: ContentQuestion[];
  existingQuestions: ContentQuestion[];
  subjectProfiles?: SubjectProfile[];
}

// 콘텐츠 worker 결과
export interface ContentWorkerResult {
  bundle: ContentBundle;
  reviewQueue: ContentQuestion[];
  rejected: ContentQuestion[];
  evidence: QuestionEvidence[];
  summary: {
    received: number;
    reviewRequired: number;
    rejected: number;
  };
}

// AI 문제 초안 생성 요청
export interface DraftGenerationRequest {
  exam: ContentExam;
  source: ContentSource;
  sourceText: string;
  count: number;
}

// AI 문제 초안 생성기
export interface QuestionDraftGenerator {
  generate: (
    systemPrompt: string,
    userPrompt: string,
  ) => Promise<ContentQuestion[]>;
}
