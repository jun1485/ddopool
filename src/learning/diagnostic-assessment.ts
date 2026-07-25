// 진단 과목별 결과
export interface DiagnosticSubjectResult {
  subject: string;
  correct: number;
  total: number;
}

// 빠른 진단 수준 분석
export interface DiagnosticAssessment {
  score: number;
  level: "starter" | "growing" | "ready";
  label: string;
  description: string;
  focusSubject: string | null;
  recommendation: string;
}

// 빠른 진단 점수·취약 과목 분석
export function createDiagnosticAssessment(
  correctCount: number,
  totalCount: number,
  subjectResults: DiagnosticSubjectResult[],
): DiagnosticAssessment {
  const score =
    totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100);
  const focusSubject =
    [...subjectResults].sort(
      (left, right) =>
        left.correct / left.total - right.correct / right.total,
    )[0]?.subject ?? null;

  if (score >= 80)
    return {
      score,
      level: "ready",
      label: "실전 도전 가능",
      description: "핵심 개념이 안정적이에요. 실전 감각을 높일 단계예요.",
      focusSubject,
      recommendation:
        focusSubject == null
          ? "모의고사로 시간 관리 감각을 점검해 보세요."
          : `${focusSubject}를 보완한 뒤 모의고사 점수를 비교해 보세요.`,
    };
  if (score >= 50)
    return {
      score,
      level: "growing",
      label: "핵심 보완 단계",
      description: "기본 흐름은 잡혀 있어요. 취약 과목을 먼저 채워보세요.",
      focusSubject,
      recommendation:
        focusSubject == null
          ? "틀린 문제 중심으로 짧은 학습을 반복해 보세요."
          : `${focusSubject} 정답률을 먼저 올리는 집중 학습을 추천해요.`,
    };
  return {
    score,
    level: "starter",
    label: "기초 다지기",
    description: "지금부터 시작하면 돼요. 개념과 해설을 천천히 익혀보세요.",
    focusSubject,
    recommendation:
      focusSubject == null
        ? "바로 학습 모드에서 해설과 함께 시작해 보세요."
        : `${focusSubject} 기초 문제부터 해설을 확인하며 시작해 보세요.`,
  };
}
