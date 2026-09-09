begin;
create table public.hidden_exam_requests (
  user_id uuid not null references auth.users(id) on delete cascade,
  request_id uuid not null references public.exam_requests(id) on delete cascade,
  primary key(user_id, request_id)
);
create table public.blocked_request_authors (
  user_id uuid not null references auth.users(id) on delete cascade,
  blocked_user_id uuid not null references auth.users(id) on delete cascade,
  primary key(user_id, blocked_user_id), check(user_id <> blocked_user_id)
);
alter table public.hidden_exam_requests enable row level security;
alter table public.blocked_request_authors enable row level security;

-- 숨김·차단 요청 가시성 판정
create function public.can_view_exam_request(p_request_id uuid, p_author uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists(select 1 from public.hidden_exam_requests where user_id = auth.uid() and request_id = p_request_id)
    and not exists(select 1 from public.blocked_request_authors where user_id = auth.uid() and blocked_user_id = p_author);
$$;
create policy requests_visibility on public.exam_requests as restrictive for select
using(public.is_admin() or public.can_view_exam_request(id, requester_id));

-- 요청 숨김·작성자 차단 등록
create function public.hide_exam_request(p_request_id uuid, p_block_author boolean default false) returns void
language plpgsql security definer set search_path = public as $$
declare author uuid;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  select requester_id into author from public.exam_requests where id = p_request_id;
  if not found then raise exception '요청을 찾을 수 없습니다'; end if;
  if author = auth.uid() then raise exception '본인 요청은 숨길 수 없습니다'; end if;
  insert into public.hidden_exam_requests values(auth.uid(), p_request_id) on conflict do nothing;
  if p_block_author and author is not null then
    insert into public.blocked_request_authors values(auth.uid(), author) on conflict do nothing;
  end if;
end;
$$;

-- 요청 숨김·작성자 차단 전체 해제
create function public.reset_request_visibility() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  delete from public.hidden_exam_requests where user_id = auth.uid();
  delete from public.blocked_request_authors where user_id = auth.uid();
end;
$$;
revoke all on function public.hide_exam_request(uuid,boolean), public.reset_request_visibility() from public, anon;
grant execute on function public.hide_exam_request(uuid,boolean), public.reset_request_visibility() to authenticated;
create or replace function public.search_exam_requests(p_keyword text)
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
    where public.can_view_exam_request(r.id, r.requester_id) and (
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
commit;
