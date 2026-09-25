import type * as NativePersistence from "@/storage/stats-persistence.native";
import {
  dailyStatsSchema,
  idsSchema,
  performanceSchema,
} from "@/storage/data-schemas";
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
} from "@/storage/stats-types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

const remoteIdsSchema = z.array(z.number().int());
const attemptIdSchema = z.number().int().nullable();

// 백업 복원 기준 시각 해석
async function readMergeSkipBefore(): Promise<number | null> {
  const raw = await AsyncStorage.getItem(MERGE_SKIP_BEFORE_KEY);
  const parsed = raw == null ? NaN : Date.parse(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

// 일일 집계·누적 성과 조회
export const readStatsSnapshot: typeof NativePersistence.readStatsSnapshot =
  async () => ({
    daily: await readValidated(DAILY_STATS_KEY, dailyStatsSchema, {}),
    performance: await readValidated(
      PERFORMANCE_STATS_KEY,
      performanceSchema,
      EMPTY_PERFORMANCE_STATS,
    ),
  });

// 중복 아닌 풀이 1건 통계 반영
export const commitAnswerStats: typeof NativePersistence.commitAnswerStats =
  async (fingerprint, apply, limit) => {
    const [snapshot, fingerprints] = await Promise.all([
      readStatsSnapshot(),
      readValidated(ATTEMPT_FINGERPRINTS_KEY, idsSchema, []),
    ]);
    if (fingerprints.includes(fingerprint)) return false;
    const next = apply(snapshot);
    await AsyncStorage.multiSet([
      [DAILY_STATS_KEY, JSON.stringify(next.daily)],
      [PERFORMANCE_STATS_KEY, JSON.stringify(next.performance)],
      [
        ATTEMPT_FINGERPRINTS_KEY,
        JSON.stringify([...fingerprints, fingerprint].slice(-limit)),
      ],
    ]);
    return true;
  };

// 마지막으로 병합한 서버 풀이 id 조회
export const readMergeWatermark: typeof NativePersistence.readMergeWatermark =
  () => readValidated(LAST_MERGED_ATTEMPT_ID_KEY, attemptIdSchema, null);

// 서버 풀이 병합 결과 반영
export const commitRemoteMerge: typeof NativePersistence.commitRemoteMerge =
  async (apply, limit) => {
    const [snapshot, fingerprints, remoteIds, lastMergedAttemptId] =
      await Promise.all([
        readStatsSnapshot(),
        readValidated(ATTEMPT_FINGERPRINTS_KEY, idsSchema, []),
        readValidated(MERGED_REMOTE_ATTEMPTS_KEY, remoteIdsSchema, []),
        readMergeWatermark(),
      ]);
    const result = apply({
      ...snapshot,
      knownFingerprints: new Set(fingerprints),
      mergedIds: new Set(remoteIds),
      lastMergedAttemptId,
      mergeSkipBefore: await readMergeSkipBefore(),
    });
    const entries: [string, string][] = [
      [DAILY_STATS_KEY, JSON.stringify(result.daily)],
      [PERFORMANCE_STATS_KEY, JSON.stringify(result.performance)],
      [
        ATTEMPT_FINGERPRINTS_KEY,
        JSON.stringify(
          [...fingerprints, ...result.addedFingerprints].slice(-limit),
        ),
      ],
      [
        MERGED_REMOTE_ATTEMPTS_KEY,
        JSON.stringify([...remoteIds, ...result.addedIds].slice(-limit)),
      ],
    ];
    if (result.lastMergedAttemptId != null)
      entries.push([
        LAST_MERGED_ATTEMPT_ID_KEY,
        JSON.stringify(result.lastMergedAttemptId),
      ]);
    await AsyncStorage.multiSet(entries);
  };

// 학습 통계 전체 삭제
export const clearStatsData: typeof NativePersistence.clearStatsData = () =>
  AsyncStorage.multiRemove([
    DAILY_STATS_KEY,
    PERFORMANCE_STATS_KEY,
    ATTEMPT_FINGERPRINTS_KEY,
    MERGED_REMOTE_ATTEMPTS_KEY,
    LAST_MERGED_ATTEMPT_ID_KEY,
    LEGACY_LAST_MERGED_ATTEMPT_AT_KEY,
    MERGE_SKIP_BEFORE_KEY,
  ]);
