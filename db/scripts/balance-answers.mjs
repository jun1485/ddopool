// 시험 단위 정답 위치 균등 재배치 (여러 파일에 나뉜 같은 시험을 함께 계산)
// 사용법: node scripts/balance-answers.mjs [--dry-run]
// 주의: 업로드·검수 이후 실행하면 기존 문항의 보기 순서가 바뀌어 버전이 증가한다
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const seedDir = resolve(scriptDir, '..', 'seed');
const bundleDir = join(seedDir, 'bundles');
const dryRun = process.argv.includes('--dry-run');
const SALT_CANDIDATES = 64;

// id·솔트 기반 결정적 난수
function createRandom(seedText) {
  let seed = 2166136261;
  for (const char of seedText) {
    seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  }
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

// 보기 순서 재배치 결과 생성
function shuffleChoices(question, salt) {
  const random = createRandom(`${question.id}:${salt}`);
  const answer = question.choices[question.answerIndex];
  const shuffled = [...question.choices];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return { choices: shuffled, answerIndex: shuffled.indexOf(answer) };
}

// 정답 위치 최대 편차 계산
function deviationOf(questions, salt) {
  const counts = new Map();
  let positions = 0;
  for (const question of questions) {
    const { answerIndex } = shuffleChoices(question, salt);
    counts.set(answerIndex, (counts.get(answerIndex) ?? 0) + 1);
    positions = Math.max(positions, question.choices.length);
  }
  const expected = questions.length / positions;
  let deviation = 0;
  for (let position = 0; position < positions; position += 1) {
    deviation = Math.max(deviation, Math.abs((counts.get(position) ?? 0) - expected));
  }
  return deviation;
}

// 검증 대상 콘텐츠 파일 수집
function collectFiles() {
  const files = [join(seedDir, 'initial-content.json')];
  try {
    for (const name of readdirSync(bundleDir)) {
      if (name.endsWith('.json')) files.push(join(bundleDir, name));
    }
  } catch {
    // 번들 디렉터리가 없으면 시드 파일만 처리
  }
  return files;
}

const files = collectFiles();
const loaded = files.map((file) => ({ file, content: JSON.parse(readFileSync(file, 'utf8')) }));

const byExam = new Map();
for (const { content } of loaded) {
  for (const question of content.questions ?? []) {
    if (!byExam.has(question.examId)) byExam.set(question.examId, []);
    byExam.get(question.examId).push(question);
  }
}

const saltByExam = new Map();
for (const [examId, questions] of byExam) {
  let best = { salt: 0, deviation: Number.POSITIVE_INFINITY };
  for (let salt = 0; salt < SALT_CANDIDATES; salt += 1) {
    const deviation = deviationOf(questions, salt);
    if (deviation < best.deviation) best = { salt, deviation };
  }
  saltByExam.set(examId, best.salt);
  console.log(
    `${examId}: ${questions.length}문항 · 최대 편차 ${deviationOf(questions, best.salt).toFixed(1)} (salt=${best.salt})`,
  );
}

for (const { file, content } of loaded) {
  for (const question of content.questions ?? []) {
    const { choices, answerIndex } = shuffleChoices(question, saltByExam.get(question.examId));
    question.choices = choices;
    question.answerIndex = answerIndex;
  }
  if (!dryRun) writeFileSync(file, `${JSON.stringify(content, null, 2)}\n`, 'utf8');
}

console.log(dryRun ? '\n계산만 수행 (dry-run)' : `\n${loaded.length}개 파일 재배치 완료`);
