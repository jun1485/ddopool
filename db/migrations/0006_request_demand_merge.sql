-- 시험 요청 수요 집계 보강 (중복 요청 병합·별칭 검색)
-- 적용 방법: 0005_release_hardening.sql 이후 실행

-- #region 요청 검색 별칭
-- 병합된 요청명·약칭을 대표 요청의 검색 키로 유지
create table public.exam_request_aliases (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.exam_requests (id) on delete cascade,
  alias text not null,
  normalized_alias text not null,
  created_at timestamptz not null default now(),
  unique (request_id, normalized_alias)
);

create index exam_request_aliases_normalized_idx
  on public.exam_request_aliases (normalized_alias);

alter table public.exam_request_aliases enable row level security;

create policy exam_request_aliases_admin_all on public.exam_request_aliases
  for all using ((select public.has_admin_access()))
  with check ((select public.has_admin_access()));

-- 요청 검색 별칭 등록
create function public.add_exam_request_alias(p_request_id uuid, p_alias text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized text := public.normalize_exam_name(p_alias);
begin
  if not public.has_admin_access() then
    raise exception '관리자 권한이 필요합니다';
  end if;
  if length(v_normalized) < 2 then
    raise exception '별칭은 2자 이상 입력해 주세요';
  end if;

  insert into public.exam_request_aliases (request_id, alias, normalized_alias)
  values (p_request_id, p_alias, v_normalized)
  on conflict (request_id, normalized_alias) do nothing;
end;
$$;
-- #endregion

-- #region 중복 요청 병합
-- 원본 요청의 투표를 대표 요청으로 이관하고 원본을 중복 처리
create function public.merge_exam_requests(
  p_source_id uuid,
  p_target_id uuid,
  p_note text default null
)
returns public.exam_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source public.exam_requests;
  v_target public.exam_requests;
begin
  if not public.has_admin_access() then
    raise exception '관리자 권한이 필요합니다';
  end if;
  if p_source_id = p_target_id then
    raise exception '같은 요청끼리는 병합할 수 없습니다';
  end if;

  select * into v_source from public.exam_requests where id = p_source_id;
  select * into v_target from public.exam_requests where id = p_target_id;
  if v_source.id is null or v_target.id is null then
    raise exception '존재하지 않는 요청입니다';
  end if;
  if v_source.status = 'duplicate' then
    raise exception '이미 병합된 요청입니다';
  end if;

  -- 투표 이관 (이미 대표 요청에 투표한 사용자는 유지, vote_count는 트리거가 집계)
  insert into public.exam_request_votes (request_id, voter_id, created_at)
  select p_target_id, v.voter_id, v.created_at
  from public.exam_request_votes v
  where v.request_id = p_source_id
  on conflict do nothing;

  delete from public.exam_request_votes where request_id = p_source_id;

  -- 원본 요청명을 대표 요청의 검색 별칭으로 보존
  insert into public.exam_request_aliases (request_id, alias, normalized_alias)
  values (p_target_id, v_source.display_name, v_source.normalized_name)
  on conflict (request_id, normalized_alias) do nothing;

  update public.exam_requests
  set
    status = 'duplicate',
    admin_note = coalesce(p_note, admin_note)
  where id = p_source_id;

  insert into public.audit_logs (actor_id, action, entity_type, entity_id, payload)
  values (
    auth.uid(),
    'merge_exam_requests',
    'exam_request',
    p_source_id::text,
    jsonb_build_object('target_id', p_target_id, 'note', p_note)
  );

  select * into v_target from public.exam_requests where id = p_target_id;
  return v_target;
end;
$$;
-- #endregion

-- #region 별칭 포함 요청 검색
-- 표시명·정규화명·병합 별칭을 함께 조회 (공개 정책 준수)
create function public.search_exam_requests(p_keyword text)
returns table (
  id uuid,
  normalized_name text,
  display_name text,
  organization text,
  grade_level text,
  exam_url text,
  language text,
  note text,
  status public.exam_request_status,
  vote_count int,
  published_exam_id text,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_normalized text := public.normalize_exam_name(p_keyword);
begin
  if length(v_normalized) < 2 then
    return;
  end if;

  return query
    select
      r.id, r.normalized_name, r.display_name, r.organization, r.grade_level,
      r.exam_url, r.language, r.note, r.status, r.vote_count,
      r.published_exam_id, r.created_at, r.updated_at
    from public.exam_requests r
    where (
        r.normalized_name like '%' || v_normalized || '%'
        or exists (
          select 1 from public.exam_request_aliases a
          where a.request_id = r.id
            and a.normalized_alias like '%' || v_normalized || '%'
        )
      )
      and (
        public.is_exam_request_public_status(r.status)
        or r.requester_id = (select auth.uid())
        or public.is_admin()
      )
    order by r.vote_count desc, r.created_at
    limit 50;
end;
$$;
-- #endregion

-- #region 요청 등록 시 중복 별칭 자동 합류
-- 별칭이 일치하는 기존 요청이 있으면 신규 등록 대신 투표로 합류
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

  -- 등록된 별칭과 일치하면 대표 요청에 합류
  if v_request.id is null then
    select r.* into v_request
    from public.exam_request_aliases a
    join public.exam_requests r on r.id = a.request_id
    where a.normalized_alias = v_normalized
      and r.status <> 'duplicate'
    order by r.vote_count desc
    limit 1;
  end if;

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

-- #region RPC 실행 권한
revoke execute on function public.merge_exam_requests(uuid, uuid, text) from public, anon;
revoke execute on function public.add_exam_request_alias(uuid, text) from public, anon;

grant execute on function public.merge_exam_requests(uuid, uuid, text) to authenticated;
grant execute on function public.add_exam_request_alias(uuid, text) to authenticated;
grant execute on function public.search_exam_requests(text) to anon, authenticated;
-- #endregion
