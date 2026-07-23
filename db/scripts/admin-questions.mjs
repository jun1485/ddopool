// 문제 검수·공개 운영 CLI (service role 전용)
// 사용법:
//   node scripts/admin-questions.mjs list [--status needs_review] [--exam <examId>] [--limit 30]
//   node scripts/admin-questions.mjs show <questionId>
//   node scripts/admin-questions.mjs review <questionId> <approved|rejected|needs_fix> [--note "메모"]
//   node scripts/admin-questions.mjs publish --id <questionId> | --exam <examId>

const REVIEW_VERDICTS = ['approved', 'rejected', 'needs_fix'];

// 검수 판정별 문제 상태 매핑
const STATUS_BY_VERDICT = {
  approved: 'approved',
  rejected: 'retired',
  needs_fix: 'needs_review',
};

// 실행 인자 해석
function parseArgs(argv) {
  const positional = [];
  const options = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) {
      options[argv[i].slice(2)] = argv[i + 1];
      i += 1;
    } else {
      positional.push(argv[i]);
    }
  }
  return { positional, options };
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error('SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 환경 변수가 필요합니다');
  process.exit(1);
}

let createClient;
try {
  ({ createClient } = await import('@supabase/supabase-js'));
} catch {
  console.error('의존성이 없습니다 — db 폴더에서 npm install 을 먼저 실행해 주세요');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
const { positional, options } = parseArgs(process.argv);
const command = positional[0];

// 검수 대상 문제 목록 출력
async function listQuestions() {
  let query = supabase
    .from('questions')
    .select('id, exam_id, subject, prompt, status, source_type, version')
    .order('exam_id')
    .order('id')
    .limit(Number(options.limit ?? 30));
  if (options.status) query = query.eq('status', options.status);
  if (options.exam) query = query.eq('exam_id', options.exam);

  const { data, error } = await query;
  if (error) {
    console.error(`조회 실패: ${error.message}`);
    process.exit(1);
  }
  if (!data || data.length === 0) {
    console.log('표시할 문제가 없습니다');
    return;
  }
  for (const question of data) {
    const promptPreview =
      question.prompt.length > 60 ? `${question.prompt.slice(0, 60)}…` : question.prompt;
    console.log(
      `[${question.status}] ${question.id} (${question.exam_id} · ${question.subject} · ${question.source_type} · v${question.version})\n  ${promptPreview}`,
    );
  }
}

// 문제 상세 출력
async function showQuestion() {
  const [, questionId] = positional;
  if (!questionId) {
    console.error('사용법: show <questionId>');
    process.exit(1);
  }

  const { data, error } = await supabase
    .from('questions')
    .select('*')
    .eq('id', questionId)
    .maybeSingle();
  if (error) {
    console.error(`조회 실패: ${error.message}`);
    process.exit(1);
  }
  if (!data) {
    console.error('존재하지 않는 문제입니다');
    process.exit(1);
  }

  console.log(`[${data.status}] ${data.id} (${data.exam_id} · ${data.subject} · v${data.version})`);
  console.log(`\n${data.prompt}\n`);
  data.choices.forEach((choice, index) => {
    console.log(`${index === data.answer_index ? '✓' : ' '} ${index}. ${choice}`);
  });
  console.log(`\n해설: ${data.explanation}`);
}

// 검수 판정 기록 및 문제 상태 전환
async function reviewQuestion() {
  const [, questionId, verdict] = positional;
  if (!questionId || !REVIEW_VERDICTS.includes(verdict)) {
    console.error(`사용법: review <questionId> <${REVIEW_VERDICTS.join('|')}> [--note ...]`);
    process.exit(1);
  }

  const { error: reviewError } = await supabase
    .from('question_reviews')
    .insert({ question_id: questionId, verdict, note: options.note ?? null });
  if (reviewError) {
    console.error(`검수 기록 실패: ${reviewError.message}`);
    process.exit(1);
  }

  const nextStatus = STATUS_BY_VERDICT[verdict];
  const patch = { status: nextStatus };
  if (nextStatus === 'retired') patch.retired_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('questions')
    .update(patch)
    .eq('id', questionId)
    .select('id, status')
    .single();
  if (error) {
    console.error(`상태 전환 실패: ${error.message}`);
    process.exit(1);
  }
  console.log(`검수 완료: ${data.id} → ${data.status}`);
}

// 승인 문제 공개 전환 (단건 또는 시험 단위 일괄)
async function publishQuestions() {
  const patch = { status: 'published', published_at: new Date().toISOString() };

  if (options.id) {
    const { data: existing, error: fetchError } = await supabase
      .from('questions')
      .select('id, status')
      .eq('id', options.id)
      .maybeSingle();
    if (fetchError) {
      console.error(`조회 실패: ${fetchError.message}`);
      process.exit(1);
    }
    if (!existing) {
      console.error('존재하지 않는 문제입니다');
      process.exit(1);
    }
    if (existing.status !== 'approved') {
      console.error(`검수 승인(approved) 상태만 공개할 수 있습니다 (현재: ${existing.status})`);
      process.exit(1);
    }

    const { error } = await supabase.from('questions').update(patch).eq('id', options.id);
    if (error) {
      console.error(`공개 실패: ${error.message}`);
      process.exit(1);
    }
    console.log(`공개 완료: ${options.id}`);
    return;
  }

  if (options.exam) {
    const { data, error } = await supabase
      .from('questions')
      .update(patch)
      .eq('exam_id', options.exam)
      .eq('status', 'approved')
      .select('id');
    if (error) {
      console.error(`일괄 공개 실패: ${error.message}`);
      process.exit(1);
    }
    console.log(`일괄 공개 완료: ${options.exam} 시험 승인 문제 ${data?.length ?? 0}건`);
    return;
  }

  console.error('사용법: publish --id <questionId> 또는 publish --exam <examId>');
  process.exit(1);
}

if (command === 'list') {
  await listQuestions();
} else if (command === 'show') {
  await showQuestion();
} else if (command === 'review') {
  await reviewQuestion();
} else if (command === 'publish') {
  await publishQuestions();
} else {
  console.error('사용법: node scripts/admin-questions.mjs <list|show|review|publish> ...');
  process.exit(1);
}
