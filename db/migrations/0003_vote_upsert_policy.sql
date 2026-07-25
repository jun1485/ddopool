-- 시험 요청 투표 upsert 대응 (재투표 시 ON CONFLICT DO UPDATE 경로 허용)
-- 적용 방법: 0002_learning_sync.sql 이후 실행

create policy exam_request_votes_update_own on public.exam_request_votes
  for update using (voter_id = (select auth.uid())) with check (voter_id = (select auth.uid()));

-- 투표 행 키 변경 차단 (vote_count 델타 집계 오염 방지)
create function public.prevent_vote_move()
returns trigger
language plpgsql
as $$
begin
  if new.request_id is distinct from old.request_id
    or new.voter_id is distinct from old.voter_id then
    raise exception '투표 대상 변경은 허용되지 않습니다';
  end if;
  return new;
end;
$$;

create trigger exam_request_votes_lock_key
  before update on public.exam_request_votes
  for each row execute function public.prevent_vote_move();
