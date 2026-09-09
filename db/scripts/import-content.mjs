// 시드/검수 통과 콘텐츠 JSON을 Supabase에 업서트 (service role 전용)
// 사용법: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/import-content.mjs [JSON경로] [--status needs_review] [--dry-run]
// 파일 포맷: packages/contracts ContentBundle 타입 (exams + questions)
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));

// 실행 인자 해석
function parseArgs(argv) {
  const args = {
    file: resolve(scriptDir, "..", "seed", "initial-content.json"),
    status: "needs_review",
    dryRun: false,
  };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--status") {
      args.status = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--dry-run") {
      args.dryRun = true;
    } else {
      args.file = resolve(process.cwd(), argv[i]);
    }
  }
  return args;
}

// 중복 비교용 문구 정규화
function normalizeText(input) {
  return String(input ?? "")
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]/g, "");
}

// 콘텐츠 JSON 구조 검증 (파일 내 중복 문제 포함)
function validateContent(content) {
  const errors = [];
  const examIds = new Set();
  const promptKeys = new Map();

  if (!Array.isArray(content.exams) || content.exams.length === 0) {
    errors.push("exams 배열이 비어 있습니다");
  }
  for (const exam of content.exams ?? []) {
    if (!exam.id || !exam.title || !exam.shortTitle) {
      errors.push(
        `시험 필수 필드 누락: ${JSON.stringify(exam.id ?? exam.title)}`,
      );
      continue;
    }
    if (!Array.isArray(exam.subjects) || exam.subjects.length === 0) {
      errors.push(`시험 과목 누락: ${exam.id}`);
    }
    examIds.add(exam.id);
  }

  if (!Array.isArray(content.questions)) {
    errors.push("questions 배열이 없습니다");
  }
  for (const question of content.questions ?? []) {
    const label = question.id ?? "(id 없음)";
    if (
      !question.id ||
      !question.examId ||
      !question.subject ||
      !question.prompt
    ) {
      errors.push(`문제 필수 필드 누락: ${label}`);
      continue;
    }
    if (!examIds.has(question.examId)) {
      errors.push(`존재하지 않는 examId 참조: ${label} → ${question.examId}`);
    }
    if (
      !Array.isArray(question.choices) ||
      question.choices.length < 2 ||
      question.choices.length > 6
    ) {
      errors.push(`보기 개수 범위(2~6) 위반: ${label}`);
      continue;
    }
    if (
      !Number.isInteger(question.answerIndex) ||
      question.answerIndex < 0 ||
      question.answerIndex >= question.choices.length
    ) {
      errors.push(`answerIndex 범위 위반: ${label}`);
    }
    if (new Set(question.choices).size !== question.choices.length) {
      errors.push(`중복 보기 존재: ${label}`);
    }

    // 파일 내 동일 시험 중복 문항 탐지
    const promptKey = `${question.examId}:${normalizeText(question.prompt)}`;
    if (promptKeys.has(promptKey)) {
      errors.push(`파일 내 중복 문항: ${label} ↔ ${promptKeys.get(promptKey)}`);
    } else {
      promptKeys.set(promptKey, label);
    }
  }
  return errors;
}

// DB 기존 문항과 중복 탐지 (같은 id 업데이트는 허용, 다른 id 동일 지문은 차단)
async function findDbDuplicates(supabase, questions) {
  const examIds = [...new Set(questions.map((question) => question.examId))];
  const data = [];
  for (let from = 0; ; from += 500) {
    const { data: page, error } = await supabase
      .from("questions")
      .select("id, exam_id, prompt")
      .in("exam_id", examIds)
      .order("id")
      .range(from, from + 499);
    if (error) throw new Error("기존 문항 조회 실패");
    data.push(...page);
    if (page.length < 500) break;
  }

  const existingByKey = new Map();
  for (const row of data ?? []) {
    existingByKey.set(`${row.exam_id}:${normalizeText(row.prompt)}`, row.id);
  }

  const duplicates = [];
  for (const question of questions) {
    const existingId = existingByKey.get(
      `${question.examId}:${normalizeText(question.prompt)}`,
    );
    if (existingId != null && existingId !== question.id) {
      duplicates.push(`DB 중복 문항: ${question.id} ↔ 기존 ${existingId}`);
    }
  }
  return duplicates;
}

const { file, status, dryRun } = parseArgs(process.argv);
if (!["imported", "needs_review"].includes(status)) {
  console.error("새 콘텐츠는 검수 대기로만 업로드할 수 있습니다");
  process.exit(1);
}
const content = JSON.parse(readFileSync(file, "utf8"));

const structureErrors = validateContent(content);
if (structureErrors.length > 0) {
  console.error(`검증 실패 ${structureErrors.length}건:`);
  for (const error of structureErrors) console.error(`- ${error}`);
  process.exit(1);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  if (dryRun) {
    console.log(
      `구조 검증 통과 (dry-run): 시험 ${content.exams.length}개, 문제 ${content.questions.length}개\n` +
        "환경 변수가 없어 DB 중복 검사는 생략했습니다",
    );
    process.exit(0);
  }
  console.error(
    "SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경 변수가 필요합니다",
  );
  process.exit(1);
}

let createClient;
try {
  ({ createClient } = await import("@supabase/supabase-js"));
} catch {
  console.error(
    "의존성이 없습니다 — db 폴더에서 npm install 을 먼저 실행해 주세요",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const duplicateErrors = await findDbDuplicates(supabase, content.questions);
if (duplicateErrors.length > 0) {
  console.error(`DB 중복 검사 실패 ${duplicateErrors.length}건:`);
  for (const error of duplicateErrors) console.error(`- ${error}`);
  process.exit(1);
}

if (dryRun) {
  console.log(
    `검증 통과 (dry-run): 시험 ${content.exams.length}개, 문제 ${content.questions.length}개 — 업로드는 수행하지 않았습니다`,
  );
  process.exit(0);
}

// 시험 업서트
const examRows = content.exams.map((exam) => ({
  id: exam.id,
  title: exam.title,
  short_title: exam.shortTitle,
  description: exam.description ?? "",
  icon: exam.icon ?? "📚",
}));
const { error: examError } = await supabase
  .from("exams")
  .upsert(examRows, { onConflict: "id" });
if (examError) {
  console.error(`시험 업서트 실패: ${examError.message}`);
  process.exit(1);
}

// 과목 업서트
const subjectRows = content.exams.flatMap((exam) =>
  exam.subjects.map((name, index) => ({
    exam_id: exam.id,
    name,
    sort_order: index,
  })),
);
const { error: subjectError } = await supabase
  .from("exam_subjects")
  .upsert(subjectRows, { onConflict: "exam_id,name", ignoreDuplicates: true });
if (subjectError) {
  console.error(`과목 업서트 실패: ${subjectError.message}`);
  process.exit(1);
}

// 문제 업서트
const questionRows = content.questions.map((question) => ({
  id: question.id,
  exam_id: question.examId,
  subject: question.subject,
  prompt: question.prompt,
  choices: question.choices,
  answer_index: question.answerIndex,
  explanation: question.explanation ?? "",
  difficulty: question.difficulty ?? null,
  status,
  source_type: question.sourceType ?? "manual",
  source_id: question.sourceId ?? null,
}));
const { error: questionError } = await supabase
  .from("questions")
  .upsert(questionRows, { onConflict: "id" });
if (questionError) {
  console.error(`문제 업서트 실패: ${questionError.message}`);
  process.exit(1);
}

console.log(
  `업로드 완료: 시험 ${examRows.length}개, 과목 ${subjectRows.length}개, 문제 ${questionRows.length}개 (status=${status})`,
);
