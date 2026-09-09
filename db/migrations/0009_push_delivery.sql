begin;
create table public.push_deliveries (
  id bigint generated always as identity primary key,
  notification_id bigint not null references public.notifications(id) on delete cascade,
  token text not null references public.push_tokens(token) on delete cascade,
  state text not null default 'pending' check(state in ('pending','sending','ticket','sent','dead')),
  attempts integer not null default 0,
  receipt_id text,
  available_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(notification_id, token)
);
alter table public.push_deliveries enable row level security;
create index push_deliveries_pending on public.push_deliveries(state, available_at);

-- 기기 소유 계정 변경 시 이전 발송 대기 제거
create function public.clear_reassigned_push_deliveries() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.user_id is distinct from new.user_id then
    delete from public.push_deliveries where token = old.token;
  end if;
  return new;
end;
$$;
create trigger push_token_owner_change before update of user_id on public.push_tokens
for each row execute function public.clear_reassigned_push_deliveries();

-- 사용자 알림 기기별 발송 대기 등록
create function public.queue_notification_push() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.push_deliveries(notification_id, token)
    select new.id, token from public.push_tokens where user_id = new.user_id;
  return new;
end;
$$;
create trigger notification_push_queue after insert on public.notifications for each row execute function public.queue_notification_push();

-- 발송 작업 중복 점유 방지
create function public.claim_push_deliveries() returns setof public.push_deliveries
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_service_role() then raise exception '운영 권한이 필요합니다'; end if;
  update public.push_deliveries set state = 'dead'
    where state = 'sending' and attempts >= 6 and available_at <= now();
  return query update public.push_deliveries set state = 'sending', attempts = attempts + 1, available_at = now() + interval '10 minutes'
    where id in (select id from public.push_deliveries where state in ('pending','sending') and available_at <= now() and attempts < 6
      order by id for update skip locked limit 100) returning *;
end;
$$;
revoke all on function public.claim_push_deliveries() from public, anon, authenticated;
grant execute on function public.claim_push_deliveries() to service_role;
commit;
