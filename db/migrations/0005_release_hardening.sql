-- 출시 준비 보강 (계정 삭제·요청 사전 검수·신고·이용 제한·푸시 토큰)
-- 적용 방법: 0004_sync_hardening.sql 이후 실행

-- #region 이용 제한 (차단 사용자)
alter table public.profiles
  add column banned_at timestamptz,
  add column banned_reason text;

-- 차단 계정 여부 판별
create function public.is_banned()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and banned_at is not null
  );
$$;

-- service role 요청 여부 판별 (로컬 어드민 웹은 사용자 세션 없이 호출)
create function public.is_service_role()
returns boolean
language sql
stable
as $$
  select coalesce(
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'role',
    ''
  ) = 'service_role';
$$;

-- 운영 권한 보유 여부 판별
create function public.has_admin_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_admin() or public.is_service_role();
$$;

-- 사용자 이용 제한 설정 (관리자 전용)
create function public.set_user_ban(
  p_user_id uuid,
  p_banned boolean,
  p_reason text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile public.profiles;
begin
  if not public.has_admin_access() then
    raise exception '관리자 권한이 필요합니다';
  end if;
  if p_user_id = (select auth.uid()) then
    raise exception '본인 계정은 제한할 수 없습니다';
  end if;

  update public.profiles
  set
    banned_at = case when p_banned then now() else null end,
    banned_reason = case when p_banned then p_reason else null end
  where id = p_user_id
  returning * into v_profile;

  if v_profile.id is null then
    raise exception '존재하지 않는 사용자입니다';
  end if;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, payload)
  values (
    auth.uid(),
    'set_user_ban',
    'profile',
    p_user_id::text,
    jsonb_build_object('banned', p_banned, 'reason', p_reason)
  );

  return v_profile;
end;
$$;

-- 사용자 목록 조회 (관리자 전용, 이용 제한 대상 식별)
create function public.admin_list_users(
  p_keyword text default null,
  p_limit int default 50
)
returns table (
  id uuid,
  email text,
  nickname text,
  role public.user_role,
  banned_at timestamptz,
  banned_reason text,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.has_admin_access() then
    raise exception '관리자 권한이 필요합니다';
  end if;

  return query
    select p.id, u.email::text, p.nickname, p.role, p.banned_at, p.banned_reason, p.created_at
    from public.profiles p
    join auth.users u on u.id = p.id
    where coalesce(p_keyword, '') = ''
      or u.email ilike '%' || p_keyword || '%'
      or coalesce(p.nickname, '') ilike '%' || p_keyword || '%'
      or p.id::text = p_keyword
    order by p.created_at desc
    limit least(coalesce(p_limit, 50), 200);
end;
$$;
-- #endregion

-- #region 금칙어 필터
-- 정규화 형태(소문자·공백/특수문자 제거)로 저장
create table public.banned_terms (
  term text primary key,
  created_at timestamptz not null default now(),
  constraint banned_terms_term_length check (length(term) between 2 and 50)
);

-- 금칙어 포함 여부 판별 (정규화 후 부분 일치)
create function public.contains_banned_term(input text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.banned_terms
    where public.normalize_exam_name(input) like '%' || term || '%'
  );
$$;

insert into public.banned_terms (term) values
  ('씨발'),
  ('시발'),
  ('개새끼'),
  ('병신'),
  ('지랄'),
  ('fuck'),
  ('shit'),
  ('bitch'),
  ('카톡'),
  ('텔레그램'),
  ('토토'),
  ('도박'),
  ('야동')
on conflict (term) do nothing;
-- #endregion

-- #region 시험 요청 사전 검수 공개
-- 검수 통과 상태만 공개 (미검수·차단·반려 요청은 작성자·관리자 한정)
create function public.is_exam_request_public_status(p_status public.exam_request_status)
returns boolean
language sql
immutable
as $$
  select p_status in ('triage', 'approved', 'sourcing', 'draft', 'review', 'published');
$$;

-- 요청 조회 허용 여부 판별 (하위 이력·신고 검증 공용)
create function public.is_exam_request_visible(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.exam_requests r
    where r.id = p_request_id
      and (
        public.is_exam_request_public_status(r.status)
        or r.requester_id = (select auth.uid())
        or public.is_admin()
      )
  );
$$;

drop policy exam_requests_public_read on public.exam_requests;
create policy exam_requests_moderated_read on public.exam_requests
  for select using (
    public.is_exam_request_public_status(status)
    or requester_id = (select auth.uid())
    or (select public.is_admin())
  );

-- 투표 목록 본인 한정 (투표자 노출 차단, 집계는 exam_requests.vote_count 사용)
drop policy exam_request_votes_public_read on public.exam_request_votes;
create policy exam_request_votes_select_own on public.exam_request_votes
  for select using (voter_id = (select auth.uid()) or (select public.is_admin()));

-- 상태 이력 공개 범위를 요청 가시성과 일치
drop policy exam_request_status_history_public_read on public.exam_request_status_history;
create policy exam_request_status_history_read on public.exam_request_status_history
  for select using (public.is_exam_request_visible(request_id));

-- 차단 계정 투표·신고 차단
drop policy exam_request_votes_insert_own on public.exam_request_votes;
create policy exam_request_votes_insert_own on public.exam_request_votes
  for insert with check (
    voter_id = (select auth.uid()) and not (select public.is_banned())
  );

drop policy question_reports_insert_own on public.question_reports;
create policy question_reports_insert_own on public.question_reports
  for insert with check (
    reporter_id = (select auth.uid()) and not (select public.is_banned())
  );

-- 시험 요청 등록 (금칙어·차단 계정 차단 추가)
create or replace function public.request_exam(
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
  if public.is_banned() then
    raise exception '이용이 제한된 계정입니다';
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
  -- 공개 노출 텍스트 금칙어 차단
  if public.contains_banned_term(p_display_name)
    or public.contains_banned_term(coalesce(p_organization, ''))
    or public.contains_banned_term(coalesce(p_grade_level, ''))
    or public.contains_banned_term(coalesce(p_note, '')) then
    raise exception '사용할 수 없는 표현이 포함되어 있습니다';
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
-- #endregion

-- #region 시험 요청 신고
create table public.exam_request_reports (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.exam_requests (id) on delete cascade,
  reporter_id uuid references public.profiles (id) on delete set null,
  reason text not null,
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  unique (request_id, reporter_id)
);

create index exam_request_reports_status_idx on public.exam_request_reports (status, created_at);
create index exam_request_reports_request_idx on public.exam_request_reports (request_id);

-- 신고 누적 요청 자동 비공개 전환
create function public.auto_block_reported_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_report_count int;
begin
  select count(*) into v_active_report_count
  from public.exam_request_reports
  where request_id = new.request_id and status <> 'dismissed';

  if v_active_report_count >= 3 then
    update public.exam_requests
    set status = 'blocked'
    where id = new.request_id and status <> 'blocked';
  end if;
  return null;
end;
$$;

create trigger exam_request_reports_auto_block
  after insert on public.exam_request_reports
  for each row execute function public.auto_block_reported_request();

-- 시험 요청 신고 접수
create function public.report_exam_request(p_request_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;
  if public.is_banned() then
    raise exception '이용이 제한된 계정입니다';
  end if;
  if coalesce(length(p_reason), 0) = 0 or length(p_reason) > 500 then
    raise exception '신고 사유는 1~500자로 입력해 주세요';
  end if;
  if not public.is_exam_request_visible(p_request_id) then
    raise exception '존재하지 않는 요청입니다';
  end if;

  insert into public.exam_request_reports (request_id, reporter_id, reason)
  values (p_request_id, auth.uid(), p_reason)
  on conflict do nothing;
end;
$$;
-- #endregion

-- #region 계정 삭제
-- 본인 계정·학습 기록 전체 삭제 (연결 데이터는 FK cascade 처리)
create function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := (select auth.uid());
begin
  if v_user_id is null then
    raise exception '로그인이 필요합니다';
  end if;

  -- 마지막 관리자 계정 삭제 차단 (운영 권한 소실 방지)
  if exists (select 1 from public.profiles where id = v_user_id and role = 'admin')
    and (select count(*) from public.profiles where role = 'admin') <= 1 then
    raise exception '마지막 관리자 계정은 삭제할 수 없습니다';
  end if;

  -- 커뮤니티 수요 데이터는 유지하고 작성자 자유 서술만 제거
  update public.exam_requests
  set note = null
  where requester_id = v_user_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, payload)
  values (
    null,
    'delete_my_account',
    'profile',
    v_user_id::text,
    jsonb_build_object('deleted_at', now())
  );

  delete from auth.users where id = v_user_id;
end;
$$;
-- #endregion

-- #region 푸시 토큰
create table public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  platform text not null,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  constraint push_tokens_platform_check check (platform in ('ios', 'android')),
  constraint push_tokens_token_length check (length(token) between 1 and 200)
);

create index push_tokens_user_idx on public.push_tokens (user_id);

-- 기기 푸시 토큰 등록 (기기 재로그인 시 소유자 이전)
create function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;
  if p_platform not in ('ios', 'android') then
    raise exception '지원하지 않는 플랫폼입니다';
  end if;
  if coalesce(length(p_token), 0) = 0 or length(p_token) > 200 then
    raise exception '토큰 형식이 올바르지 않습니다';
  end if;

  insert into public.push_tokens (token, user_id, platform)
  values (p_token, auth.uid(), p_platform)
  on conflict (token) do update
  set user_id = excluded.user_id, platform = excluded.platform, last_seen_at = now();
end;
$$;

-- 기기 푸시 토큰 해제 (로그아웃·알림 거부 시)
create function public.unregister_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요합니다';
  end if;
  delete from public.push_tokens
  where token = p_token and user_id = (select auth.uid());
end;
$$;
-- #endregion

-- #region RLS 정책
alter table public.banned_terms enable row level security;
alter table public.exam_request_reports enable row level security;
alter table public.push_tokens enable row level security;

-- banned_terms: 관리자 전용 (판별은 definer 함수 경유)
create policy banned_terms_admin_all on public.banned_terms
  for all using ((select public.is_admin())) with check ((select public.is_admin()));

-- exam_request_reports: 본인 신고 조회, 관리자 전체 (등록은 RPC 전용)
create policy exam_request_reports_select_own on public.exam_request_reports
  for select using (reporter_id = (select auth.uid()) or (select public.is_admin()));
create policy exam_request_reports_admin_update on public.exam_request_reports
  for update using ((select public.is_admin())) with check ((select public.is_admin()));

-- push_tokens: 본인 조회·삭제 (등록·갱신은 RPC 전용)
create policy push_tokens_select_own on public.push_tokens
  for select using (user_id = (select auth.uid()));
create policy push_tokens_delete_own on public.push_tokens
  for delete using (user_id = (select auth.uid()));
-- #endregion

-- #region RPC 실행 권한
revoke execute on function public.delete_my_account() from public, anon;
revoke execute on function public.report_exam_request(uuid, text) from public, anon;
revoke execute on function public.register_push_token(text, text) from public, anon;
revoke execute on function public.unregister_push_token(text) from public, anon;
revoke execute on function public.set_user_ban(uuid, boolean, text) from public, anon;
revoke execute on function public.admin_list_users(text, int) from public, anon;

grant execute on function public.delete_my_account() to authenticated;
grant execute on function public.report_exam_request(uuid, text) to authenticated;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;
grant execute on function public.set_user_ban(uuid, boolean, text) to authenticated;
grant execute on function public.admin_list_users(text, int) to authenticated;
-- #endregion
