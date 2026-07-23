-- 동기화 신뢰성 보강 (풀이 이력 멱등 키·SRS 진행 상태 역행 방지)
-- 적용 방법: 0003_vote_upsert_policy.sql 이후 실행

-- #region 풀이 이력 멱등 키
-- 클라이언트 재전송(아웃박스 중단 후 재flush) 시 서버 이중 적재 차단
alter table public.question_attempts
  add column client_attempt_id uuid not null default gen_random_uuid();

alter table public.question_attempts
  add constraint question_attempts_client_key unique (user_id, client_attempt_id);
-- #endregion

-- #region SRS 진행 상태 역행 방지
-- 구 기기 flush가 최신 진행 상태를 과거 값으로 덮어쓰지 않도록 차단
create function public.guard_question_progress_regression()
returns trigger
language plpgsql
as $$
begin
  if new.last_reviewed_at < old.last_reviewed_at then
    return null;
  end if;
  return new;
end;
$$;

create trigger user_question_progress_guard_regression
  before update on public.user_question_progress
  for each row execute function public.guard_question_progress_regression();
-- #endregion
