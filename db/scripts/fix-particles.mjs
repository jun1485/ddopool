// 문제 문구의 "은(는)" 조사 일괄 교정
// 사용법:
//   node scripts/fix-particles.mjs --bundles                         시드 번들 파일 교정
//   node --env-file=../.env.neon scripts/fix-particles.mjs --db [--dry-run]   운영 DB 교정
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pg from "pg";

import { fixParticles } from "../../scripts/korean-particles.mjs";

const bundleDir = fileURLToPath(new URL("../seed/bundles/", import.meta.url));
const dryRun = process.argv.includes("--dry-run");

// 문항 문구 교정 결과, 바뀐 것이 없으면 null
function fixQuestion(question) {
  const prompt = fixParticles(question.prompt);
  const explanation = fixParticles(question.explanation);
  const choices = question.choices.map(fixParticles);
  const changed =
    prompt !== question.prompt ||
    explanation !== question.explanation ||
    choices.some((choice, index) => choice !== question.choices[index]);
  return changed ? { prompt, explanation, choices } : null;
}

// 시드 번들 파일 교정, 기존 파일 서식 유지
function fixBundles() {
  let changedCount = 0;
  for (const file of readdirSync(bundleDir).filter((name) =>
    name.endsWith(".json"),
  )) {
    const path = `${bundleDir}${file}`;
    const raw = readFileSync(path, "utf8");
    changedCount += JSON.parse(raw).questions.filter(
      (question) => fixQuestion(question) != null,
    ).length;
    const fixedRaw = fixParticles(raw);
    if (fixedRaw !== raw && !dryRun) writeFileSync(path, fixedRaw);
  }
  console.log(`번들 교정 ${changedCount}문항${dryRun ? " (dry-run)" : ""}`);
}

// 운영 DB 문항 교정
async function fixDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL 이 비어 있습니다");
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(
      `select id, prompt, explanation, choices from public.questions
       where prompt like '%은(는)%' or explanation like '%은(는)%' or choices::text like '%은(는)%'`,
    );
    const updates = rows.flatMap((row) => {
      const fixed = fixQuestion(row);
      return fixed == null ? [] : [{ id: row.id, ...fixed }];
    });
    console.log(`교정 대상 ${updates.length}문항${dryRun ? " (dry-run)" : ""}`);
    if (dryRun) return;
    await client.query("begin");
    for (const update of updates)
      await client.query(
        "update public.questions set prompt=$2, explanation=$3, choices=$4 where id=$1",
        [
          update.id,
          update.prompt,
          update.explanation,
          JSON.stringify(update.choices),
        ],
      );
    await client.query("commit");
    console.log(`교정 완료 ${updates.length}문항`);
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

if (process.argv.includes("--bundles")) fixBundles();
if (process.argv.includes("--db")) await fixDatabase();
