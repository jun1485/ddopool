import type { PerformanceStats } from "@/storage/stats-store";
import type { SrsCardMap } from "@/storage/srs-store";
import type { Question, QuizMode } from "@/types/exam";

export type StudyPlanTaskId = "review" | "weak" | "new" | "practice";

// 맞춤 학습 플랜 단위
export interface StudyPlanTask {
  id: StudyPlanTaskId;
  title: string;
  description: string;
  icon: string;
  mode: Extract<QuizMode, "learn" | "review">;
  questionIds: string[];
}

// 일일 맞춤 학습 플랜
export interface DailyStudyPlan {
  status: "ready" | "completed" | "empty";
  remainingGoal: number;
  totalCount: number;
  tasks: StudyPlanTask[];
  questionIds: string[];
}

interface DailyStudyPlanInput {
  questions: Question[];
  enrolledExamIds: string[];
  cards: SrsCardMap;
  performance: PerformanceStats;
  dailyGoal: number;
  todayAnswered: number;
  sessionSize: number;
  now: number;
}

interface WeakSubject {
  examId: string;
  subject: string;
  accuracy: number;
}

// 풀이 기록 기반 최우선 취약 과목 선정
function findWeakestSubject(
  performance: PerformanceStats,
  enrolledExamIds: Set<string>,
): WeakSubject | null {
  const weakest = Object.values(performance.bySubject)
    .filter(
      (stat) => enrolledExamIds.has(stat.examId) && stat.answered >= 2,
    )
    .sort(
      (left, right) =>
        left.correct / left.answered - right.correct / right.answered,
    )[0];
  return weakest == null
    ? null
    : {
        examId: weakest.examId,
        subject: weakest.subject,
        accuracy: Math.round((weakest.correct / weakest.answered) * 100),
      };
}

// 후보 문제 앞부분 분배
function takeQuestions(pool: Question[], count: number): Question[] {
  return pool.splice(0, Math.max(count, 0));
}

// 일일 목표·복습·취약도 기반 맞춤 플랜 구성
export function createDailyStudyPlan({
  questions,
  enrolledExamIds,
  cards,
  performance,
  dailyGoal,
  todayAnswered,
  sessionSize,
  now,
}: DailyStudyPlanInput): DailyStudyPlan {
  const remainingGoal = Math.max(dailyGoal - todayAnswered, 0);
  if (remainingGoal === 0)
    return {
      status: "completed",
      remainingGoal,
      totalCount: 0,
      tasks: [],
      questionIds: [],
    };

  const enrolledIds = new Set(enrolledExamIds);
  const eligibleQuestions = questions.filter((question) =>
    enrolledIds.has(question.examId),
  );
  if (eligibleQuestions.length === 0)
    return {
      status: "empty",
      remainingGoal,
      totalCount: 0,
      tasks: [],
      questionIds: [],
    };

  const budget = Math.min(
    remainingGoal,
    sessionSize,
    eligibleQuestions.length,
  );
  const weakestSubject = findWeakestSubject(performance, enrolledIds);
  const duePool = eligibleQuestions
    .filter((question) => (cards[question.id]?.dueAt ?? Infinity) <= now)
    .sort(
      (left, right) =>
        (cards[left.id]?.dueAt ?? now) - (cards[right.id]?.dueAt ?? now),
    );
  const dueIds = new Set(duePool.map((question) => question.id));
  const weakPool =
    weakestSubject == null
      ? []
      : eligibleQuestions.filter(
          (question) =>
            !dueIds.has(question.id) &&
            question.examId === weakestSubject.examId &&
            question.subject === weakestSubject.subject,
        );
  const weakIds = new Set(weakPool.map((question) => question.id));
  const newPool = eligibleQuestions.filter(
    (question) => cards[question.id] == null && !weakIds.has(question.id),
  );
  const newIds = new Set(newPool.map((question) => question.id));
  const practicePool = eligibleQuestions
    .filter(
      (question) =>
        !dueIds.has(question.id) &&
        !weakIds.has(question.id) &&
        !newIds.has(question.id),
    )
    .sort(
      (left, right) =>
        (cards[left.id]?.dueAt ?? Infinity) -
        (cards[right.id]?.dueAt ?? Infinity),
    );

  const reviewQuestions = takeQuestions(
    duePool,
    Math.min(duePool.length, Math.ceil(budget * 0.4)),
  );
  const weakQuestions = takeQuestions(
    weakPool,
    Math.min(weakPool.length, Math.ceil(budget * 0.3)),
  );
  const newQuestions = takeQuestions(
    newPool,
    budget - reviewQuestions.length - weakQuestions.length,
  );
  const selections = [
    { target: reviewQuestions, pool: duePool },
    { target: weakQuestions, pool: weakPool },
    { target: newQuestions, pool: newPool },
    { target: [] as Question[], pool: practicePool },
  ];
  let unfilled =
    budget -
    selections.reduce((total, selection) => total + selection.target.length, 0);
  selections.forEach((selection) => {
    if (unfilled === 0) return;
    const additions = takeQuestions(selection.pool, unfilled);
    selection.target.push(...additions);
    unfilled -= additions.length;
  });
  const practiceQuestions = selections[3].target;
  const tasks: StudyPlanTask[] = [
    ...(reviewQuestions.length > 0
      ? [
          {
            id: "review" as const,
            title: "기억 회복",
            description: "복습 시점이 된 문제부터 정리",
            icon: "🧠",
            mode: "review" as const,
            questionIds: reviewQuestions.map((question) => question.id),
          },
        ]
      : []),
    ...(weakQuestions.length > 0 && weakestSubject != null
      ? [
          {
            id: "weak" as const,
            title: "취약 보완",
            description: `${weakestSubject.subject} · 정답률 ${weakestSubject.accuracy}%`,
            icon: "🎯",
            mode: "learn" as const,
            questionIds: weakQuestions.map((question) => question.id),
          },
        ]
      : []),
    ...(newQuestions.length > 0
      ? [
          {
            id: "new" as const,
            title: "새 범위 확장",
            description: "아직 풀지 않은 문제로 범위 확장",
            icon: "✨",
            mode: "learn" as const,
            questionIds: newQuestions.map((question) => question.id),
          },
        ]
      : []),
    ...(practiceQuestions.length > 0
      ? [
          {
            id: "practice" as const,
            title: "기억 강화",
            description: "복습 예정 문제를 미리 점검",
            icon: "⚡",
            mode: "learn" as const,
            questionIds: practiceQuestions.map((question) => question.id),
          },
        ]
      : []),
  ];
  const questionIds = tasks.flatMap((task) => task.questionIds);

  return {
    status: "ready",
    remainingGoal,
    totalCount: questionIds.length,
    tasks,
    questionIds,
  };
}
