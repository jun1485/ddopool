import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

const JOURNAL_KEY = "exam-loop:backup-restore-journal:v1";
const journalSchema = z.array(
  z.tuple([z.string().startsWith("exam-loop:"), z.string().nullable()]),
);

// 중단된 백업 복원의 원본 기록 복구
export async function recoverBackupRestore(): Promise<void> {
  const raw = await AsyncStorage.getItem(JOURNAL_KEY);
  if (raw == null) return;
  const entries = journalSchema.parse(JSON.parse(raw));
  for (const [key, value] of entries) {
    if (value == null) await AsyncStorage.removeItem(key);
    else await AsyncStorage.setItem(key, value);
  }
  await AsyncStorage.removeItem(JOURNAL_KEY);
}

// 백업 복원 원본 저널 저장
export async function beginBackupRestore(keys: string[]): Promise<void> {
  await recoverBackupRestore();
  await AsyncStorage.setItem(
    JOURNAL_KEY,
    JSON.stringify(await AsyncStorage.multiGet(keys)),
  );
}

// 백업 복원 확정
export async function commitBackupRestore(): Promise<void> {
  await AsyncStorage.removeItem(JOURNAL_KEY);
}
