begin;

create table public.study_reminder_preferences (
  token text primary key references public.push_tokens(token) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  enabled boolean not null default false,
  hour integer not null check(hour in (7,12,18,21)),
  timezone text not null,
  local_until timestamptz not null,
  last_studied_date date,
  updated_at timestamptz not null default now()
);
alter table public.study_reminder_preferences enable row level security;
revoke all on public.study_reminder_preferences from anon, authenticated;
grant all on public.study_reminder_preferences to service_role;

alter table public.push_deliveries alter column notification_id drop not null;
alter table public.push_deliveries add column study_date date;
alter table public.push_deliveries add column study_hour integer;
create unique index study_reminder_once on public.push_deliveries(token, study_date, study_hour) where study_date is not null;

-- 인증된 기기의 학습 알림 동의·현지 시간 저장
create function public.save_study_reminder(p_token text, p_enabled boolean, p_hour integer, p_timezone text, p_local_until timestamptz, p_studied_today boolean) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or not exists(select 1 from public.push_tokens where token=p_token and user_id=auth.uid()) then
    raise exception '기기 소유 권한이 필요합니다';
  end if;
  if not exists(select 1 from pg_timezone_names where name=p_timezone) then raise exception '시간대가 유효하지 않습니다'; end if;
  if p_local_until < now() or p_local_until > now()+interval '15 days' then raise exception '예약 기간이 유효하지 않습니다'; end if;
  insert into public.study_reminder_preferences(token,user_id,enabled,hour,timezone,local_until,last_studied_date)
    values(p_token,auth.uid(),p_enabled,p_hour,p_timezone,p_local_until,case when p_studied_today then (now() at time zone p_timezone)::date end)
    on conflict(token) do update set user_id=excluded.user_id,enabled=excluded.enabled,hour=excluded.hour,timezone=excluded.timezone,local_until=excluded.local_until,
      last_studied_date=case when excluded.last_studied_date is not null then excluded.last_studied_date else study_reminder_preferences.last_studied_date end,updated_at=now();
  update public.push_deliveries set state='dead' where token=p_token and study_date is not null and state in ('pending','sending');
end;
$$;
revoke all on function public.save_study_reminder(text,boolean,integer,text,timestamptz,boolean) from public,anon;
grant execute on function public.save_study_reminder(text,boolean,integer,text,timestamptz,boolean) to authenticated;

-- 재할당된 기기의 이전 학습 알림 동의 제거
create or replace function public.clear_reassigned_push_deliveries() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.user_id is distinct from new.user_id then
    delete from public.push_deliveries where token=old.token;
    delete from public.study_reminder_preferences where token=old.token;
  end if;
  return new;
end;
$$;

-- 로컬 예약이 끝난 미학습 기기의 현재 시간 알림 생성
create function public.queue_study_reminders() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_service_role() then raise exception '운영 권한이 필요합니다'; end if;
  insert into public.push_deliveries(token,study_date,study_hour)
    select p.token,(now() at time zone p.timezone)::date,extract(hour from now() at time zone p.timezone)::integer
    from public.study_reminder_preferences p join public.push_tokens t on t.token=p.token and t.user_id=p.user_id
    where p.enabled and p.local_until<=now()
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
    select 1 from public.study_reminder_preferences p where p.token=d.token and p.enabled and p.local_until<=now()
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
