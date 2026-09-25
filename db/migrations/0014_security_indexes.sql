-- 출처 증빙 비공개·투표 남용 제한·푸시 토큰 소유 보호·조회 인덱스 보강
-- 적용 방법: 0013_reminder_policy.sql 이후 실행
begin;

-- #region 출처 내부 증빙 비공개
revoke select on public.content_sources from anon, authenticated;
grant select (id, exam_id, name, url, license, source_type, collected_at, created_at)
  on public.content_sources to anon, authenticated;
-- #endregion

-- #region 투표 가시성·반복 제한
drop policy exam_request_votes_insert_own on public.exam_request_votes;
create policy exam_request_votes_insert_own on public.exam_request_votes
  for insert with check (
    voter_id = (select auth.uid())
    and not (select public.is_banned())
    and public.is_exam_request_visible(request_id)
  );

-- 투표·취소 반복 횟수 집계용 기록
create table public.exam_request_vote_events (
  voter_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index exam_request_vote_events_voter_time_idx
  on public.exam_request_vote_events (voter_id, created_at);
alter table public.exam_request_vote_events enable row level security;
revoke all on public.exam_request_vote_events from anon, authenticated;

-- 투표 반복 등록 제한
create function public.guard_vote_rate() returns trigger
language plpgsql security definer set search_path = public as $$
declare recent_count integer;
begin
  if new.voter_id is null or public.is_admin() then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(new.voter_id::text || 'exam_request_votes', 0));
  delete from public.exam_request_vote_events
    where voter_id = new.voter_id and created_at < now() - interval '1 hour';
  select count(*) into recent_count from public.exam_request_vote_events
    where voter_id = new.voter_id;
  if recent_count >= 30 then raise exception '요청이 많습니다. 잠시 후 다시 시도해 주세요'; end if;
  insert into public.exam_request_vote_events (voter_id) values (new.voter_id);
  return new;
end;
$$;
create trigger exam_request_votes_rate before insert on public.exam_request_votes
  for each row execute function public.guard_vote_rate();
-- #endregion

-- #region 네이티브 푸시 토큰 소유자 보호
create or replace function public.register_push_token(p_token text, p_platform text)
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

  -- 다른 계정에 연결된 토큰은 기존 연결 해제 전까지 유지
  insert into public.push_tokens (token, user_id, platform)
  values (p_token, auth.uid(), p_platform)
  on conflict (token) do update
  set platform = excluded.platform, last_seen_at = now()
  where push_tokens.user_id = excluded.user_id;
end;
$$;
-- #endregion

-- #region 조회·정리 경로 인덱스
create index question_reviews_question_version_idx
  on public.question_reviews (question_id, question_version);
create index exam_request_status_history_request_idx
  on public.exam_request_status_history (request_id);
create index audit_logs_created_idx on public.audit_logs (created_at);
create index push_deliveries_created_idx on public.push_deliveries (created_at);
create index question_reports_resolved_idx
  on public.question_reports (resolved_at) where status <> 'open';
create index exam_request_reports_reporter_time_idx
  on public.exam_request_reports (reporter_id, created_at);
create index question_attempts_user_id_idx on public.question_attempts (user_id, id);
-- #endregion

commit;
