import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

import { settleLearningWrites } from "@/storage/settle-learning-writes";
import { recoverBackupRestore } from "@/storage/backup-recovery";

export const ACCOUNT_DATA_KEYS = [
  "learning-extras-baseline:v1",
  "achievements:v1",
  "pending-learning-attempts:v1",
  "learning-sync-migrated:v1",
  "learning-sync-outbox:v1",
  "learning-sync-outbox-corrupt:v1",
  "learning-sync-outbox-recovery:v1",
  "learning-sync-dead-letter:v1",
  "exam-enrollment:v1",
  "mock-exam-history:v1",
  "custom-session-presets:v1",
  "bookmarks",
  "srs-cards",
  "wrong-answer-notes:v1",
  "learning-session-history:v1",
  "study-target:v1",
  "active-quiz-session:v1",
  "daily-stats",
  "performance-stats",
  "attempt-fingerprints:v1",
  "merged-remote-attempts:v1",
  "last-merged-attempt-answered-at:v1",
].flatMap((key) => [`exam-loop:${key}`, `exam-loop:${key}:corrupt`]);
const OWNER_KEY = "exam-loop:account-owner:v1";
const JOURNAL_KEY = "exam-loop:account-transition:v1";
const DELETED_OWNER_KEY = "exam-loop:deleted-account:v1";
const DELETE_REQUEST_KEY = "exam-loop:account-delete-request:v1";
const snapshotSchema = z.record(z.string(), z.string());
const journalSchema = z.object({
  owner: z.string(),
  snapshot: snapshotSchema,
  eraseOwner: z.string().optional(),
});
let transitionQueue: Promise<void> = Promise.resolve();

// 서버 삭제 계정의 기기 정리 예약
export async function markDeletedAccount(userId: string): Promise<void> {
  await AsyncStorage.setItem(DELETED_OWNER_KEY, userId);
}

// 서버 계정 삭제 요청 영속 기록
export async function beginAccountDeletion(userId: string): Promise<void> {
  await AsyncStorage.setItem(DELETE_REQUEST_KEY, userId);
}

// 결과 미확인 계정 삭제 요청 조회
export async function loadAccountDeletionRequest(): Promise<string | null> {
  return AsyncStorage.getItem(DELETE_REQUEST_KEY);
}

// 기기 로그아웃 완료 후 삭제 표식 정리
export async function completeAccountDeletion(): Promise<void> {
  await AsyncStorage.multiRemove([DELETED_OWNER_KEY, DELETE_REQUEST_KEY]);
}

// 중단된 계정 삭제의 기기 기록 정리
export async function recoverDeletedAccount(): Promise<boolean> {
  const deletedOwner = await AsyncStorage.getItem(DELETED_OWNER_KEY);
  if (deletedOwner == null) return false;
  await transitionQueue.catch(() => undefined);
  const owner = await AsyncStorage.getItem(OWNER_KEY);
  if (owner === deletedOwner) await switchAccountVault(null, true);
  await AsyncStorage.removeItem(vaultKey(deletedOwner));
  return true;
}

// 계정 보관함 주소 생성
function vaultKey(owner: string): string {
  return `exam-loop:account-vault:v1:${encodeURIComponent(owner)}`;
}

// 계정 전환 중단 지점 복구
async function applyJournal(): Promise<void> {
  const raw = await AsyncStorage.getItem(JOURNAL_KEY);
  if (raw == null) return;
  const journal = journalSchema.parse(JSON.parse(raw));
  await AsyncStorage.multiRemove(ACCOUNT_DATA_KEYS);
  const entries = Object.entries(journal.snapshot).filter(([key]) =>
    ACCOUNT_DATA_KEYS.includes(key),
  );
  if (entries.length > 0) await AsyncStorage.multiSet(entries);
  if (journal.eraseOwner != null)
    await AsyncStorage.removeItem(vaultKey(journal.eraseOwner));
  await AsyncStorage.setItem(OWNER_KEY, journal.owner);
  await AsyncStorage.removeItem(JOURNAL_KEY);
}

// 계정별 기록 보관·복원
export function switchAccountVault(
  userId: string | null,
  eraseCurrent = false,
): Promise<void> {
  const nextOwner = userId ?? "guest";
  const task = transitionQueue
    .catch(() => undefined)
    .then(async () => {
      await settleLearningWrites();
      await recoverBackupRestore();
      await applyJournal();
      const owner =
        (await AsyncStorage.getItem(OWNER_KEY)) ??
        (await AsyncStorage.getItem("exam-loop:learning-sync-migrated:v1")) ??
        "guest";
      if (owner === nextOwner && !eraseCurrent) {
        await AsyncStorage.setItem(OWNER_KEY, owner);
        return;
      }
      const entries = await AsyncStorage.multiGet(ACCOUNT_DATA_KEYS);
      const snapshot: Record<string, string> = {};
      for (const [key, value] of entries)
        if (value != null) snapshot[key] = value;
      const target = await AsyncStorage.getItem(vaultKey(nextOwner));
      const restored =
        target == null || (eraseCurrent && owner === nextOwner)
          ? {}
          : snapshotSchema.parse(JSON.parse(target));
      // 삭제된 계정 기록 재생성 방지
      if (!eraseCurrent)
        await AsyncStorage.setItem(vaultKey(owner), JSON.stringify(snapshot));
      await AsyncStorage.setItem(
        JOURNAL_KEY,
        JSON.stringify({
          owner: nextOwner,
          snapshot: restored,
          ...(eraseCurrent ? { eraseOwner: owner } : {}),
        }),
      );
      await applyJournal();
    });
  transitionQueue = task;
  return task;
}
