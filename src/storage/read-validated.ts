import { captureHandledError } from "@/lib/monitoring";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { z } from "zod";

// 손상 기록 격리·유효 데이터 복원
export async function readValidated<T>(
  key: string,
  schema: z.ZodType<T>,
  fallback: T,
): Promise<T> {
  const raw = await AsyncStorage.getItem(key);
  if (raw == null) return fallback;
  try {
    return schema.parse(JSON.parse(raw));
  } catch {
    await AsyncStorage.setItem(`${key}:corrupt`, raw);
    captureHandledError(
      new Error("저장 데이터 형식 오류"),
      "storage-validation",
    );
    return fallback;
  }
}
