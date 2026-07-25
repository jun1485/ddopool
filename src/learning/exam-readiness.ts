import type { AccuracyStat } from "@/storage/stats-store";

export type ReadinessFactorId =
  | "coverage"
  | "accuracy"
  | "retention"
  | "consistency"
  | "errors";

// 시험 준비도 구성 요인
export interface ReadinessFactor {
  id: ReadinessFactorId;
  label: string;
  description: string;
  score: number;
  weight: number;
}

// 시험별 학습 준비도
export interface ExamReadiness {
  examId: string;
  score: number;
  label: string;
  factors: ReadinessFactor[];
  recommendation: ReadinessFactorId;
  recommendationTitle: string;
  recommendationDescription: string;
}

interface ExamReadinessInput {
  examId: string;
  totalQuestions: number;
  studiedQuestions: number;
  matureQuestions: number;
  dueQuestions: number;
  performance: AccuracyStat;
  unresolvedWrongAnswers: number;
  streak: number;
}

const FACTOR_WEIGHTS: Record<ReadinessFactorId, number> = {
  coverage: 0.3,
  accuracy: 0.3,
  retention: 0.2,
  consistency: 0.1,
  errors: 0.1,
};

// 백분율 범위 제한
function clampScore(value: number): number {
  return Math.round(Math.min(Math.max(value, 0), 100));
}

// 준비도 점수 구간 라벨 생성
function getReadinessLabel(score: number): string {
  if (score >= 80) return "마무리 점검 단계";
  if (score >= 65) return "실전 감각 강화 단계";
  if (score >= 40) return "기초 확장 단계";
  if (score > 0) return "학습 기반 형성 단계";
  return "첫 학습 준비 단계";
}

// 최우선 보완 요인 안내 생성
function getRecommendation(factor: ReadinessFactor): {
  title: string;
  description: string;
} {
  if (factor.id === "coverage")
    return {
      title: "새 범위를 먼저 넓혀 보세요",
      description: "아직 만나지 않은 문제를 풀어 전체 출제 범위를 확인해요.",
    };
  if (factor.id === "accuracy")
    return {
      title: "취약 과목 정확도를 높여 보세요",
      description: "정답률이 낮은 과목을 짧게 집중 학습해요.",
    };
  if (factor.id === "retention")
    return {
      title: "기억 정착 복습이 필요해요",
      description: "복습 시점이 된 문제부터 다시 풀어 기억을 고정해요.",
    };
  if (factor.id === "errors")
    return {
      title: "미해결 오답부터 정리해요",
      description: "반복되는 실수 원인을 확인하고 오답 문제만 다시 풀어요.",
    };
  return {
    title: "짧게라도 매일 이어가 보세요",
    description: "일주일 동안 규칙적으로 학습해 감각을 유지해요.",
  };
}

// 학습 기록 기반 시험 준비도 산출
export function calculateExamReadiness({
  examId,
  totalQuestions,
  studiedQuestions,
  matureQuestions,
  dueQuestions,
  performance,
  unresolvedWrongAnswers,
  streak,
}: ExamReadinessInput): ExamReadiness {
  const coverageScore =
    totalQuestions === 0 ? 0 : (studiedQuestions / totalQuestions) * 100;
  const accuracyConfidence = Math.min(performance.answered / 20, 1);
  const accuracyScore =
    performance.answered === 0
      ? 0
      : (performance.correct / performance.answered) *
        100 *
        accuracyConfidence;
  const retentionScore =
    studiedQuestions === 0
      ? 0
      : (matureQuestions / studiedQuestions) * 70 +
        (1 - Math.min(dueQuestions / studiedQuestions, 1)) * 30;
  const consistencyScore = Math.min(streak / 7, 1) * 100;
  const errorScore =
    studiedQuestions === 0
      ? 0
      : (1 - Math.min(unresolvedWrongAnswers / studiedQuestions, 1)) * 100;
  const factors: ReadinessFactor[] = [
    {
      id: "coverage",
      label: "범위 학습",
      description: `${studiedQuestions}/${totalQuestions}문제 경험`,
      score: clampScore(coverageScore),
      weight: FACTOR_WEIGHTS.coverage,
    },
    {
      id: "accuracy",
      label: "풀이 정확도",
      description:
        performance.answered === 0
          ? "풀이 기록 없음"
          : `${performance.correct}/${performance.answered}문제 정답`,
      score: clampScore(accuracyScore),
      weight: FACTOR_WEIGHTS.accuracy,
    },
    {
      id: "retention",
      label: "기억 정착",
      description: `${matureQuestions}문제 반복 학습 · 복습 ${dueQuestions}개`,
      score: clampScore(retentionScore),
      weight: FACTOR_WEIGHTS.retention,
    },
    {
      id: "consistency",
      label: "학습 꾸준함",
      description: `${streak}일 연속 학습`,
      score: clampScore(consistencyScore),
      weight: FACTOR_WEIGHTS.consistency,
    },
    {
      id: "errors",
      label: "오답 정리",
      description: `미해결 오답 ${unresolvedWrongAnswers}개`,
      score: clampScore(errorScore),
      weight: FACTOR_WEIGHTS.errors,
    },
  ];
  const score = clampScore(
    factors.reduce(
      (total, factor) => total + factor.score * factor.weight,
      0,
    ),
  );
  const weakestFactor = [...factors].sort(
    (left, right) => left.score - right.score,
  )[0];
  const recommendation = getRecommendation(weakestFactor);

  return {
    examId,
    score,
    label: getReadinessLabel(score),
    factors,
    recommendation: weakestFactor.id,
    recommendationTitle: recommendation.title,
    recommendationDescription: recommendation.description,
  };
}
