begin;
alter table public.push_tokens drop constraint push_tokens_platform_check;
alter table public.push_tokens add constraint push_tokens_platform_check check(platform in ('ios','android','web'));
create table public.web_push_subscriptions (
  token text primary key references public.push_tokens(token) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null
);
alter table public.web_push_subscriptions enable row level security;
revoke all on public.web_push_subscriptions from anon, authenticated;
grant all on public.web_push_subscriptions to service_role;

-- 본인 웹 구독과 학습 알림 저장
create function public.save_web_push(p_endpoint text,p_p256dh text,p_auth text,p_hour integer,p_timezone text,p_studied_today boolean) returns text
language plpgsql security definer set search_path=public as $$
declare v_token text := 'web:' || md5(p_endpoint);
begin
  if auth.uid() is null then raise exception '로그인이 필요합니다'; end if;
  if length(p_endpoint)>4096 or p_endpoint !~ '^https://(web\.push\.apple\.com|fcm\.googleapis\.com|[a-z0-9-]+\.notify\.windows\.com|updates\.push\.services\.mozilla\.com)/[^[:space:]]+$'
    or p_p256dh !~ '^[A-Za-z0-9_-]{87}$' or p_auth !~ '^[A-Za-z0-9_-]{22}$' then
    raise exception '웹 구독 형식이 유효하지 않습니다';
  end if;
  insert into public.push_tokens(token,user_id,platform) values(v_token,auth.uid(),'web')
    on conflict(token) do update set last_seen_at=now() where push_tokens.user_id=auth.uid();
  if not exists(select 1 from public.push_tokens where token=v_token and user_id=auth.uid()) then raise exception '기존 구독 연결 해제가 필요합니다'; end if;
  insert into public.web_push_subscriptions values(v_token,p_endpoint,p_p256dh,p_auth)
    on conflict(token) do update set p256dh=excluded.p256dh,auth=excluded.auth;
  perform public.save_study_reminder(v_token,true,p_hour,p_timezone,now(),p_studied_today);
  return v_token;
end;
$$;
revoke all on function public.save_web_push(text,text,text,integer,text,boolean) from public,anon;
grant execute on function public.save_web_push(text,text,text,integer,text,boolean) to authenticated;
-- 시험 요청 소식은 기존 네이티브 구독으로 발송
create or replace function public.queue_notification_push() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.push_deliveries(notification_id,token)
    select new.id,token from public.push_tokens where user_id=new.user_id and platform<>'web';
  return new;
end;
$$;
commit;
