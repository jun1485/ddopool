import { z } from "zod";

import {
  EXAM_CATALOG_CACHE_KEY,
  EXAM_CATALOG_CACHE_TIME_KEY,
  EXAM_CATALOG_EXAM_TIMES_KEY,
  EXAM_CATALOG_SOURCE,
  type CachedExamCatalog,
  type ExamCatalogCache,
} from "@/repositories/exam-catalog-cache-types";
import { catalogSchema } from "@/storage/data-schemas";
import {
  type LearningRows,
  type LegacyImport,
  withDeviceRows,
} from "@/storage/learning-rows";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BODY = `exam-catalog:${EXAM_CATALOG_SOURCE}`;
const CACHED_AT = `exam-catalog-time:${EXAM_CATALOG_SOURCE}`;
const EXAM_TIMES = `exam-catalog-times:${EXAM_CATALOG_SOURCE}`;
const EXAMS_ID = "exams";
const VALUE_ID = "value";
const QUESTION_PREFIX = "q:";
const timesSchema = z.record(z.string(), z.number().finite());

// 행 값 스키마 검증 변환
function parseRow<T>(schema: z.ZodType<T>, value: string | null): T | null {
  if (value == null) return null;
  try {
    const parsed = schema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

// 시험별 문항 행 목록 생성
function questionRows(
  catalog: CachedExamCatalog,
  examIds: Iterable<string>,
): [string, string][] {
  return [...examIds].map((id) => [
    `${QUESTION_PREFIX}${id}`,
    JSON.stringify(
      catalog.questions.filter((question) => question.examId === id),
    ),
  ]);
}

const bodyImport: LegacyImport = {
  collection: BODY,
  legacyKey: EXAM_CATALOG_CACHE_KEY,
  discardUnreadable: true,
  decode: async () => {
    try {
      const catalog = parseRow(
        catalogSchema,
        await AsyncStorage.getItem(EXAM_CATALOG_CACHE_KEY),
      );
      if (catalog == null) return [];
      return [
        [EXAMS_ID, JSON.stringify(catalog.exams)],
        ...questionRows(
          catalog,
          new Set(catalog.questions.map((question) => question.examId)),
        ),
      ];
    } catch {
      return [];
    }
  },
};

const cachedAtImport: LegacyImport = {
  collection: CACHED_AT,
  legacyKey: EXAM_CATALOG_CACHE_TIME_KEY,
  decode: async () => [
    [VALUE_ID, (await AsyncStorage.getItem(EXAM_CATALOG_CACHE_TIME_KEY)) ?? ""],
  ],
};

const examTimesImport: LegacyImport = {
  collection: EXAM_TIMES,
  legacyKey: EXAM_CATALOG_EXAM_TIMES_KEY,
  decode: async () => {
    const times = parseRow(
      timesSchema,
      await AsyncStorage.getItem(EXAM_CATALOG_EXAM_TIMES_KEY),
    );
    return times == null ? [] : [[VALUE_ID, JSON.stringify(times)]];
  },
};

const imports = [bodyImport, cachedAtImport, examTimesImport];

// 캐시 행 기준 카탈로그·갱신 시각 로드
async function readCache(rows: LearningRows): Promise<ExamCatalogCache> {
  let exams: CachedExamCatalog["exams"] | null = null;
  const questions: CachedExamCatalog["questions"] = [];
  const storedExamIds = new Set<string>();
  for (const [id, value] of await rows.entries(BODY)) {
    if (id === EXAMS_ID) exams = parseRow(catalogSchema.shape.exams, value);
    else if (id.startsWith(QUESTION_PREFIX)) {
      const list = parseRow(catalogSchema.shape.questions, value);
      if (list == null) continue;
      questions.push(...list);
      storedExamIds.add(id.slice(QUESTION_PREFIX.length));
    }
  }
  const times =
    parseRow(timesSchema, await rows.get(EXAM_TIMES, VALUE_ID)) ?? {};
  // 문항 행이 없는 시험은 다시 다운로드
  for (const id of Object.keys(times))
    if (!storedExamIds.has(id)) delete times[id];
  return {
    catalog: exams == null ? null : { exams, questions },
    cachedAt: Number(await rows.get(CACHED_AT, VALUE_ID)),
    times,
  };
}

// 시험 카탈로그 캐시 조회
export function readExamCatalogCache(): Promise<ExamCatalogCache> {
  return withDeviceRows(imports, readCache);
}

// 갱신된 시험 문항 행만 바꿔 카탈로그 캐시 저장
export async function writeExamCatalogCache(
  catalog: CachedExamCatalog,
  refreshedExamIds: string[],
  times: Record<string, number>,
  cachedAt: number | null,
): Promise<void> {
  await withDeviceRows(imports, async (rows) => {
    const examIds = new Set(catalog.exams.map((exam) => exam.id));
    await rows.put(BODY, [
      [EXAMS_ID, JSON.stringify(catalog.exams)],
      ...questionRows(catalog, refreshedExamIds),
    ]);
    await rows.remove(
      BODY,
      (await rows.ids(BODY)).filter(
        (id) =>
          id.startsWith(QUESTION_PREFIX) &&
          !examIds.has(id.slice(QUESTION_PREFIX.length)),
      ),
    );
    await rows.put(EXAM_TIMES, [[VALUE_ID, JSON.stringify(times)]]);
    if (cachedAt != null)
      await rows.put(CACHED_AT, [[VALUE_ID, String(cachedAt)]]);
  });
}
