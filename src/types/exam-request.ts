// 시험 요청 처리 상태
export type ExamRequestStatus =
  | "requested"
  | "triage"
  | "approved"
  | "sourcing"
  | "draft"
  | "review"
  | "published"
  | "duplicate"
  | "rejected"
  | "blocked"
  | "archived"
  | "cancelled";

// 시험 추가 요청 정보
export interface ExamRequest {
  id: string;
  examName: string;
  organization: string;
  level: string;
  officialUrl: string;
  reason: string;
  status: ExamRequestStatus;
  voteCount: number;
  hasVoted: boolean;
  publishedExamId: string | null;
  createdAt: number;
  updatedAt: number;
}

// 시험 추가 요청 입력 값
export interface CreateExamRequestInput {
  examName: string;
  organization: string;
  level: string;
  officialUrl: string;
  reason: string;
}
