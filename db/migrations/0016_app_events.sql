-- 앱 사용 이벤트 익명 기록
begin;

create table public.app_events (
  id bigint generated always as identity primary key,
  install_id text not null check (char_length(install_id) between 8 and 64),
  name text not null check (
    name in (
      'app_open',
      'onboarding_finish',
      'quiz_start',
      'quiz_finish',
      'share_result',
      'review_prompt'
    )
  ),
  exam_id text check (exam_id is null or char_length(exam_id) <= 64),
  value integer,
  detail text check (detail is null or char_length(detail) <= 64),
  platform text check (platform is null or char_length(platform) <= 16),
  app_version text check (app_version is null or char_length(app_version) <= 32),
  created_at timestamptz not null default now()
);

create index app_events_install_created_idx
  on public.app_events (install_id, created_at);
create index app_events_name_created_idx
  on public.app_events (name, created_at);

alter table public.app_events enable row level security;
revoke all on public.app_events from anonymous, authenticated;
revoke all on sequence public.app_events_id_seq from anonymous, authenticated;

-- 앱 사용 이벤트 1건 기록
create function public.record_app_event(
  p_install_id text,
  p_name text,
  p_exam_id text default null,
  p_value integer default null,
  p_detail text default null,
  p_platform text default null,
  p_app_version text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 설치 ID별 시간당 기록 상한
  if (
    select count(*) from public.app_events
    where install_id = p_install_id
      and created_at > now() - interval '1 hour'
  ) >= 300 then
    return;
  end if;
  insert into public.app_events (
    install_id, name, exam_id, value, detail, platform, app_version
  )
  values (
    p_install_id, p_name, p_exam_id, p_value, p_detail, p_platform, p_app_version
  );
end;
$$;

revoke all on function public.record_app_event(text, text, text, integer, text, text, text)
  from public;
grant execute on function public.record_app_event(text, text, text, integer, text, text, text)
  to anonymous, authenticated;

commit;
