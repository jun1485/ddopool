// 시험 요청 운영 CLI (service role 전용)
// 사용법:
//   node scripts/admin-requests.mjs list [--status requested] [--limit 30]
//   node scripts/admin-requests.mjs set-status <requestId> <status> [--note "메모"] [--exam-id <examSlug>]

const REQUEST_STATUSES = [
  'requested',
  'triage',
  'approved',
  'sourcing',
  'draft',
  'review',
  'published',
  'duplicate',
  'rejected',
  'blocked',
  'archived',
];

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

// 요청 목록 출력
async function listRequests() {
  let query = supabase
    .from('exam_requests')
    .select('id, display_name, status, vote_count, organization, grade_level, created_at, published_exam_id')
    .order('vote_count', { ascending: false })
    .limit(Number(options.limit ?? 30));
  if (options.status) query = query.eq('status', options.status);

  const { data, error } = await query;
  if (error) {
    console.error(`조회 실패: ${error.message}`);
    process.exit(1);
  }
  if (!data || data.length === 0) {
    console.log('표시할 요청이 없습니다');
    return;
  }
  for (const request of data) {
    const meta = [request.organization, request.grade_level].filter(Boolean).join(' · ');
    console.log(
      `[${request.status}] 투표 ${request.vote_count}  ${request.display_name}${meta ? ` (${meta})` : ''}\n` +
        `  id=${request.id}  등록=${request.created_at}${request.published_exam_id ? `  공개시험=${request.published_exam_id}` : ''}`,
    );
  }
}

// 요청 상태 변경 (트리거가 이력·공개 알림 자동 처리)
async function setStatus() {
  const [, requestId, nextStatus] = positional;
  if (!requestId || !nextStatus) {
    console.error('사용법: set-status <requestId> <status> [--note ...] [--exam-id ...]');
    process.exit(1);
  }
  if (!REQUEST_STATUSES.includes(nextStatus)) {
    console.error(`유효하지 않은 상태입니다: ${nextStatus}\n허용 값: ${REQUEST_STATUSES.join(', ')}`);
    process.exit(1);
  }

  const { data: existing, error: fetchError } = await supabase
    .from('exam_requests')
    .select('id, display_name, status, published_exam_id')
    .eq('id', requestId)
    .maybeSingle();
  if (fetchError) {
    console.error(`조회 실패: ${fetchError.message}`);
    process.exit(1);
  }
  if (!existing) {
    console.error('존재하지 않는 요청입니다');
    process.exit(1);
  }

  // published 전환은 공개 시험 연결 필수 (알림 payload에 exam_id 포함)
  const examId = options['exam-id'] ?? existing.published_exam_id;
  if (nextStatus === 'published' && !examId) {
    console.error('published 전환에는 --exam-id 로 공개할 시험 연결이 필요합니다');
    process.exit(1);
  }

  const patch = { status: nextStatus };
  if (options.note) patch.admin_note = options.note;
  if (options['exam-id']) patch.published_exam_id = options['exam-id'];

  const { data, error } = await supabase
    .from('exam_requests')
    .update(patch)
    .eq('id', requestId)
    .select('id, display_name, status, vote_count, published_exam_id')
    .single();
  if (error) {
    console.error(`상태 변경 실패: ${error.message}`);
    process.exit(1);
  }

  console.log(
    `변경 완료: ${data.display_name}  ${existing.status} → ${data.status}` +
      `${data.published_exam_id ? `  (시험: ${data.published_exam_id})` : ''}` +
      `${data.status === 'published' ? `\n투표자 ${data.vote_count}명에게 공개 알림이 생성됩니다` : ''}`,
  );
}

if (command === 'list') {
  await listRequests();
} else if (command === 'set-status') {
  await setStatus();
} else {
  console.error('사용법: node scripts/admin-requests.mjs <list|set-status> ...');
  process.exit(1);
}
