// 시험 식별자
export type ExamId = string;

// 퀴즈 진행 모드
export type QuizMode = "learn" | "review" | "bookmarks" | "mock";

// 시험 정보
export interface Exam {
  id: ExamId;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  subjects: string[];
}

// 객관식 문제
export interface Question {
  sourceType?: "public_past_exam" | "ai_generated" | "manual";
  version?: number;
  id: string;
  examId: ExamId;
  subject: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
}

// SRS 복습 카드 상태
export interface SrsCard {
  questionId: string;
  examId: ExamId;
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  dueAt: number;
  lastReviewedAt: number;
}
