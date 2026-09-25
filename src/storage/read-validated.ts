import { captureHandledError } from "@/lib/monitoring";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

// 순수 객체 판별
function isJsonObject(value: Json): value is { [key: string]: Json } {
  return typeof value === "object" && value != null && !Array.isArray(value);
}

// 스키마 위반 항목만 제외한 유효 데이터 추출
function salvageValue(schema: z.core.$ZodType, value: Json): Json | undefined {
  if (z.safeParse(schema, value).success) return value;
  const candidate = collectValidParts(schema, value);
  // 부분 복원 결과가 스키마 전체를 만족할 때만 채택
  return candidate !== undefined && z.safeParse(schema, candidate).success
    ? candidate
    : undefined;
}

// 배열·레코드·객체 하위 유효 항목 수집
function collectValidParts(
  schema: z.core.$ZodType,
  value: Json,
): Json | undefined {
  if (schema instanceof z.ZodArray && Array.isArray(value))
    return value.flatMap((item) => {
      const salvaged = salvageValue(schema.element, item);
      return salvaged === undefined ? [] : [salvaged];
    });
  if (schema instanceof z.ZodRecord && isJsonObject(value))
    return Object.fromEntries(
      Object.entries(value).flatMap(([key, item]) => {
        const salvaged = salvageValue(schema.valueType, item);
        return salvaged === undefined ||
          !z.safeParse(schema.keyType, key).success
          ? []
          : [[key, salvaged]];
      }),
    );
  if (schema instanceof z.ZodObject && isJsonObject(value))
    return Object.fromEntries(
      Object.entries(schema.shape).flatMap(([key, fieldSchema]) => {
        const field = value[key];
        if (field === undefined) return [];
        const salvaged = salvageValue(fieldSchema, field);
        return salvaged === undefined ? [] : [[key, salvaged]];
      }),
    );
  return undefined;
}

// 손상 기록 격리·유효 데이터 복원
export async function readValidated<T>(
  key: string,
  schema: z.ZodType<T>,
  fallback: T,
): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null) return fallback;
  let json: Json;
  try {
    json = JSON.parse(raw);
  } catch {
    json = null;
  }
  const parsed = schema.safeParse(json);
  if (parsed.success) return parsed.data;

  // 최초 손상 원본 보존
  const corruptKey = `${key}:corrupt`;
  if ((await AsyncStorage.getItem(corruptKey)) == null)
    await AsyncStorage.setItem(corruptKey, raw);
  captureHandledError(new Error("저장 데이터 형식 오류"), "storage-validation");

  const salvaged = salvageValue(schema, json);
  const recovered =
    salvaged === undefined ? undefined : schema.safeParse(salvaged);
  return recovered?.success === true ? recovered.data : fallback;
}
