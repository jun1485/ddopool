-- 학습 기록 동기화 스키마 (기기 간 SRS·통계·북마크 공유)
-- 적용 방법: 0001_init.sql 이후 실행

-- #region 사용자 시험 등록
-- 내 시험 목록
create table public.user_exam_enrollments (
  user_id uuid not null references public.profiles (id) on delete cascade,
  exam_id text not null references public.exams (id) on delete cascade,
  enrolled_at timestamptz not null default now(),
  primary key (user_id, exam_id)
);
-- #endregion

-- #region 문제 풀이 이력
create table public.question_attempts (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id text not null references public.questions (id) on delete cascade,
  exam_id text not null,
  subject text not null,
  selected_index smallint,
  is_correct boolean not null,
  mode text not null default 'learn',
  answered_at timestamptz not null default now(),
  constraint question_attempts_mode_check check (mode in ('learn', 'review', 'bookmarks', 'mock'))
);

create index question_attempts_user_time_idx on public.question_attempts (user_id, answered_at desc);
create index question_attempts_question_idx on public.question_attempts (question_id);
-- #endregion

-- #region 문제별 SRS 진행 상태
create table public.user_question_progress (
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id text not null references public.questions (id) on delete cascade,
  exam_id text not null,
  repetitions int not null default 0,
  ease_factor numeric(4, 2) not null default 2.5,
  interval_days int not null default 0,
  due_at timestamptz not null,
  last_reviewed_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index user_question_progress_due_idx on public.user_question_progress (user_id, due_at);
create index user_question_progress_question_idx on public.user_question_progress (question_id);

create trigger user_question_progress_set_updated_at
  before update on public.user_question_progress
  for each row execute function public.set_updated_at();
-- #endregion

-- #region 문제 북마크
create table public.user_bookmarks (
  user_id uuid not null references public.profiles (id) on delete cascade,
  question_id text not null references public.questions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create index user_bookmarks_question_idx on public.user_bookmarks (question_id);
-- #endregion

-- #region RLS 정책 (전부 본인 데이터 한정)
alter table public.user_exam_enrollments enable row level security;
alter table public.question_attempts enable row level security;
alter table public.user_question_progress enable row level security;
alter table public.user_bookmarks enable row level security;

create policy user_exam_enrollments_own on public.user_exam_enrollments
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- 풀이 이력은 수정·삭제 없이 적재만 허용
create policy question_attempts_select_own on public.question_attempts
  for select using (user_id = (select auth.uid()));
create policy question_attempts_insert_own on public.question_attempts
  for insert with check (user_id = (select auth.uid()));

create policy user_question_progress_own on public.user_question_progress
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy user_bookmarks_own on public.user_bookmarks
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
-- #endregion
