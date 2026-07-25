const DAY_MS = 24 * 60 * 60 * 1000;

// 시험 학습 목표 설정
export interface StudyTarget {
  examId: string;
  targetDate: string;
  targetScore?: number;
  studyDaysPerWeek: number;
  createdAt: number;
  startingQuestionCount: number;
  startingStudiedCount: number;
}

export type ExamPaceStatus =
  | "steady"
  | "ahead"
  | "behind"
  | "complete"
  | "expired";

// 시험일까지의 학습 페이스
export interface ExamPace {
  examId: string;
  targetDate: string;
  daysRemaining: number;
  remainingQuestions: number;
  dailyQuestionTarget: number;
  progress: number;
  status: ExamPaceStatus;
}

// 로컬 날짜 키 생성
function toLocalDateKey(time: number): string {
  const date = new Date(time);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

// 기준일 이후 목표 날짜 생성
export function createTargetDateKey(daysFromNow: number, now: number): string {
  return toLocalDateKey(now + daysFromNow * DAY_MS);
}

// 사용자 표시용 시험 날짜 변환
export function formatTargetDate(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

// 시험 목표 기반 현재 학습 페이스 계산
export function calculateExamPace(
  target: StudyTarget,
  totalQuestionCount: number,
  studiedQuestionCount: number,
  now: number,
): ExamPace {
  const targetTime = new Date(`${target.targetDate}T23:59:59`).getTime();
  const daysRemaining = Math.max(Math.ceil((targetTime - now) / DAY_MS), 0);
  const remainingQuestions = Math.max(
    totalQuestionCount - studiedQuestionCount,
    0,
  );
  const availableStudyDays = Math.max(
    Math.floor((daysRemaining * target.studyDaysPerWeek) / 7),
    1,
  );
  const dailyQuestionTarget =
    remainingQuestions === 0
      ? 0
      : Math.max(Math.ceil(remainingQuestions / availableStudyDays), 1);
  const originalRemaining = Math.max(
    target.startingQuestionCount - target.startingStudiedCount,
    0,
  );
  const totalPlanDays = Math.max(
    (targetTime - target.createdAt) / DAY_MS,
    1,
  );
  const elapsedRatio = Math.min(
    Math.max((now - target.createdAt) / DAY_MS / totalPlanDays, 0),
    1,
  );
  const expectedProgress = originalRemaining * elapsedRatio;
  const actualProgress = Math.max(
    studiedQuestionCount - target.startingStudiedCount,
    0,
  );
  const tolerance = Math.max(dailyQuestionTarget, 1);
  const status: ExamPaceStatus =
    remainingQuestions === 0
      ? "complete"
      : targetTime < now
        ? "expired"
        : actualProgress > expectedProgress + tolerance
          ? "ahead"
          : actualProgress + tolerance < expectedProgress
            ? "behind"
            : "steady";

  return {
    examId: target.examId,
    targetDate: target.targetDate,
    daysRemaining,
    remainingQuestions,
    dailyQuestionTarget,
    progress:
      totalQuestionCount === 0
        ? 0
        : Math.min(studiedQuestionCount / totalQuestionCount, 1),
    status,
  };
}
