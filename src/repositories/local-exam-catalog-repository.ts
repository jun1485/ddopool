import { z } from "zod";
import { catalogSchema } from "@/storage/data-schemas";
import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  ExamCatalogRepository,
  ExamCatalogSnapshot,
} from "@/repositories/exam-catalog-repository";
import { examPlatformApi } from "@/repositories/exam-platform-api";

const catalogSource = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "demo-ten-exams";
const EXAM_CATALOG_CACHE_KEY = `exam-loop:exam-catalog-cache:v2:${catalogSource}`;
const CACHE_TIME_KEY = `${EXAM_CATALOG_CACHE_KEY}:time`;
const CACHE_TTL_MS = 15 * 60 * 1000;
const EXAM_TIMES_KEY = `${EXAM_CATALOG_CACHE_KEY}:exams`;
let pendingKey = "";
let pendingCatalog: Promise<ExamCatalogSnapshot> | null = null;

// 시험 카탈로그 캐시 로드
async function loadCachedCatalog(): Promise<ExamCatalogSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(EXAM_CATALOG_CACHE_KEY);
    return raw == null ? null : catalogSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

// 시험 카탈로그 캐시 저장
async function saveCachedCatalog(
  catalog: ExamCatalogSnapshot,
  refreshExams: boolean,
): Promise<void> {
  await AsyncStorage.setItem(EXAM_CATALOG_CACHE_KEY, JSON.stringify(catalog));
  if (refreshExams)
    await AsyncStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
}

// 동일 시험 다운로드 요청 병합
async function loadCatalog(
  examIds: string[] = [],
): Promise<ExamCatalogSnapshot> {
  const requestKey = [...new Set(examIds)].sort().join(",");
  if (pendingCatalog != null) {
    if (pendingKey === requestKey) return pendingCatalog;
    await pendingCatalog.catch(() => undefined);
    return loadCatalog(examIds);
  }
  pendingKey = requestKey;
  pendingCatalog = refreshCatalog(examIds).finally(() => {
    pendingCatalog = null;
  });
  return pendingCatalog;
}

// 등록·열람 시험만 갱신하고 이전 다운로드 보관
async function refreshCatalog(examIds: string[]): Promise<ExamCatalogSnapshot> {
  const cached = await loadCachedCatalog();
  const cachedAt = Number(await AsyncStorage.getItem(CACHE_TIME_KEY));
  const now = Date.now();
  const fresh =
    cached != null && cachedAt <= now && now - cachedAt < CACHE_TTL_MS;
  let exams: ExamCatalogSnapshot["exams"];
  try {
    exams = fresh ? cached.exams : await examPlatformApi.listActiveExams();
  } catch (error) {
    if (cached != null)
      return { ...cached, unavailableExamIds: examIds, isOffline: true };
    throw error;
  }
  let times: Record<string, number> = {};
  try {
    const raw = await AsyncStorage.getItem(EXAM_TIMES_KEY);
    if (raw != null)
      times = z.record(z.string(), z.number().finite()).parse(JSON.parse(raw));
  } catch {
    times = {};
  }
  const required = exams.filter(
    (exam) =>
      examIds.includes(exam.id) &&
      (cached == null ||
        times[exam.id] == null ||
        times[exam.id] > now ||
        now - times[exam.id] >= CACHE_TTL_MS),
  );
  let questions =
    cached?.questions.filter((question) =>
      exams.some((exam) => exam.id === question.examId),
    ) ?? [];
  const unavailableExamIds: string[] = [];
  for (let index = 0; index < required.length; index += 3) {
    const batch = required.slice(index, index + 3);
    const results = await Promise.allSettled(
      batch.map((exam) => examPlatformApi.listPublishedQuestions(exam.id)),
    );
    results.forEach((result, offset) => {
      const id = batch[offset].id;
      if (result.status === "fulfilled") {
        questions = [
          ...questions.filter((question) => question.examId !== id),
          ...result.value,
        ];
        times[id] = now;
      } else unavailableExamIds.push(id);
    });
  }
  const catalog = { exams, questions, unavailableExamIds };
  try {
    await saveCachedCatalog({ exams, questions }, !fresh);
    await AsyncStorage.setItem(EXAM_TIMES_KEY, JSON.stringify(times));
  } catch {
    // 캐시 실패 시 다운로드한 화면 데이터 유지
  }
  return catalog;
}

// API·오프라인 캐시 시험 카탈로그
export const examCatalogRepository: ExamCatalogRepository = { loadCatalog };
