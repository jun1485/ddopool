import {
  readExamCatalogCache,
  writeExamCatalogCache,
} from "@/repositories/exam-catalog-cache";
import { EMPTY_EXAM_CATALOG_CACHE } from "@/repositories/exam-catalog-cache-types";
import {
  ExamCatalogRepository,
  ExamCatalogSnapshot,
} from "@/repositories/exam-catalog-repository";
import { examPlatformApi } from "@/repositories/exam-platform-api";

const CACHE_TTL_MS = 15 * 60 * 1000;
const CATALOG_REQUEST_TIMEOUT_MS = 12_000;
let pendingKey = "";
let pendingCatalog: Promise<ExamCatalogSnapshot> | null = null;

// 카탈로그 원격 요청 최대 대기 제한
async function withCatalogTimeout<T>(request: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      request,
      new Promise<T>((_resolve, reject) => {
        timeout = setTimeout(
          () => reject(new Error("시험 카탈로그 요청 시간이 초과됐습니다.")),
          CATALOG_REQUEST_TIMEOUT_MS,
        );
      }),
    ]);
  } finally {
    if (timeout != null) clearTimeout(timeout);
  }
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
  const {
    catalog: cached,
    cachedAt,
    times,
  } = await readExamCatalogCache().catch(() => EMPTY_EXAM_CATALOG_CACHE);
  const now = Date.now();
  const fresh =
    cached != null && cachedAt <= now && now - cachedAt < CACHE_TTL_MS;
  let exams: ExamCatalogSnapshot["exams"];
  try {
    exams = fresh
      ? cached.exams
      : await withCatalogTimeout(examPlatformApi.listActiveExams());
  } catch (error) {
    if (cached != null)
      return { ...cached, unavailableExamIds: examIds, isOffline: true };
    throw error;
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
  const refreshedExamIds: string[] = [];
  for (let index = 0; index < required.length; index += 3) {
    const batch = required.slice(index, index + 3);
    const results = await Promise.allSettled(
      batch.map((exam) =>
        withCatalogTimeout(examPlatformApi.listPublishedQuestions(exam.id)),
      ),
    );
    results.forEach((result, offset) => {
      const id = batch[offset].id;
      if (result.status === "fulfilled") {
        questions = [
          ...questions.filter((question) => question.examId !== id),
          ...result.value,
        ];
        times[id] = now;
        refreshedExamIds.push(id);
      } else unavailableExamIds.push(id);
    });
  }
  const catalog = { exams, questions, unavailableExamIds };
  try {
    await writeExamCatalogCache(
      { exams, questions },
      refreshedExamIds,
      times,
      fresh ? null : Date.now(),
    );
  } catch {
    // 캐시 실패 시 다운로드한 화면 데이터 유지
  }
  return catalog;
}

// API·오프라인 캐시 시험 카탈로그
export const examCatalogRepository: ExamCatalogRepository = { loadCatalog };
