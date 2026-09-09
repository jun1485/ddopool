import { Exam, Question } from "@/types/exam";

// 시험 카탈로그 스냅샷
export interface ExamCatalogSnapshot {
  exams: Exam[];
  questions: Question[];
  unavailableExamIds?: string[];
  isOffline?: boolean;
}

// 시험 카탈로그 데이터 접근 계약
export interface ExamCatalogRepository {
  loadCatalog: (examIds?: string[]) => Promise<ExamCatalogSnapshot>;
}
