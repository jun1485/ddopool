import type * as NativeCache from "@/repositories/exam-catalog-cache.native";
import { z } from "zod";

import {
  EXAM_CATALOG_CACHE_KEY,
  EXAM_CATALOG_CACHE_TIME_KEY,
  EXAM_CATALOG_EXAM_TIMES_KEY,
} from "@/repositories/exam-catalog-cache-types";
import { catalogSchema } from "@/storage/data-schemas";
import AsyncStorage from "@react-native-async-storage/async-storage";

const timesSchema = z.record(z.string(), z.number().finite());

// 시험 카탈로그 캐시 조회
export const readExamCatalogCache: typeof NativeCache.readExamCatalogCache =
  async () => {
    let catalog = null;
    try {
      const raw = await AsyncStorage.getItem(EXAM_CATALOG_CACHE_KEY);
      catalog = raw == null ? null : catalogSchema.parse(JSON.parse(raw));
    } catch {
      catalog = null;
    }
    let times: Record<string, number> = {};
    try {
      const raw = await AsyncStorage.getItem(EXAM_CATALOG_EXAM_TIMES_KEY);
      if (raw != null) times = timesSchema.parse(JSON.parse(raw));
    } catch {
      times = {};
    }
    return {
      catalog,
      cachedAt: Number(await AsyncStorage.getItem(EXAM_CATALOG_CACHE_TIME_KEY)),
      times,
    };
  };

// 시험 카탈로그 캐시 전체 저장
export const writeExamCatalogCache: typeof NativeCache.writeExamCatalogCache =
  async (catalog, _refreshedExamIds, times, cachedAt) => {
    await AsyncStorage.setItem(EXAM_CATALOG_CACHE_KEY, JSON.stringify(catalog));
    if (cachedAt != null)
      await AsyncStorage.setItem(EXAM_CATALOG_CACHE_TIME_KEY, String(cachedAt));
    await AsyncStorage.setItem(
      EXAM_CATALOG_EXAM_TIMES_KEY,
      JSON.stringify(times),
    );
  };
