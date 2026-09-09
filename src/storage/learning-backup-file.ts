import AsyncStorage from "@react-native-async-storage/async-storage";
import * as DocumentPicker from "expo-document-picker";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import { backupSchema } from "@/storage/data-schemas";
import {
  beginBackupRestore,
  commitBackupRestore,
  recoverBackupRestore,
} from "@/storage/backup-recovery";
import { loadPendingLearningAttempts } from "@/storage/pending-learning-attempt-store";
import { settleLearningWrites } from "@/storage/settle-learning-writes";
import { loadLearningSyncOutbox } from "@/sync/learning-sync-outbox";

// 학습 백업 파일 저장·공유
export async function shareLearningBackup(json: string): Promise<void> {
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(
      new Blob([json], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "ddopool-backup.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("파일 공유를 지원하지 않는 기기입니다");
  const file = new File(Paths.cache, "ddopool-backup.json");
  file.write(json);
  try {
    await Sharing.shareAsync(file.uri, {
      mimeType: "application/json",
      UTI: "public.json",
      dialogTitle: "학습 기록 백업",
    });
  } finally {
    if (file.exists) file.delete();
  }
}

// 백업 파일 유효성 확인
export async function chooseLearningBackup(): Promise<string | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/json",
    copyToCacheDirectory: true,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const cachedFile = Platform.OS === "web" ? null : new File(asset.uri);
  try {
    if ((asset.size ?? 0) > 10 * 1024 * 1024)
      throw new Error("백업 파일은 10MB 이하여야 합니다");
    const json =
      asset.file != null ? await asset.file.text() : await cachedFile!.text();
    if (json.length > 10 * 1024 * 1024)
      throw new Error("백업 파일이 너무 큽니다");
    return JSON.stringify(backupSchema.parse(JSON.parse(json)));
  } finally {
    if (cachedFile?.exists && cachedFile.uri.startsWith(Paths.cache.uri))
      cachedFile.delete();
  }
}

// 검증된 백업으로 기기 기록 교체
export async function restoreLearningBackup(json: string): Promise<void> {
  const { data } = backupSchema.parse(JSON.parse(json));
  await settleLearningWrites();
  if (
    (await loadLearningSyncOutbox()).length > 0 ||
    (await loadPendingLearningAttempts()).length > 0
  )
    throw new Error("대기 중인 동기화를 먼저 마쳐 주세요");
  const values = [
    ["settings", data.settings],
    ["exam-enrollment:v1", data.enrollment],
    ["daily-stats", data.dailyStats],
    ["performance-stats", data.performance],
    ["srs-cards", data.srsCards],
    ["bookmarks", data.bookmarks],
    ["wrong-answer-notes:v1", data.wrongAnswerNotes],
    ["achievements:v1", data.unlockedAchievements],
    ["study-target:v1", data.studyTarget],
    ["mock-exam-history:v1", data.mockExamHistory],
    ["learning-session-history:v1", data.learningSessionHistory],
    ["custom-session-presets:v1", data.customSessionPresets],
  ] as const;
  const entries = values.map(([key, value]): [string, string] => [
    `exam-loop:${key}`,
    JSON.stringify(value),
  ]);
  // 복원 이전 서버 이력의 통계 중복 합산 방지
  entries.push([
    "exam-loop:last-merged-attempt-answered-at:v1",
    new Date().toISOString(),
  ]);
  const derivedKeys = [
    "active-quiz-session:v1",
    "attempt-fingerprints:v1",
    "merged-remote-attempts:v1",
    "learning-extras-baseline:v1",
  ].map((key) => `exam-loop:${key}`);
  await beginBackupRestore([...entries.map(([key]) => key), ...derivedKeys]);
  try {
    await AsyncStorage.multiSet(entries);
    await AsyncStorage.multiRemove(derivedKeys);
    await commitBackupRestore();
  } catch (error) {
    await recoverBackupRestore();
    throw error;
  }
}
