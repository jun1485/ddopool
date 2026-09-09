begin;
create table public.user_learning_extras (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 1,
  snapshot jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  check (octet_length(snapshot::text) <= 5242880 and jsonb_typeof(snapshot) = 'object')
);
alter table public.user_learning_extras enable row level security;
create policy learning_extras_own on public.user_learning_extras for select using(user_id = auth.uid());
grant select on public.user_learning_extras to authenticated;

-- 학습 부가 기록 버전 충돌 방지 저장
create function public.save_learning_extras(p_revision bigint, p_snapshot jsonb) returns bigint
language plpgsql security definer set search_path = public as $$
declare next_revision bigint;
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  if public.is_banned() then raise exception '이용 제한 상태입니다'; end if;
  if p_revision = 0 then
    insert into public.user_learning_extras(user_id, snapshot) values(auth.uid(), p_snapshot)
      on conflict do nothing returning revision into next_revision;
  else
    update public.user_learning_extras set snapshot = p_snapshot, revision = revision + 1, updated_at = now()
      where user_id = auth.uid() and revision = p_revision returning revision into next_revision;
  end if;
  if next_revision is null then raise exception using errcode = '40001', message = '다른 기기 기록을 다시 동기화해 주세요'; end if;
  return next_revision;
end;
$$;
revoke all on function public.save_learning_extras(bigint,jsonb) from public, anon;
grant execute on function public.save_learning_extras(bigint,jsonb) to authenticated;
commit;
