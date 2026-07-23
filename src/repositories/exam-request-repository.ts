import { CreateExamRequestInput, ExamRequest } from "@/types/exam-request";

// 시험 요청 데이터 접근 계약
export interface ExamRequestRepository {
  list: () => Promise<ExamRequest[]>;
  create: (input: CreateExamRequestInput) => Promise<ExamRequest>;
  update: (
    requestId: string,
    input: CreateExamRequestInput,
  ) => Promise<ExamRequest[]>;
  cancel: (requestId: string) => Promise<ExamRequest[]>;
  setVote: (requestId: string, hasVoted: boolean) => Promise<ExamRequest[]>;
}
