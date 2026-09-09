begin;

alter table public.content_sources add column rights_verified_at timestamptz;
alter table public.content_sources add column rights_evidence text;
alter table public.question_reviews add column question_version integer;

-- 검수 대상 버전 고정
create function public.stamp_review_version() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select version into new.question_version from public.questions where id = new.question_id for update;
  new.reviewer_id := auth.uid();
  return new;
end;
$$;
create trigger question_review_version before insert on public.question_reviews
for each row execute function public.stamp_review_version();

-- 공개 문제 출처·최신 검수 확인
create function public.guard_question_publication() returns trigger
language plpgsql security definer set search_path = public as $$
declare verdict public.review_verdict;
begin
  if tg_op = 'UPDATE' and (new.version <> old.version or new.source_id is distinct from old.source_id or new.source_type is distinct from old.source_type) then
    if new.version = old.version then new.version := old.version + 1; end if;
    new.status := 'needs_review';
    new.published_at := null;
  end if;
  if new.status <> 'published' then return new; end if;
  if not exists (select 1 from public.content_sources where id = new.source_id
      and rights_verified_at is not null and length(trim(coalesce(rights_evidence, ''))) > 0
      and license <> 'unknown' and length(trim(license)) > 0 and source_type = new.source_type) then
    raise exception '이용 권한과 출처 증빙 확인이 필요합니다';
  end if;
  select r.verdict into verdict from public.question_reviews r
    where question_id = new.id and question_version = new.version order by id desc limit 1;
  if verdict is distinct from 'approved'::public.review_verdict then
    raise exception '현재 문제 버전의 승인 검수가 필요합니다';
  end if;
  new.published_at := coalesce(new.published_at, now());
  return new;
end;
$$;
create trigger questions_publication_guard before insert or update on public.questions
for each row execute function public.guard_question_publication();

-- 출처 증빙 변경 시 공개 재검토
create function public.recheck_source_questions() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.license is distinct from old.license or new.rights_evidence is distinct from old.rights_evidence
    or new.rights_verified_at is distinct from old.rights_verified_at or new.source_type is distinct from old.source_type
    or new.url is distinct from old.url then
    update public.questions set status = 'needs_review', published_at = null where source_id = new.id;
    insert into public.question_reviews(question_id, verdict, note)
      select id, 'needs_fix', '출처 증빙 변경에 따른 재검토' from public.questions where source_id = new.id;
  end if;
  return new;
end;
$$;
create trigger source_rights_recheck after update on public.content_sources for each row execute function public.recheck_source_questions();

create table public.legal_consents (
  user_id uuid primary key references auth.users(id) on delete cascade,
  legal_version text not null,
  age_over_14 boolean not null check (age_over_14),
  accepted_at timestamptz not null default now()
);
alter table public.legal_consents enable row level security;
create policy legal_consents_own on public.legal_consents for select using (user_id = auth.uid());
grant select on public.legal_consents to authenticated;

-- 신규 회원 연령·약관 동의 확인
create function public.record_signup_consent() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.raw_user_meta_data->>'age_over_14' is distinct from 'true'
     or coalesce(length(new.raw_user_meta_data->>'legal_version'), 0) = 0 then
    raise exception '만 14세 이상 확인과 이용약관 동의가 필요합니다';
  end if;
  insert into public.legal_consents(user_id, legal_version, age_over_14)
  values(new.id, new.raw_user_meta_data->>'legal_version', true);
  return new;
end;
$$;
create trigger signup_legal_consent after insert on auth.users
for each row execute function public.record_signup_consent();

-- 보존 기간 만료 개인정보 정리
create function public.purge_expired_personal_data() returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_service_role() then raise exception '운영 권한이 필요합니다'; end if;
  delete from public.question_reports where resolved_at < now() - interval '1 year' and status <> 'open';
  delete from public.exam_request_reports where resolved_at < now() - interval '1 year' and status <> 'open';
  delete from public.audit_logs where created_at < now() - interval '1 year';
  delete from public.push_tokens where last_seen_at < now() - interval '90 days';
end;
$$;
revoke all on function public.purge_expired_personal_data() from public, anon, authenticated;
grant execute on function public.purge_expired_personal_data() to service_role;

-- 요청·신고 반복 등록 제한
create function public.guard_submission_rate() returns trigger
language plpgsql security definer set search_path = public as $$
declare actor uuid; recent_count integer;
begin
  actor := auth.uid();
  if actor is null or public.is_admin() then return new; end if;
  perform pg_advisory_xact_lock(hashtextextended(actor::text || tg_table_name, 0));
  if tg_table_name = 'exam_requests' then
    select count(*) into recent_count from public.exam_requests where requester_id = actor and created_at > now() - interval '1 hour';
  elsif tg_table_name = 'question_reports' then
    select count(*) into recent_count from public.question_reports where reporter_id = actor and created_at > now() - interval '1 hour';
  else
    select count(*) into recent_count from public.exam_request_reports where reporter_id = actor and created_at > now() - interval '1 hour';
  end if;
  if recent_count >= 10 then raise exception '요청이 많습니다. 잠시 후 다시 시도해 주세요'; end if;
  return new;
end;
$$;
create trigger exam_requests_rate before insert on public.exam_requests for each row execute function public.guard_submission_rate();
create trigger question_reports_rate before insert on public.question_reports for each row execute function public.guard_submission_rate();
create trigger exam_request_reports_rate before insert on public.exam_request_reports for each row execute function public.guard_submission_rate();

commit;
