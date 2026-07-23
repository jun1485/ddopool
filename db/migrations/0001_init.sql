-- Exam Loop 초기 스키마 (Supabase Postgres 기준)
-- 적용 방법: Supabase SQL Editor에 전체 실행 또는 supabase db push

-- #region ENUM 정의
-- 시험 노출 상태
create type public.exam_status as enum ('draft', 'active', 'outdated');

-- 시험 요청 상태 머신
create type public.exam_request_status as enum (
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
  'archived'
);

-- 문제 상태 머신
create type public.question_status as enum (
  'imported',
  'validating',
  'needs_review',
  'approved',
  'published',
  'retired'
);

-- 문제 출처 유형
create type public.question_source_type as enum ('public_past_exam', 'ai_generated', 'manual');

-- 검수 판정
create type public.review_verdict as enum ('approved', 'rejected', 'needs_fix');

-- 오류 신고 처리 상태
create type public.report_status as enum ('open', 'accepted', 'dismissed');

-- 사용자 역할
create type public.user_role as enum ('user', 'admin');

-- 알림 유형
create type public.notification_type as enum ('exam_published', 'request_status_changed');
-- #endregion

-- #region 공용 함수
-- 시험명 정규화 (중복 요청 병합 키)
create function public.normalize_exam_name(input text)
returns text
language sql
immutable
as $$
  select regexp_replace(lower(coalesce(input, '')), '[^0-9a-z가-힣]', '', 'g');
$$;

-- updated_at 자동 갱신
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
-- #endregion

-- #region 사용자 프로필
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nickname text,
  role public.user_role not null default 'user',
  created_at timestamptz not null default now()
);

-- 관리자 여부 판별
create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- 신규 auth 사용자 프로필 자동 생성
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
-- #endregion

-- #region 시험 카탈로그
create table public.exams (
  id text primary key,
  title text not null,
  short_title text not null,
  description text not null default '',
  icon text not null default '📚',
  status public.exam_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger exams_set_updated_at
  before update on public.exams
  for each row execute function public.set_updated_at();

create table public.exam_subjects (
  id bigint generated always as identity primary key,
  exam_id text not null references public.exams (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  unique (exam_id, name)
);

-- 검색용 시험 별칭 (약칭·영문명·흔한 오타)
create table public.exam_aliases (
  id bigint generated always as identity primary key,
  exam_id text not null references public.exams (id) on delete cascade,
  alias text not null,
  unique (exam_id, alias)
);
-- #endregion

-- #region 콘텐츠 출처
create table public.content_sources (
  id bigint generated always as identity primary key,
  exam_id text references public.exams (id) on delete set null,
  name text not null,
  url text,
  license text not null default 'unknown',
  source_type public.question_source_type not null,
  collected_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);
-- #endregion

-- #region 문제은행
create table public.questions (
  id text primary key,
  exam_id text not null references public.exams (id) on delete cascade,
  subject text not null,
  prompt text not null,
  choices jsonb not null,
  answer_index smallint not null,
  explanation text not null default '',
  difficulty smallint,
  status public.question_status not null default 'needs_review',
  source_id bigint references public.content_sources (id) on delete set null,
  source_type public.question_source_type not null default 'manual',
  version int not null default 1,
  published_at timestamptz,
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint questions_choices_range check (jsonb_typeof(choices) = 'array' and jsonb_array_length(choices) between 2 and 6),
  constraint questions_answer_in_range check (answer_index >= 0 and answer_index < jsonb_array_length(choices))
);

create index questions_exam_status_idx on public.questions (exam_id, status);

create trigger questions_set_updated_at
  before update on public.questions
  for each row execute function public.set_updated_at();

-- 문제 변경 이력 스냅샷
create table public.question_versions (
  id bigint generated always as identity primary key,
  question_id text not null references public.questions (id) on delete cascade,
  version int not null,
  snapshot jsonb not null,
  changed_by uuid references public.profiles (id) on delete set null,
  change_reason text,
  created_at timestamptz not null default now(),
  unique (question_id, version)
);

-- 문제 스냅샷 직렬화
create function public.question_snapshot(q public.questions)
returns jsonb
language sql
immutable
as $$
  select jsonb_build_object(
    'subject', q.subject,
    'prompt', q.prompt,
    'choices', q.choices,
    'answer_index', q.answer_index,
    'explanation', q.explanation,
    'difficulty', q.difficulty,
    'status', q.status
  );
$$;

-- 신규 문제 version 1 스냅샷 기록
create function public.handle_question_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.question_versions (question_id, version, snapshot, changed_by)
  values (new.id, new.version, public.question_snapshot(new), auth.uid());
  return new;
end;
$$;

create trigger question_versions_on_insert
  after insert on public.questions
  for each row execute function public.handle_question_insert();

-- 핵심 필드 변경 시 version 증가
create function public.bump_question_version()
returns trigger
language plpgsql
as $$
begin
  if new.prompt is distinct from old.prompt
    or new.choices is distinct from old.choices
    or new.answer_index is distinct from old.answer_index
    or new.explanation is distinct from old.explanation
    or new.subject is distinct from old.subject then
    new.version := old.version + 1;
  else
    -- 외부 입력 version 무시 (역행 저장 방지)
    new.version := old.version;
  end if;
  return new;
end;
$$;

create trigger questions_bump_version
  before update on public.questions
  for each row execute function public.bump_question_version();

-- version 증가분 스냅샷 기록
create function public.handle_question_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.version > old.version then
    insert into public.question_versions (question_id, version, snapshot, changed_by)
    values (new.id, new.version, public.question_snapshot(new), auth.uid());
  end if;
  return new;
end;
$$;

create trigger question_versions_on_update
  after update on public.questions
  for each row execute function public.handle_question_update();

-- 관리자 검수 기록
create table public.question_reviews (
  id bigint generated always as identity primary key,
  question_id text not null references public.questions (id) on delete cascade,
  reviewer_id uuid references public.profiles (id) on delete set null,
  verdict public.review_verdict not null,
  note text,
  created_at timestamptz not null default now()
);

-- 사용자 문제 오류 신고
create table public.question_reports (
  id bigint generated always as identity primary key,
  question_id text not null references public.questions (id) on delete cascade,
  reporter_id uuid references public.profiles (id) on delete set null,
  reason text not null,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
-- #endregion

-- #region 시험 요청 (수요 수집)
create table public.exam_requests (
  id uuid primary key default gen_random_uuid(),
  normalized_name text not null unique,
  display_name text not null,
  organization text,
  grade_level text,
  exam_url text,
  language text not null default 'ko',
  note text,
  status public.exam_request_status not null default 'requested',
  vote_count int not null default 0,
  requester_id uuid references public.profiles (id) on delete set null,
  admin_priority int,
  admin_note text,
  copyright_note text,
  target_publish_date date,
  published_exam_id text references public.exams (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index exam_requests_status_votes_idx on public.exam_requests (status, vote_count desc);

create trigger exam_requests_set_updated_at
  before update on public.exam_requests
  for each row execute function public.set_updated_at();

-- 나도 필요해요 투표
create table public.exam_request_votes (
  request_id uuid not null references public.exam_requests (id) on delete cascade,
  voter_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (request_id, voter_id)
);

-- 투표 수 집계 반영
create function public.sync_exam_request_vote_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 델타 가감 방식 (동시 투표 시 재집계 lost update 방지)
  update public.exam_requests
  set vote_count = greatest(vote_count + case tg_op when 'INSERT' then 1 else -1 end, 0)
  where id = coalesce(new.request_id, old.request_id);
  return null;
end;
$$;

create trigger exam_request_votes_sync_count
  after insert or delete on public.exam_request_votes
  for each row execute function public.sync_exam_request_vote_count();

-- 요청 상태 변경 이력
create table public.exam_request_status_history (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.exam_requests (id) on delete cascade,
  from_status public.exam_request_status,
  to_status public.exam_request_status not null,
  changed_by uuid references public.profiles (id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

-- 상태 변경 이력 자동 기록
create function public.log_exam_request_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.exam_request_status_history (request_id, from_status, to_status, changed_by)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into public.exam_request_status_history (request_id, from_status, to_status, changed_by)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger exam_requests_log_status
  after insert or update on public.exam_requests
  for each row execute function public.log_exam_request_status_change();
-- #endregion

-- #region 알림
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type public.notification_type not null,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications (user_id, read_at);

-- 요청 시험 공개 시 투표자 전원 알림 생성
create function public.notify_exam_request_published()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'published' and old.status is distinct from new.status then
    insert into public.notifications (user_id, type, payload)
    select
      v.voter_id,
      'exam_published',
      jsonb_build_object(
        'request_id', new.id,
        'exam_id', new.published_exam_id,
        'display_name', new.display_name
      )
    from public.exam_request_votes v
    where v.request_id = new.id
      -- 재공개 전이 시 중복 알림 방지
      and not exists (
        select 1 from public.notifications n
        where n.user_id = v.voter_id
          and n.type = 'exam_published'
          and n.payload->>'request_id' = new.id::text
      );
  end if;
  return new;
end;
$$;

create trigger exam_requests_notify_published
  after update on public.exam_requests
  for each row execute function public.notify_exam_request_published();
-- #endregion

-- #region 감사 로그
create table public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
-- #endregion

-- #region RPC
-- 시험 요청 등록 (동일 시험 기존 요청 존재 시 투표 처리)
create function public.request_exam(
  p_display_name text,
  p_organization text default null,
  p_grade_level text default null,
  p_exam_url text default null,
  p_note text default null
)
returns public.exam_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized text := public.normalize_exam_name(p_display_name);
  v_request public.exam_requests;
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;
  if length(v_normalized) < 2 then
    raise exception '시험명을 2자 이상 입력해 주세요';
  end if;
  -- 입력 길이 상한 (익명 계정 남용 방어)
  if length(p_display_name) > 100
    or coalesce(length(p_organization), 0) > 100
    or coalesce(length(p_grade_level), 0) > 50
    or coalesce(length(p_exam_url), 0) > 300
    or coalesce(length(p_note), 0) > 500 then
    raise exception '입력 길이 제한을 초과했습니다';
  end if;

  select * into v_request
  from public.exam_requests
  where normalized_name = v_normalized;

  -- 동시 등록 경합 시 기존 요청에 투표 합류
  if v_request.id is null then
    insert into public.exam_requests (
      normalized_name, display_name, organization, grade_level, exam_url, note, requester_id
    )
    values (v_normalized, p_display_name, p_organization, p_grade_level, p_exam_url, p_note, auth.uid())
    on conflict (normalized_name) do nothing
    returning * into v_request;

    if v_request.id is null then
      select * into v_request from public.exam_requests where normalized_name = v_normalized;
    end if;
  end if;

  insert into public.exam_request_votes (request_id, voter_id)
  values (v_request.id, auth.uid())
  on conflict do nothing;

  select * into v_request from public.exam_requests where id = v_request.id;
  -- 운영 메타 비노출
  v_request.requester_id := null;
  v_request.admin_priority := null;
  v_request.admin_note := null;
  v_request.copyright_note := null;
  v_request.target_publish_date := null;
  return v_request;
end;
$$;

-- 요청 상태 변경 (관리자 전용, 공개 시 시험 연결)
create function public.update_exam_request_status(
  p_request_id uuid,
  p_status public.exam_request_status,
  p_note text default null,
  p_published_exam_id text default null
)
returns public.exam_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request public.exam_requests;
begin
  if not public.is_admin() then
    raise exception '관리자 권한이 필요합니다';
  end if;

  -- published 전환은 시험 연결 필수 (알림 payload exam_id 보장)
  if p_status = 'published' and p_published_exam_id is null then
    perform 1 from public.exam_requests
    where id = p_request_id and published_exam_id is not null;
    if not found then
      raise exception 'published 전환에는 published_exam_id 연결이 필요합니다';
    end if;
  end if;

  update public.exam_requests
  set
    status = p_status,
    admin_note = coalesce(p_note, admin_note),
    published_exam_id = coalesce(p_published_exam_id, published_exam_id)
  where id = p_request_id
  returning * into v_request;

  if v_request.id is null then
    raise exception '존재하지 않는 요청입니다';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, payload)
  values (
    auth.uid(),
    'update_exam_request_status',
    'exam_request',
    p_request_id::text,
    jsonb_build_object('status', p_status, 'note', p_note, 'published_exam_id', p_published_exam_id)
  );

  return v_request;
end;
$$;

revoke execute on function public.request_exam(text, text, text, text, text) from public, anon;
revoke execute on function public.update_exam_request_status(uuid, public.exam_request_status, text, text) from public, anon;
grant execute on function public.request_exam(text, text, text, text, text) to authenticated;
grant execute on function public.update_exam_request_status(uuid, public.exam_request_status, text, text) to authenticated;
-- #endregion

-- #region 보조 인덱스 (FK cascade·역참조 조회)
create index questions_source_idx on public.questions (source_id);
create index content_sources_exam_idx on public.content_sources (exam_id);
create index question_reports_question_idx on public.question_reports (question_id);
create index question_reports_reporter_idx on public.question_reports (reporter_id);
create index exam_requests_requester_idx on public.exam_requests (requester_id);
create index exam_requests_published_exam_idx on public.exam_requests (published_exam_id);
create index exam_request_votes_voter_idx on public.exam_request_votes (voter_id);
-- #endregion

-- #region RLS 정책
alter table public.profiles enable row level security;
alter table public.exams enable row level security;
alter table public.exam_subjects enable row level security;
alter table public.exam_aliases enable row level security;
alter table public.content_sources enable row level security;
alter table public.questions enable row level security;
alter table public.question_versions enable row level security;
alter table public.question_reviews enable row level security;
alter table public.question_reports enable row level security;
alter table public.exam_requests enable row level security;
alter table public.exam_request_votes enable row level security;
alter table public.exam_request_status_history enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- profiles: 본인 조회·수정 (role 변경은 service role 전용)
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- role 등 민감 컬럼 클라이언트 수정 차단 (nickname만 허용)
revoke update on public.profiles from anon, authenticated;
grant update (nickname) on public.profiles to authenticated;

-- exams: active 공개, 관리자 전체 접근
create policy exams_public_read on public.exams
  for select using (status = 'active' or public.is_admin());
create policy exams_admin_write on public.exams
  for all using (public.is_admin()) with check (public.is_admin());

-- exam_subjects: 공개 시험 과목 공개
create policy exam_subjects_public_read on public.exam_subjects
  for select using (
    exists (select 1 from public.exams e where e.id = exam_id and (e.status = 'active' or public.is_admin()))
  );
create policy exam_subjects_admin_write on public.exam_subjects
  for all using (public.is_admin()) with check (public.is_admin());

-- exam_aliases: 공개 읽기, 관리자 쓰기
create policy exam_aliases_public_read on public.exam_aliases for select using (true);
create policy exam_aliases_admin_write on public.exam_aliases
  for all using (public.is_admin()) with check (public.is_admin());

-- content_sources: 출처 공개 읽기, 관리자 쓰기
create policy content_sources_public_read on public.content_sources for select using (true);
create policy content_sources_admin_write on public.content_sources
  for all using (public.is_admin()) with check (public.is_admin());

-- questions: published만 공개, 관리자 전체 접근
create policy questions_public_read on public.questions
  for select using (
    (status = 'published'
      and exists (select 1 from public.exams e where e.id = exam_id and e.status = 'active'))
    or public.is_admin()
  );
create policy questions_admin_write on public.questions
  for all using (public.is_admin()) with check (public.is_admin());

-- question_versions / question_reviews: 관리자 전용
create policy question_versions_admin_read on public.question_versions
  for select using (public.is_admin());
create policy question_reviews_admin_all on public.question_reviews
  for all using (public.is_admin()) with check (public.is_admin());

-- question_reports: 본인 신고 등록·조회, 관리자 전체
create policy question_reports_insert_own on public.question_reports
  for insert with check (reporter_id = auth.uid());
create policy question_reports_select_own on public.question_reports
  for select using (reporter_id = auth.uid() or public.is_admin());
create policy question_reports_admin_update on public.question_reports
  for update using (public.is_admin()) with check (public.is_admin());

-- exam_requests: 공개 읽기(검색·투표수 노출), 쓰기는 RPC 전용
create policy exam_requests_public_read on public.exam_requests for select using (true);

-- 운영 메타 컬럼 비노출 (공개 컬럼만 select 허용)
revoke select on public.exam_requests from anon, authenticated;
grant select (id, normalized_name, display_name, organization, grade_level, exam_url, language, note, status, vote_count, published_exam_id, created_at, updated_at)
  on public.exam_requests to anon, authenticated;

-- exam_request_votes: 공개 읽기, 본인 투표 등록·취소
create policy exam_request_votes_public_read on public.exam_request_votes for select using (true);
create policy exam_request_votes_insert_own on public.exam_request_votes
  for insert with check (voter_id = auth.uid());
create policy exam_request_votes_delete_own on public.exam_request_votes
  for delete using (voter_id = auth.uid());

-- exam_request_status_history: 공개 읽기 (요청 상태 타임라인)
create policy exam_request_status_history_public_read on public.exam_request_status_history
  for select using (true);

-- notifications: 본인 조회·읽음 처리
create policy notifications_select_own on public.notifications
  for select using (user_id = auth.uid());
create policy notifications_update_own on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 알림 본문 변조 차단 (read_at만 갱신 허용)
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

-- audit_logs: 관리자 전용
create policy audit_logs_admin_read on public.audit_logs
  for select using (public.is_admin());
-- #endregion
