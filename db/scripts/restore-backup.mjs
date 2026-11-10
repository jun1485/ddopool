// Supabase 백업 콘텐츠 Neon 복원
// 사용법: node --env-file=../.env.neon scripts/restore-backup.mjs <백업 폴더>
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import pg from "pg";

const TABLES = [
  "exams",
  "exam_subjects",
  "questions",
  "question_versions",
  "banned_terms",
  "audit_logs",
];
// 마이그레이션 기본값을 백업으로 대체할 표
const REPLACED = new Set(["banned_terms"]);
const CHUNK = 1000;

// 백업 행을 표 열 기준으로 삽입·검산
export async function restoreBackup(query, dir) {
  const counts = {};
  await query("begin");
  try {
    for (const table of TABLES)
      await query(`alter table public.${table} disable trigger user`);
    for (const table of TABLES) {
      const rows = JSON.parse(readFileSync(join(dir, `${table}.json`), "utf8"));
      const columns = (
        await query(
          "select column_name from information_schema.columns where table_schema='public' and table_name=$1",
          [table],
        )
      ).rows.map((row) => row.column_name);
      const keys = columns.filter((column) =>
        rows.some((row) => column in row),
      );
      const list = keys.map((key) => `"${key}"`).join(",");
      if (REPLACED.has(table)) await query(`delete from public.${table}`);
      for (let start = 0; start < rows.length; start += CHUNK)
        await query(
          `insert into public.${table} (${list}) overriding system value
           select ${list} from jsonb_populate_recordset(null::public.${table}, $1::jsonb)`,
          [JSON.stringify(rows.slice(start, start + CHUNK))],
        );
      const serial = columns.includes("id")
        ? (
            await query("select pg_get_serial_sequence($1, 'id') seq", [
              `public.${table}`,
            ])
          ).rows[0]?.seq
        : null;
      if (serial && keys.includes("id"))
        await query(
          `select setval($1, coalesce((select max(id) from public.${table}), 1))`,
          [serial],
        );
      counts[table] = {
        backup: rows.length,
        db: Number(
          (await query(`select count(*)::int n from public.${table}`)).rows[0]
            .n,
        ),
      };
    }
    for (const table of TABLES)
      await query(`alter table public.${table} enable trigger user`);
    const mismatch = Object.entries(counts).filter(
      ([, c]) => c.backup !== c.db,
    );
    if (mismatch.length > 0)
      throw new Error(`행 수 불일치 ${JSON.stringify(mismatch)}`);
    await query("commit");
  } catch (error) {
    await query("rollback");
    throw error;
  }
  return counts;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dir = process.argv[2];
  if (!dir || !process.env.DATABASE_URL) {
    console.error("백업 폴더 인자와 DATABASE_URL 이 필요합니다");
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    console.table(
      await restoreBackup((sql, params) => client.query(sql, params), dir),
    );
  } finally {
    await client.end();
  }
}
