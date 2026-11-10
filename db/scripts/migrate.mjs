// Neon 마이그레이션 적용
// 사용법: node --env-file=../.env.neon scripts/migrate.mjs [--dry-run]
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";

const migrationsDir = fileURLToPath(new URL("../migrations/", import.meta.url));
const dryRun = process.argv.includes("--dry-run");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL 이 비어 있습니다");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query(`create schema if not exists ops;
    create table if not exists ops.schema_migrations (name text primary key, applied_at timestamptz not null default now());`);
  const applied = new Set(
    (await client.query("select name from ops.schema_migrations")).rows.map(
      (row) => row.name,
    ),
  );
  const pending = readdirSync(migrationsDir)
    .filter((file) => file.endsWith(".sql") && !applied.has(file))
    .sort();
  console.log(`적용 대기 ${pending.length}개${dryRun ? " (dry-run)" : ""}`);
  for (const file of pending) {
    if (dryRun) {
      console.log(`대기 ${file}`);
      continue;
    }
    await client.query(readFileSync(`${migrationsDir}${file}`, "utf8"));
    await client.query("insert into ops.schema_migrations(name) values($1)", [
      file,
    ]);
    console.log(`적용 ${file}`);
  }
} finally {
  await client.end();
}
