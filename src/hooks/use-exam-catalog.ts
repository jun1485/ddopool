import { useExamCatalogContext } from "@/providers/exam-catalog-provider";

// 시험 카탈로그 상태 연결
export function useExamCatalog() {
  return useExamCatalogContext();
}
