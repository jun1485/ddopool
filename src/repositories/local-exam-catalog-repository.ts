import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  ExamCatalogRepository,
  ExamCatalogSnapshot,
} from "@/repositories/exam-catalog-repository";
import { examPlatformApi } from "@/repositories/exam-platform-api";

const EXAM_CATALOG_CACHE_KEY = "exam-loop:exam-catalog-cache:v1";

// 시험 카탈로그 캐시 로드
async function loadCachedCatalog(): Promise<ExamCatalogSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(EXAM_CATALOG_CACHE_KEY);
    return raw == null ? null : (JSON.parse(raw) as ExamCatalogSnapshot);
  } catch {
    return null;
  }
}

// 시험 카탈로그 캐시 저장
async function saveCachedCatalog(catalog: ExamCatalogSnapshot): Promise<void> {
  await AsyncStorage.setItem(EXAM_CATALOG_CACHE_KEY, JSON.stringify(catalog));
}

// API 우선 시험 카탈로그 로드
async function loadCatalog(): Promise<ExamCatalogSnapshot> {
  try {
    const exams = await examPlatformApi.listActiveExams();
    const questionGroups = await Promise.all(
      exams.map((exam) => examPlatformApi.listPublishedQuestions(exam.id)),
    );
    const catalog = { exams, questions: questionGroups.flat() };
    await saveCachedCatalog(catalog).catch(() => undefined);
    return catalog;
  } catch (error) {
    const cachedCatalog = await loadCachedCatalog();
    if (cachedCatalog != null) return cachedCatalog;
    throw error;
  }
}

// API·오프라인 캐시 시험 카탈로그
export const examCatalogRepository: ExamCatalogRepository = {
  loadCatalog,
};
