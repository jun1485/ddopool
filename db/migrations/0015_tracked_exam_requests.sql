-- 본인 작성·공감 시험 요청 목록 조회
begin;

create function public.list_tracked_exam_requests()
returns table (
  id uuid,
  normalized_name text,
  display_name text,
  organization text,
  grade_level text,
  exam_url text,
  language text,
  note text,
  status public.exam_request_status,
  vote_count integer,
  published_exam_id text,
  created_at timestamptz,
  updated_at timestamptz,
  is_owned boolean,
  has_voted boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select r.id, r.normalized_name, r.display_name, r.organization, r.grade_level,
    r.exam_url, r.language, r.note, r.status, r.vote_count, r.published_exam_id,
    r.created_at, r.updated_at,
    r.requester_id = auth.uid() as is_owned,
    exists (
      select 1 from public.exam_request_votes v
      where v.request_id = r.id and v.voter_id = auth.uid()
    ) as has_voted
  from public.exam_requests r
  where auth.uid() is not null
    and (
      r.requester_id = auth.uid()
      or exists (
        select 1 from public.exam_request_votes v
        where v.request_id = r.id and v.voter_id = auth.uid()
      )
    )
    and (
      public.is_exam_request_public_status(r.status)
      or r.requester_id = auth.uid()
      or public.is_admin()
    )
    and (public.is_admin() or public.can_view_exam_request(r.id, r.requester_id))
  order by r.updated_at desc;
$$;

revoke all on function public.list_tracked_exam_requests() from public, anonymous;
grant execute on function public.list_tracked_exam_requests() to authenticated;

commit;
