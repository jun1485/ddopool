import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SQLite from "expo-sqlite";

import { resolveVaultOwner } from "@/storage/vault-owner";

type RowConnection = Pick<
  SQLite.SQLiteDatabase,
  "runAsync" | "getAllAsync" | "getFirstAsync"
>;

// 기존 AsyncStorage 키에서 행으로 옮길 컬렉션 정의
export interface LegacyImport {
  collection: string;
  legacyKey: string;
  decode: () => Promise<[string, string][]>;
}

// 소유 계정 기준 컬렉션 행 조작
export interface LearningRows {
  entries(collection: string): Promise<[string, string][]>;
  get(collection: string, id: string): Promise<string | null>;
  put(collection: string, entries: [string, string][]): Promise<void>;
  remove(collection: string, ids: string[]): Promise<void>;
  clear(collection: string): Promise<void>;
  count(collection: string): Promise<number>;
  trim(collection: string, limit: number): Promise<void>;
}

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

// 학습 기록 데이터베이스 열기·테이블 준비
function openLearningDatabase(): Promise<SQLite.SQLiteDatabase> {
  databasePromise ??= (async () => {
    const database = await SQLite.openDatabaseAsync("ddopool-learning.db");
    await database.execAsync(`
      CREATE TABLE IF NOT EXISTS learning_rows (
        collection TEXT NOT NULL,
        owner TEXT NOT NULL,
        id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        value TEXT NOT NULL,
        PRIMARY KEY (collection, owner, id)
      );
      CREATE INDEX IF NOT EXISTS learning_rows_order
        ON learning_rows (collection, owner, seq);
    `);
    return database;
  })().catch((error: Error) => {
    databasePromise = null;
    throw error;
  });
  return databasePromise;
}

// 트랜잭션·소유 계정에 묶인 행 조작 생성
function bindRows(connection: RowConnection, owner: string): LearningRows {
  return {
    async entries(collection) {
      const rows = await connection.getAllAsync<{ id: string; value: string }>(
        "SELECT id, value FROM learning_rows WHERE collection = ? AND owner = ? ORDER BY seq",
        [collection, owner],
      );
      return rows.map((row) => [row.id, row.value]);
    },
    async get(collection, id) {
      const row = await connection.getFirstAsync<{ value: string }>(
        "SELECT value FROM learning_rows WHERE collection = ? AND owner = ? AND id = ?",
        [collection, owner, id],
      );
      return row?.value ?? null;
    },
    async put(collection, entries) {
      for (const [id, value] of entries)
        await connection.runAsync(
          `INSERT INTO learning_rows (collection, owner, id, seq, value)
           VALUES (?, ?, ?, (SELECT COALESCE(MAX(seq), 0) + 1 FROM learning_rows WHERE collection = ? AND owner = ?), ?)
           ON CONFLICT (collection, owner, id) DO UPDATE SET value = excluded.value`,
          [collection, owner, id, collection, owner, value],
        );
    },
    async remove(collection, ids) {
      for (const id of ids)
        await connection.runAsync(
          "DELETE FROM learning_rows WHERE collection = ? AND owner = ? AND id = ?",
          [collection, owner, id],
        );
    },
    async clear(collection) {
      await connection.runAsync(
        "DELETE FROM learning_rows WHERE collection = ? AND owner = ?",
        [collection, owner],
      );
    },
    async count(collection) {
      const row = await connection.getFirstAsync<{ total: number }>(
        "SELECT COUNT(*) AS total FROM learning_rows WHERE collection = ? AND owner = ?",
        [collection, owner],
      );
      return row?.total ?? 0;
    },
    async trim(collection, limit) {
      // 최신 limit개만 남기고 오래된 행 정리
      await connection.runAsync(
        `DELETE FROM learning_rows WHERE collection = ? AND owner = ? AND seq <= (
           SELECT seq FROM learning_rows WHERE collection = ? AND owner = ?
           ORDER BY seq DESC LIMIT 1 OFFSET ?
         )`,
        [collection, owner, collection, owner, limit],
      );
    },
  };
}

// 기존 키 이전 후 단일 트랜잭션으로 행 작업 실행
export async function withLearningRows<T>(
  imports: LegacyImport[],
  task: (rows: LearningRows) => Promise<T>,
): Promise<T> {
  const database = await openLearningDatabase();
  const owner = await resolveVaultOwner();
  const legacy: [LegacyImport, [string, string][]][] = [];
  for (const item of imports)
    if ((await AsyncStorage.getItem(item.legacyKey)) != null)
      legacy.push([item, await item.decode()]);

  const box: { outcome?: { value: T } } = {};
  await database.withExclusiveTransactionAsync(async (connection) => {
    const rows = bindRows(connection, owner);
    // 백업 복원·계정 보관함이 되살린 기존 키는 행 전체 교체
    for (const [item, entries] of legacy) {
      await rows.clear(item.collection);
      await rows.put(item.collection, entries);
    }
    box.outcome = { value: await task(rows) };
  });
  if (legacy.length > 0)
    await AsyncStorage.multiRemove(legacy.map(([item]) => item.legacyKey));
  if (box.outcome == null)
    throw new Error("학습 기록 저장이 완료되지 않았습니다");
  return box.outcome.value;
}

// 삭제·초기화 계정의 행 전체 제거
export async function deleteOwnerRows(owner: string): Promise<void> {
  const database = await openLearningDatabase();
  await database.runAsync("DELETE FROM learning_rows WHERE owner = ?", [owner]);
}
