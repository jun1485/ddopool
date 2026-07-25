import type { PerformanceStats } from "@/storage/stats-store";
import type { SrsCardMap } from "@/storage/srs-store";
import type { Question } from "@/types/exam";

export type SubjectMasteryStatus =
  | "notStarted"
  | "learning"
  | "developing"
  | "stable"
  | "mastered";

export type SubjectRecommendation =
  | "review"
  | "errors"
  | "weak"
  | "new"
  | "practice";

// 과목별 학습 숙련도
export interface SubjectMastery {
  examId: string;
  subject: string;
  score: number;
  status: SubjectMasteryStatus;
  totalQuestions: number;
  studiedQuestions: number;
  matureQuestions: number;
  dueQuestions: number;
  answered: number;
  correct: number;
  unresolvedWrongAnswers: number;
  recommendation: SubjectRecommendation;
  recommendedQuestionIds: string[];
}

interface SubjectMasteryInput {
  questions: Question[];
  enrolledExamIds: string[];
  performance: PerformanceStats;
  cards: SrsCardMap;
  unresolvedQuestionIds: string[];
  now: number;
}

// 백분율 범위 제한
function clampScore(value: number): number {
  return Math.round(Math.min(Math.max(value, 0), 100));
}

// 숙련도 점수 구간 상태 판별
function getMasteryStatus(
  score: number,
  studiedQuestions: number,
): SubjectMasteryStatus {
  if (studiedQuestions === 0) return "notStarted";
  if (score >= 85) return "mastered";
  if (score >= 65) return "stable";
  if (score >= 40) return "developing";
  return "learning";
}

// 과목별 추천 학습 우선순위 선정
function getSubjectRecommendation(
  questions: Question[],
  dueQuestionIds: string[],
  unresolvedQuestionIds: string[],
  newQuestionIds: string[],
  answered: number,
  correct: number,
): {
  recommendation: SubjectRecommendation;
  questionIds: string[];
} {
  if (dueQuestionIds.length > 0)
    return { recommendation: "review", questionIds: dueQuestionIds };
  if (unresolvedQuestionIds.length > 0)
    return { recommendation: "errors", questionIds: unresolvedQuestionIds };
  if (answered >= 2 && correct / answered < 0.7)
    return {
      recommendation: "weak",
      questionIds: questions.map((question) => question.id),
    };
  if (newQuestionIds.length > 0)
    return { recommendation: "new", questionIds: newQuestionIds };
  return {
    recommendation: "practice",
    questionIds: questions.map((question) => question.id),
  };
}

// 시험·과목별 학습 숙련도 산출
export function calculateSubjectMasteries({
  questions,
  enrolledExamIds,
  performance,
  cards,
  unresolvedQuestionIds,
  now,
}: SubjectMasteryInput): SubjectMastery[] {
  const enrolledIds = new Set(enrolledExamIds);
  const unresolvedIds = new Set(unresolvedQuestionIds);
  const subjectGroups = new Map<string, Question[]>();

  questions
    .filter((question) => enrolledIds.has(question.examId))
    .forEach((question) => {
      const key = `${question.examId}:${question.subject}`;
      subjectGroups.set(key, [
        ...(subjectGroups.get(key) ?? []),
        question,
      ]);
    });

  return [...subjectGroups.entries()].map(([key, subjectQuestions]) => {
    const { examId, subject } = subjectQuestions[0];
    const stats = performance.bySubject[key] ?? {
      answered: 0,
      correct: 0,
    };
    const studiedQuestions = subjectQuestions.filter(
      (question) => cards[question.id] != null,
    ).length;
    const matureQuestions = subjectQuestions.filter(
      (question) => (cards[question.id]?.repetitions ?? 0) >= 2,
    ).length;
    const dueQuestionIds = subjectQuestions
      .filter((question) => (cards[question.id]?.dueAt ?? Infinity) <= now)
      .map((question) => question.id);
    const subjectWrongQuestionIds = subjectQuestions
      .filter((question) => unresolvedIds.has(question.id))
      .map((question) => question.id);
    const newQuestionIds = subjectQuestions
      .filter((question) => cards[question.id] == null)
      .map((question) => question.id);
    const coverageScore =
      (studiedQuestions / subjectQuestions.length) * 100;
    const accuracyScore =
      stats.answered === 0
        ? 0
        : (stats.correct / stats.answered) *
          100 *
          Math.min(stats.answered / 10, 1);
    const retentionScore =
      studiedQuestions === 0
        ? 0
        : (matureQuestions / studiedQuestions) * 100;
    const wrongAnswerPenalty =
      (subjectWrongQuestionIds.length / subjectQuestions.length) * 10;
    const score = clampScore(
      coverageScore * 0.4 +
        accuracyScore * 0.35 +
        retentionScore * 0.25 -
        wrongAnswerPenalty,
    );
    const recommendation = getSubjectRecommendation(
      subjectQuestions,
      dueQuestionIds,
      subjectWrongQuestionIds,
      newQuestionIds,
      stats.answered,
      stats.correct,
    );

    return {
      examId,
      subject,
      score,
      status: getMasteryStatus(score, studiedQuestions),
      totalQuestions: subjectQuestions.length,
      studiedQuestions,
      matureQuestions,
      dueQuestions: dueQuestionIds.length,
      answered: stats.answered,
      correct: stats.correct,
      unresolvedWrongAnswers: subjectWrongQuestionIds.length,
      recommendation: recommendation.recommendation,
      recommendedQuestionIds: recommendation.questionIds,
    };
  });
}
