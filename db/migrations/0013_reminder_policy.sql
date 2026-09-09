begin;
create table public.reminder_policies (
 token text primary key references public.push_tokens(token) on delete cascade,
 daily_limit integer not null check(daily_limit in (1,2,4)),
 quiet_hour integer not null check(quiet_hour in (21,23,24)),
 paused_date date
);
alter table public.reminder_policies enable row level security;
revoke all on public.reminder_policies from anon, authenticated;
grant all on public.reminder_policies to service_role;
-- 기기 소유자의 알림 휴식 설정 저장
create function public.save_reminder_policy(p_token text,p_limit integer,p_quiet integer,p_pause date) returns void
language plpgsql security definer set search_path=public as $$
begin
 if auth.uid() is null or not exists(select 1 from public.push_tokens where token=p_token and user_id=auth.uid()) then raise exception '기기 소유 권한이 필요합니다'; end if;
 insert into public.reminder_policies values(p_token,p_limit,p_quiet,p_pause) on conflict(token) do update set daily_limit=excluded.daily_limit,quiet_hour=excluded.quiet_hour,paused_date=excluded.paused_date;
end; $$;
revoke all on function public.save_reminder_policy(text,integer,integer,date) from public,anon;
grant execute on function public.save_reminder_policy(text,integer,integer,date) to authenticated;
create or replace function public.clear_reassigned_push_deliveries() returns trigger
language plpgsql security definer set search_path=public as $$
begin
 if old.user_id is distinct from new.user_id then
  delete from public.push_deliveries where token=old.token;
  delete from public.study_reminder_preferences where token=old.token;
  delete from public.reminder_policies where token=old.token;
 end if;
 return new;
end; $$;
-- 현지 시간의 알림 빈도와 휴식 적용
create function public.reminder_policy_allows(p_token text,p_hour integer,p_timezone text) returns boolean
language sql stable security definer set search_path=public as $$
 select coalesce((select paused_date is distinct from (now() at time zone p_timezone)::date
 and extract(hour from now() at time zone p_timezone)::integer in
 (select h from (select distinct unnest(array[p_hour,18,21,23]) h) hours where h>=p_hour and h<quiet_hour order by h limit daily_limit)
 from public.reminder_policies where token=p_token),true)
$$;
revoke all on function public.reminder_policy_allows(text,integer,text) from public,anon,authenticated;
grant execute on function public.reminder_policy_allows(text,integer,text) to service_role;
create or replace function public.queue_study_reminders() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_service_role() then raise exception '운영 권한이 필요합니다'; end if;
  insert into public.push_deliveries(token,study_date,study_hour)
    select p.token,(now() at time zone p.timezone)::date,extract(hour from now() at time zone p.timezone)::integer
    from public.study_reminder_preferences p join public.push_tokens t on t.token=p.token and t.user_id=p.user_id
    where p.enabled and p.local_until<=now() and public.reminder_policy_allows(p.token,p.hour,p.timezone)
      and extract(hour from now() at time zone p.timezone)::integer=any(array[p.hour,18,21,23])
      and extract(hour from now() at time zone p.timezone)>=p.hour
      and p.last_studied_date is distinct from (now() at time zone p.timezone)::date
      and not exists(select 1 from public.question_attempts a where a.user_id=p.user_id and (a.answered_at at time zone p.timezone)::date=(now() at time zone p.timezone)::date)
    on conflict do nothing;
end;
$$;
revoke all on function public.queue_study_reminders() from public,anon,authenticated;
grant execute on function public.queue_study_reminders() to service_role;

-- 재시도 직전 동의·날짜·학습 여부 재검증
create or replace function public.claim_push_deliveries() returns setof public.push_deliveries
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_service_role() then raise exception '운영 권한이 필요합니다'; end if;
  update public.push_deliveries d set state='dead' where d.study_date is not null and d.state in ('pending','sending') and not exists (
    select 1 from public.study_reminder_preferences p where p.token=d.token and p.enabled and p.local_until<=now() and public.reminder_policy_allows(p.token,p.hour,p.timezone)
      and d.study_date=(now() at time zone p.timezone)::date and d.study_hour=extract(hour from now() at time zone p.timezone)::integer
      and p.last_studied_date is distinct from d.study_date
      and not exists(select 1 from public.question_attempts a where a.user_id=p.user_id and (a.answered_at at time zone p.timezone)::date=d.study_date)
  );
  update public.push_deliveries set state='dead' where state='sending' and attempts>=6 and available_at<=now();
  return query update public.push_deliveries set state='sending',attempts=attempts+1,available_at=now()+interval '10 minutes'
    where id in(select id from public.push_deliveries where state in('pending','sending') and available_at<=now() and attempts<6 order by id for update skip locked limit 100) returning *;
end;
$$;
commit;
