// 문제 오류 신고 유형
export type QuestionReportCategory =
  "wrong-answer" | "unclear" | "typo" | "outdated" | "other";

// 문제 오류 신고 처리 상태
export type QuestionReportStatus = "submitted" | "reviewing" | "resolved";

// 문제 오류 신고 정보
export interface QuestionReport {
  id: string;
  questionId: string;
  category: QuestionReportCategory;
  details: string;
  status: QuestionReportStatus;
  createdAt: number;
}

// 문제 오류 신고 입력 값
export interface CreateQuestionReportInput {
  questionId: string;
  category: QuestionReportCategory;
  details: string;
}
