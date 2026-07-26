// 시드·번들 전체 교차 검증 (파일 간 id·문항 중복, 시험별 문항 수, 정답 위치 분포)
// 사용법: node scripts/check-bundles.mjs
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const seedDir = resolve(scriptDir, "..", "seed");
const bundleDir = join(seedDir, "bundles");

// 중복 비교용 문구 정규화
function normalizeText(input) {
  return String(input ?? "")
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]/g, "");
}

// 검증 대상 콘텐츠 파일 수집
function collectFiles() {
  const files = [join(seedDir, "initial-content.json")];
  try {
    for (const name of readdirSync(bundleDir)) {
      if (name.endsWith(".json")) files.push(join(bundleDir, name));
    }
  } catch {
    // 번들 디렉터리가 없으면 시드 파일만 검증
  }
  return files;
}

const errors = [];
const questionIds = new Map();
const promptKeys = new Map();
const examDefinitions = new Map();
const perExam = new Map();
const perSubject = new Map();
const answerCounts = new Map();

for (const file of collectFiles()) {
  const content = JSON.parse(readFileSync(file, "utf8"));
  const subjectsByExam = new Map(
    (content.exams ?? []).map((exam) => [
      exam.id,
      new Set(exam.subjects ?? []),
    ]),
  );

  for (const exam of content.exams ?? []) {
    const previous = examDefinitions.get(exam.id);
    // 같은 시험이 여러 파일에 정의될 때 메타 불일치 탐지
    if (previous != null && previous.definition !== JSON.stringify(exam)) {
      errors.push(`시험 메타 불일치: ${exam.id} (${previous.file} ↔ ${file})`);
    }
    examDefinitions.set(exam.id, { definition: JSON.stringify(exam), file });
  }

  for (const question of content.questions ?? []) {
    if (questionIds.has(question.id)) {
      errors.push(
        `id 중복: ${question.id} (${questionIds.get(question.id)} ↔ ${file})`,
      );
    } else {
      questionIds.set(question.id, file);
    }

    const promptKey = `${question.examId}:${normalizeText(question.prompt)}`;
    if (promptKeys.has(promptKey)) {
      errors.push(`문항 중복: ${question.id} ↔ ${promptKeys.get(promptKey)}`);
    } else {
      promptKeys.set(promptKey, question.id);
    }

    const subjects = subjectsByExam.get(question.examId);
    if (subjects != null && !subjects.has(question.subject)) {
      errors.push(`과목 불일치: ${question.id} → ${question.subject}`);
    }

    perExam.set(question.examId, (perExam.get(question.examId) ?? 0) + 1);
    const subjectKey = `${question.examId} / ${question.subject}`;
    perSubject.set(subjectKey, (perSubject.get(subjectKey) ?? 0) + 1);

    const counts = answerCounts.get(question.examId) ?? new Map();
    counts.set(
      question.answerIndex,
      (counts.get(question.answerIndex) ?? 0) + 1,
    );
    answerCounts.set(question.examId, counts);
  }
}

console.log("시험별 문항 수");
let total = 0;
for (const [examId, count] of [...perExam].sort((a, b) => b[1] - a[1])) {
  const counts = answerCounts.get(examId);
  const positions = [...counts.keys()].reduce(
    (max, key) => Math.max(max, key + 1),
    0,
  );
  const expected = count / positions;
  const deviation = [...Array(positions).keys()].reduce(
    (max, position) =>
      Math.max(max, Math.abs((counts.get(position) ?? 0) - expected)),
    0,
  );
  // 정답 위치가 한쪽으로 치우치면 학습 효과가 훼손되므로 비율로 경고
  const skewed = deviation / count > 0.08;
  console.log(
    `  ${examId}: ${count}문항 · 정답 위치 최대 편차 ${deviation.toFixed(1)}${skewed ? " ⚠ 편중" : ""}`,
  );
  total += count;
}
console.log(`  합계: ${total}문항\n`);

console.log("과목별 문항 수");
for (const [key, count] of [...perSubject].sort()) {
  console.log(`  ${key}: ${count}`);
}

if (errors.length > 0) {
  console.error(`\n검증 실패 ${errors.length}건`);
  for (const error of errors) console.error(`  ${error}`);
  process.exit(1);
}
console.log("\n교차 검증 통과 — id·문항 중복 없음");
