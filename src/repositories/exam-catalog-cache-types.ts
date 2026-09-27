import type { z } from "zod";

import type { catalogSchema } from "@/storage/data-schemas";

const catalogSource = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "demo-ten-exams";
export const EXAM_CATALOG_SOURCE = catalogSource;
export const EXAM_CATALOG_CACHE_KEY = `exam-loop:exam-catalog-cache:v2:${catalogSource}`;
export const EXAM_CATALOG_CACHE_TIME_KEY = `${EXAM_CATALOG_CACHE_KEY}:time`;
export const EXAM_CATALOG_EXAM_TIMES_KEY = `${EXAM_CATALOG_CACHE_KEY}:exams`;

export type CachedExamCatalog = z.infer<typeof catalogSchema>;

// 시험 카탈로그 기기 캐시 상태
export interface ExamCatalogCache {
  catalog: CachedExamCatalog | null;
  cachedAt: number;
  times: Record<string, number>;
}

export const EMPTY_EXAM_CATALOG_CACHE: ExamCatalogCache = {
  catalog: null,
  cachedAt: 0,
  times: {},
};
