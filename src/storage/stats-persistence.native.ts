import {
  dailyStatsSchema,
  idsSchema,
  performanceSchema,
} from "@/storage/data-schemas";
import {
  type LearningRows,
  type LegacyImport,
  withLearningRows,
} from "@/storage/learning-rows";
import { readValidated } from "@/storage/read-validated";
import {
  ATTEMPT_FINGERPRINTS_KEY,
  DAILY_STATS_KEY,
  EMPTY_PERFORMANCE_STATS,
  LAST_MERGED_ATTEMPT_ID_KEY,
  LEGACY_LAST_MERGED_ATTEMPT_AT_KEY,
  MERGE_SKIP_BEFORE_KEY,
  MERGED_REMOTE_ATTEMPTS_KEY,
  PERFORMANCE_STATS_KEY,
  type RemoteMergeResult,
  type RemoteMergeState,
  type StatsSnapshot,
} from "@/storage/stats-types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

const DAILY = "daily-stats";
const PERFORMANCE = "performance-stats";
const FINGERPRINTS = "attempt-fingerprints";
const MERGED_IDS = "merged-remote-attempts";
const VALUE_ID = "value";
const remoteIdsSchema = z.array(z.number().int());
const attemptIdSchema = z.number().int().nullable();

// 단일 값 기존 키 이전 정의 생성
function singleValueImport<T>(
  collection: string,
  legacyKey: string,
  schema: z.ZodType<T>,
  fallback: T,
): LegacyImport {
  return {
    collection,
    legacyKey,
    decode: async () => [
      [
        VALUE_ID,
        JSON.stringify(await readValidated(legacyKey, schema, fallback)),
      ],
    ],
  };
}

// 목록 값 기존 키 이전 정의 생성
function listImport<T>(
  collection: string,
  legacyKey: string,
  schema: z.ZodType<T[]>,
): LegacyImport {
  return {
    collection,
    legacyKey,
    decode: async () =>
      (await readValidated(legacyKey, schema, [])).map((item) => [
        String(item),
        "1",
      ]),
  };
}

const dailyImport = singleValueImport(
  DAILY,
  DAILY_STATS_KEY,
  dailyStatsSchema,
  {},
);
const performanceImport = singleValueImport(
  PERFORMANCE,
  PERFORMANCE_STATS_KEY,
  performanceSchema,
  EMPTY_PERFORMANCE_STATS,
);
const fingerprintImport = listImport(
  FINGERPRINTS,
  ATTEMPT_FINGERPRINTS_KEY,
  idsSchema,
);
const mergedIdsImport = listImport(
  MERGED_IDS,
  MERGED_REMOTE_ATTEMPTS_KEY,
  remoteIdsSchema,
);

// 단일 값 행 검증 조회
async function readValue<T>(
  rows: LearningRows,
  collection: string,
  schema: z.ZodType<T>,
  fallback: T,
): Promise<T> {
  const raw = await rows.get(collection, VALUE_ID);
  if (raw == null) return fallback;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

// 행 기준 일일 집계·누적 성과 조회
async function readSnapshot(rows: LearningRows): Promise<StatsSnapshot> {
  return {
    daily: await readValue(rows, DAILY, dailyStatsSchema, {}),
    performance: await readValue(
      rows,
      PERFORMANCE,
      performanceSchema,
      EMPTY_PERFORMANCE_STATS,
    ),
  };
}

// 일일 집계·누적 성과 행 저장
async function writeSnapshot(
  rows: LearningRows,
  snapshot: StatsSnapshot,
): Promise<void> {
  await rows.put(DAILY, [[VALUE_ID, JSON.stringify(snapshot.daily)]]);
  await rows.put(PERFORMANCE, [
    [VALUE_ID, JSON.stringify(snapshot.performance)],
  ]);
}

// 백업 복원 기준 시각 해석
async function readMergeSkipBefore(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(MERGE_SKIP_BEFORE_KEY);
  const parsed = raw == null ? NaN : Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

// 일일 집계·누적 성과 조회
export function readStatsSnapshot(): Promise<StatsSnapshot> {
  return withLearningRows([dailyImport, performanceImport], readSnapshot);
}

// 중복 아닌 풀이 1건 통계 반영
export function commitAnswerStats(
  fingerprint: string,
  apply: (snapshot: StatsSnapshot) => StatsSnapshot,
  limit: number,
): Promise<boolean> {
  return withLearningRows(
    [dailyImport, performanceImport, fingerprintImport],
    async (rows) => {
      if ((await rows.get(FINGERPRINTS, fingerprint)) != null) return false;
      await writeSnapshot(rows, apply(await readSnapshot(rows)));
      await rows.put(FINGERPRINTS, [[fingerprint, "1"]]);
      await rows.trim(FINGERPRINTS, limit);
      return true;
    },
  );
}

// 마지막으로 병합한 서버 풀이 id 조회
export function readMergeWatermark(): Promise<number | null> {
  return readValidated(LAST_MERGED_ATTEMPT_ID_KEY, attemptIdSchema, null);
}

// 서버 풀이 병합 결과 반영
export async function commitRemoteMerge(
  apply: (state: RemoteMergeState) => RemoteMergeResult,
  limit: number,
): Promise<void> {
  const lastMergedAttemptId = await readMergeWatermark();
  const mergeSkipBefore = await readMergeSkipBefore();
  const result = await withLearningRows(
    [dailyImport, performanceImport, fingerprintImport, mergedIdsImport],
    async (rows) => {
      const next = apply({
        ...(await readSnapshot(rows)),
        knownFingerprints: new Set(
          (await rows.entries(FINGERPRINTS)).map(([id]) => id),
        ),
        mergedIds: new Set(
          (await rows.entries(MERGED_IDS)).map(([id]) => Number(id)),
        ),
        lastMergedAttemptId,
        mergeSkipBefore,
      });
      await writeSnapshot(rows, next);
      await rows.put(
        FINGERPRINTS,
        next.addedFingerprints.map((id) => [id, "1"]),
      );
      await rows.put(
        MERGED_IDS,
        next.addedIds.map((id) => [String(id), "1"]),
      );
      await rows.trim(FINGERPRINTS, limit);
      await rows.trim(MERGED_IDS, limit);
      return next;
    },
  );
  // 행 반영 후 워터마크 전진, 중단 시 병합 id로 재합산 차단
  if (result.lastMergedAttemptId != null)
    await AsyncStorage.setItem(
      LAST_MERGED_ATTEMPT_ID_KEY,
      JSON.stringify(result.lastMergedAttemptId),
    );
}

// 학습 통계 전체 삭제
export async function clearStatsData(): Promise<void> {
  await withLearningRows(
    [dailyImport, performanceImport, fingerprintImport, mergedIdsImport],
    async (rows) => {
      for (const collection of [DAILY, PERFORMANCE, FINGERPRINTS, MERGED_IDS])
        await rows.clear(collection);
    },
  );
  await AsyncStorage.multiRemove([
    LAST_MERGED_ATTEMPT_ID_KEY,
    LEGACY_LAST_MERGED_ATTEMPT_AT_KEY,
    MERGE_SKIP_BEFORE_KEY,
  ]);
}
