// Supabase 셋업 수락 테스트 (마이그레이션 적용 직후 구조·트리거·RPC·RLS 자동 검증, 테스트 데이터 자가 정리)
// 사용법: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... [SUPABASE_ANON_KEY=...] node scripts/verify-setup.mjs
// SUPABASE_ANON_KEY 제공 시 실제 사용자 플로우(가입→요청→투표→승인 알림→RLS 차단)까지 검증

const REQUIRED_TABLES = [
  'profiles',
  'exams',
  'exam_subjects',
  'exam_aliases',
  'content_sources',
  'questions',
  'question_versions',
  'question_reviews',
  'question_reports',
  'exam_requests',
  'exam_request_votes',
  'exam_request_status_history',
  'notifications',
  'audit_logs',
  'user_exam_enrollments',
  'question_attempts',
  'user_question_progress',
  'user_bookmarks',
];

const TEST_EXAM_ID = 'setup-check-exam';
const TEST_QUESTION_ID = 'setup-check-q1';

const results = [];
let hasFailure = false;

// 검증 항목 결과 기록
function report(name, passed, detail = '') {
  results.push({ name, passed, detail });
  if (!passed) hasFailure = true;
  console.log(`${passed ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`);
}

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

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

const service = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

// #region 구조 검증 (테이블 존재)
console.log('\n[1/4] 테이블 존재 검증');
for (const table of REQUIRED_TABLES) {
  const { error } = await service.from(table).select('*', { count: 'exact', head: true });
  report(`테이블 ${table}`, error == null, error?.message ?? '');
}
// #endregion

// #region 트리거 검증 (버전 스냅샷·상태 이력) — 테스트 시험/문제 생성 후 정리
console.log('\n[2/4] 트리거 동작 검증');
await service.from('exams').delete().eq('id', TEST_EXAM_ID);

const { error: examInsertError } = await service
  .from('exams')
  .insert({ id: TEST_EXAM_ID, title: '셋업 검증용 시험', short_title: '셋업검증', status: 'draft' });
report('테스트 시험 생성', examInsertError == null, examInsertError?.message ?? '');

if (examInsertError == null) {
  const { error: questionInsertError } = await service.from('questions').insert({
    id: TEST_QUESTION_ID,
    exam_id: TEST_EXAM_ID,
    subject: '검증',
    prompt: '셋업 검증 문제?',
    choices: ['보기1', '보기2', '보기3', '보기4'],
    answer_index: 0,
    explanation: '검증용',
  });
  report('테스트 문제 생성', questionInsertError == null, questionInsertError?.message ?? '');

  await service.from('questions').update({ prompt: '셋업 검증 문제 (수정)?' }).eq('id', TEST_QUESTION_ID);
  const { data: versionRow } = await service
    .from('questions')
    .select('version')
    .eq('id', TEST_QUESTION_ID)
    .maybeSingle();
  report('문제 수정 시 version 증가 트리거', versionRow?.version === 2, `version=${versionRow?.version}`);

  const { count: snapshotCount } = await service
    .from('question_versions')
    .select('*', { count: 'exact', head: true })
    .eq('question_id', TEST_QUESTION_ID);
  report('버전 스냅샷 기록 트리거', snapshotCount === 2, `snapshots=${snapshotCount}`);

  // 잘못된 answer_index 차단 (check 제약)
  const { error: constraintError } = await service.from('questions').insert({
    id: `${TEST_QUESTION_ID}-bad`,
    exam_id: TEST_EXAM_ID,
    subject: '검증',
    prompt: '제약 검증?',
    choices: ['a', 'b'],
    answer_index: 5,
    explanation: '',
  });
  report('answer_index 범위 check 제약', constraintError != null);
}
// #endregion

// #region RPC 가드 검증 (service role은 auth.uid() null → 로그인 요구)
console.log('\n[3/4] RPC 검증');
const { error: rpcGuardError } = await service.rpc('request_exam', {
  p_display_name: '셋업검증테스트',
  p_organization: null,
  p_grade_level: null,
  p_exam_url: null,
  p_note: null,
});
report(
  'request_exam 존재·미인증 가드',
  rpcGuardError != null && rpcGuardError.message.includes('로그인'),
  rpcGuardError?.message ?? '가드 없이 통과됨',
);
// #endregion

// #region 사용자 플로우 검증 (SUPABASE_ANON_KEY 제공 시)
console.log('\n[4/4] 사용자 플로우 검증');
let testUserId = null;
let testRequestId = null;

if (!anonKey) {
  console.log('- SUPABASE_ANON_KEY 미제공 — 사용자 플로우 검증 생략');
} else {
  const testEmail = `setup-check-${Date.now()}@example.com`;
  const testPassword = `Check!${Date.now()}`;

  try {
    const { data: created, error: createUserError } = await service.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });
    report('테스트 사용자 생성 (admin API)', createUserError == null, createUserError?.message ?? '');
    testUserId = created?.user?.id ?? null;

    if (testUserId != null) {
      const { data: profileRow } = await service
        .from('profiles')
        .select('id')
        .eq('id', testUserId)
        .maybeSingle();
      report('가입 시 프로필 자동 생성 트리거', profileRow != null);

      const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
      const { error: signInError } = await userClient.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });
      report('이메일 로그인', signInError == null, signInError?.message ?? '');

      if (signInError == null) {
        // 요청 등록 + 자동 투표
        const { data: request, error: requestError } = await userClient
          .rpc('request_exam', {
            p_display_name: '셋업검증테스트시험',
            p_organization: null,
            p_grade_level: null,
            p_exam_url: null,
            p_note: null,
          })
          .single();
        report('request_exam 요청 등록', requestError == null && request?.id != null, requestError?.message ?? '');
        testRequestId = request?.id ?? null;
        report('자동 투표 집계 (vote_count=1)', request?.vote_count === 1, `vote_count=${request?.vote_count}`);
        report('RPC 반환 운영 메타 비노출', request?.admin_note == null && request?.requester_id == null);

        // 중복 요청 병합
        const { data: duplicated } = await userClient
          .rpc('request_exam', {
            p_display_name: '셋업 검증 테스트 시험!!',
            p_organization: null,
            p_grade_level: null,
            p_exam_url: null,
            p_note: null,
          })
          .single();
        report('동일 시험 중복 요청 병합', duplicated?.id === testRequestId && duplicated?.vote_count === 1);

        // RLS 차단: 일반 사용자의 요청 상태 직접 변경
        const { data: forbiddenUpdate } = await userClient
          .from('exam_requests')
          .update({ status: 'published' })
          .eq('id', testRequestId)
          .select('id');
        report('RLS 차단: 사용자 요청 상태 변경', (forbiddenUpdate ?? []).length === 0);

        // 컬럼 권한 차단: 운영 메타 select
        const { error: columnError } = await userClient
          .from('exam_requests')
          .select('admin_note')
          .eq('id', testRequestId);
        report('컬럼 권한 차단: admin_note 조회', columnError != null, columnError?.message ?? '차단 안 됨');

        // 승인 전환 → 투표자 알림 트리거
        await service.from('exam_requests').update({ status: 'approved' }).eq('id', testRequestId);
        const { data: notifications } = await userClient
          .from('notifications')
          .select('type, payload')
          .eq('type', 'request_status_changed');
        const approvalNotified = (notifications ?? []).some(
          (row) => row.payload?.request_id === testRequestId && row.payload?.status === 'approved',
        );
        report('승인 전환 시 투표자 알림 트리거', approvalNotified);

        // 익명 로그인 프로바이더 설정 확인 (참고용)
        const anonProbe = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
        const { error: anonError } = await anonProbe.auth.signInAnonymously();
        console.log(
          anonError == null
            ? '- 참고: Anonymous sign-in 활성화됨'
            : `- 참고: Anonymous sign-in 비활성 (${anonError.message})`,
        );
      }
    }
  } finally {
    // 테스트 데이터 정리
    if (testRequestId != null) await service.from('exam_requests').delete().eq('id', testRequestId);
    if (testUserId != null) await service.auth.admin.deleteUser(testUserId);
  }
}

await service.from('exams').delete().eq('id', TEST_EXAM_ID);
// #endregion

const passed = results.filter((row) => row.passed).length;
console.log(`\n검증 완료: ${passed}/${results.length} 통과${hasFailure ? ' — 실패 항목을 확인해 주세요' : ''}`);
process.exit(hasFailure ? 1 : 0);
