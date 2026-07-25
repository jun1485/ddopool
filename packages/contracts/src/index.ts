// Exam Loop API 계약 v1 — DB 스키마(db/migrations/0001_init.sql)와 1:1 동기
// 소비 방법: 앱 tsconfig paths 별칭 추가 또는 src/types 하위로 파일 복사 (내용 수정 금지, 변경은 이 패키지에서만)

// #region 상태 유니온
// 시험 노출 상태
export type ExamStatus = "draft" | "active" | "outdated";

// 시험 요청 상태 머신
export type ExamRequestStatus =
  | "requested"
  | "triage"
  | "approved"
  | "sourcing"
  | "draft"
  | "review"
  | "published"
  | "duplicate"
  | "rejected"
  | "blocked"
  | "archived";

// 문제 상태 머신
export type QuestionStatus =
  | "imported"
  | "validating"
  | "needs_review"
  | "approved"
  | "published"
  | "retired";

// 문제 출처 유형
export type QuestionSourceType = "public_past_exam" | "ai_generated" | "manual";

// 알림 유형
export type NotificationType = "exam_published" | "request_status_changed";
// #endregion

// #region DB Row 타입 (snake_case — Supabase 응답 원형)
export interface ExamRow {
  id: string;
  title: string;
  short_title: string;
  description: string;
  icon: string;
  status: ExamStatus;
  published_at: string | null;
}

export interface ExamSubjectRow {
  id: number;
  exam_id: string;
  name: string;
  sort_order: number;
}

export interface QuestionRow {
  id: string;
  exam_id: string;
  subject: string;
  prompt: string;
  choices: string[];
  answer_index: number;
  explanation: string;
  difficulty: number | null;
  status: QuestionStatus;
}

export interface ExamRequestRow {
  id: string;
  normalized_name: string;
  display_name: string;
  organization: string | null;
  grade_level: string | null;
  exam_url: string | null;
  language: string;
  note: string | null;
  status: ExamRequestStatus;
  vote_count: number;
  published_exam_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExamRequestStatusHistoryRow {
  id: number;
  request_id: string;
  from_status: ExamRequestStatus | null;
  to_status: ExamRequestStatus;
  note: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: number;
  user_id: string;
  type: NotificationType;
  payload: {
    request_id?: string;
    exam_id?: string | null;
    display_name?: string;
    status?: ExamRequestStatus;
  };
  read_at: string | null;
  created_at: string;
}
// #endregion

// #region 앱 도메인 DTO (camelCase — 앱 기존 Exam/Question 타입과 필드 호환)
export interface RemoteExam {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  subjects: string[];
}

export interface RemoteQuestion {
  id: string;
  examId: string;
  subject: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
}

// ExamRow + 과목 목록 → 앱 시험 DTO 변환
export function toRemoteExam(
  row: ExamRow,
  subjects: ExamSubjectRow[],
): RemoteExam {
  return {
    id: row.id,
    title: row.title,
    shortTitle: row.short_title,
    description: row.description,
    icon: row.icon,
    subjects: subjects
      .filter((subject) => subject.exam_id === row.id)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((subject) => subject.name),
  };
}

// QuestionRow → 앱 문제 DTO 변환
export function toRemoteQuestion(row: QuestionRow): RemoteQuestion {
  return {
    id: row.id,
    examId: row.exam_id,
    subject: row.subject,
    prompt: row.prompt,
    choices: row.choices,
    answerIndex: row.answer_index,
    explanation: row.explanation,
  };
}
// #endregion

// #region Supabase 접근 계약 (테이블·RPC 이름)
export const TABLES = {
  exams: "exams",
  examSubjects: "exam_subjects",
  examAliases: "exam_aliases",
  questions: "questions",
  examRequests: "exam_requests",
  examRequestVotes: "exam_request_votes",
  examRequestStatusHistory: "exam_request_status_history",
  notifications: "notifications",
  questionReports: "question_reports",
  userExamEnrollments: "user_exam_enrollments",
  questionAttempts: "question_attempts",
  userQuestionProgress: "user_question_progress",
  userBookmarks: "user_bookmarks",
} as const;

export const RPC = {
  requestExam: "request_exam",
  updateExamRequestStatus: "update_exam_request_status",
} as const;

// 시험 요청 입력
export interface RequestExamInput {
  displayName: string;
  organization?: string;
  gradeLevel?: string;
  examUrl?: string;
  note?: string;
}

// request_exam RPC 파라미터 변환
export function toRequestExamParams(input: RequestExamInput): {
  p_display_name: string;
  p_organization: string | null;
  p_grade_level: string | null;
  p_exam_url: string | null;
  p_note: string | null;
} {
  return {
    p_display_name: input.displayName,
    p_organization: input.organization ?? null,
    p_grade_level: input.gradeLevel ?? null,
    p_exam_url: input.examUrl ?? null,
    p_note: input.note ?? null,
  };
}
// #endregion

// #region 콘텐츠 번들 (문제 생성 파이프라인 ↔ db/scripts/import-content.mjs 공유 파일 포맷)
export interface ContentExam {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  subjects: string[];
}

export interface ContentQuestion {
  id: string;
  examId: string;
  subject: string;
  prompt: string;
  choices: string[];
  answerIndex: number;
  explanation: string;
  difficulty?: number;
  sourceType?: QuestionSourceType;
}

export interface ContentBundle {
  exams: ContentExam[];
  questions: ContentQuestion[];
}
// #endregion

// #region 학습 동기화 Row 타입 (0002_learning_sync.sql 기준)
export type AttemptMode = "learn" | "review" | "bookmarks" | "mock";

export interface UserExamEnrollmentRow {
  user_id: string;
  exam_id: string;
  enrolled_at: string;
}

export interface QuestionAttemptRow {
  id: number;
  user_id: string;
  question_id: string;
  exam_id: string;
  subject: string;
  selected_index: number | null;
  is_correct: boolean;
  mode: AttemptMode;
  answered_at: string;
  client_attempt_id: string;
}

export interface UserQuestionProgressRow {
  user_id: string;
  question_id: string;
  exam_id: string;
  repetitions: number;
  ease_factor: number;
  interval_days: number;
  due_at: string;
  last_reviewed_at: string;
}

export interface UserBookmarkRow {
  user_id: string;
  question_id: string;
  created_at: string;
}
// #endregion

// #region 학습 동기화 입력·매퍼
// 풀이 이력 적재 입력
export interface RecordAttemptInput {
  questionId: string;
  examId: string;
  subject: string;
  selectedIndex: number | null;
  isCorrect: boolean;
  mode: AttemptMode;
  answeredAt?: string;
  clientAttemptId?: string;
}

// question_attempts 적재값 변환
export function toQuestionAttemptInsert(
  input: RecordAttemptInput,
  userId: string,
): Omit<QuestionAttemptRow, "id" | "answered_at" | "client_attempt_id"> & {
  answered_at?: string;
  client_attempt_id?: string;
} {
  return {
    user_id: userId,
    question_id: input.questionId,
    exam_id: input.examId,
    subject: input.subject,
    selected_index: input.selectedIndex,
    is_correct: input.isCorrect,
    mode: input.mode,
    ...(input.answeredAt != null ? { answered_at: input.answeredAt } : {}),
    ...(input.clientAttemptId != null
      ? { client_attempt_id: input.clientAttemptId }
      : {}),
  };
}

// SRS 진행 상태 업서트 입력 (앱 SrsCard와 필드 호환)
export interface UpsertProgressInput {
  questionId: string;
  examId: string;
  repetitions: number;
  easeFactor: number;
  intervalDays: number;
  dueAt: string;
  lastReviewedAt: string;
}

// user_question_progress upsert payload 변환
export function toUserQuestionProgressUpsert(
  input: UpsertProgressInput,
  userId: string,
): UserQuestionProgressRow {
  return {
    user_id: userId,
    question_id: input.questionId,
    exam_id: input.examId,
    repetitions: input.repetitions,
    ease_factor: input.easeFactor,
    interval_days: input.intervalDays,
    due_at: input.dueAt,
    last_reviewed_at: input.lastReviewedAt,
  };
}
// #endregion

// #region 학습 동기화 API 표면 (v1.1 추가 — ExamPlatformApi와 별도 구현 가능)
export interface LearningSyncApi {
  // 내 시험 등록
  enrollExam(examId: string): Promise<void>;
  // 내 시험 해제
  unenrollExam(examId: string): Promise<void>;
  // 내 시험 목록 조회
  listMyEnrollments(): Promise<UserExamEnrollmentRow[]>;
  // 풀이 이력 적재
  recordAttempt(input: RecordAttemptInput): Promise<void>;
  // SRS 진행 상태 일괄 업서트
  upsertProgress(items: UpsertProgressInput[]): Promise<void>;
  // SRS 진행 상태 조회
  listMyProgress(examId?: string): Promise<UserQuestionProgressRow[]>;
  // 풀이 이력 조회 (통계 집계용)
  listMyAttempts(sinceIso?: string): Promise<QuestionAttemptRow[]>;
  // 북마크 추가
  addBookmark(questionId: string): Promise<void>;
  // 북마크 제거
  removeBookmark(questionId: string): Promise<void>;
  // 내 북마크 조회
  listMyBookmarks(): Promise<UserBookmarkRow[]>;
}
// #endregion

// #region 앱 API 표면 (GPT: mock adapter → supabase adapter 순으로 구현)
export interface ExamPlatformApi {
  // 공개(active) 시험 목록 조회
  listActiveExams(): Promise<RemoteExam[]>;
  // 시험별 공개(published) 문제 목록 조회
  listPublishedQuestions(examId: string): Promise<RemoteQuestion[]>;
  // 시험 요청 검색 (정규화 이름·표시 이름 부분 일치)
  searchExamRequests(keyword: string): Promise<ExamRequestRow[]>;
  // 시험 요청 등록 (동일 요청 존재 시 투표 처리 후 해당 요청 반환)
  requestExam(input: RequestExamInput): Promise<ExamRequestRow>;
  // 기존 요청 투표
  voteExamRequest(requestId: string): Promise<void>;
  // 투표 취소
  cancelExamRequestVote(requestId: string): Promise<void>;
  // 내가 투표한 요청 목록 조회
  getMyVotedRequests(): Promise<ExamRequestRow[]>;
  // 요청 상태 타임라인 조회
  getRequestStatusHistory(
    requestId: string,
  ): Promise<ExamRequestStatusHistoryRow[]>;
  // 내 알림 목록 조회
  listMyNotifications(): Promise<NotificationRow[]>;
  // 알림 읽음 처리
  markNotificationRead(notificationId: number): Promise<void>;
  // 문제 오류 신고
  reportQuestion(questionId: string, reason: string): Promise<void>;
}
// #endregion
