import type { PerformanceStats } from "@/storage/stats-store";
import type { Question } from "@/types/exam";

// 맞춤 세션 출제 전략
export type CustomSessionStrategy = "balanced" | "weakness" | "random";

interface CustomSessionInput {
  questions: Question[];
  selectedSubjects: string[];
  performance: PerformanceStats;
  count: number;
  strategy: CustomSessionStrategy;
}

// 문제 목록 무작위 정렬
function shuffleQuestions(questions: Question[]): Question[] {
  const shuffled = [...questions];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const targetIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[targetIndex]] = [
      shuffled[targetIndex],
      shuffled[index],
    ];
  }
  return shuffled;
}

// 과목별 균형 문제 목록 구성
function selectBalancedQuestions(
  questions: Question[],
  selectedSubjects: string[],
  count: number,
): Question[] {
  const subjectQueues = selectedSubjects.map((subject) =>
    questions.filter((question) => question.subject === subject),
  );
  const selected: Question[] = [];

  while (
    selected.length < count &&
    subjectQueues.some((queue) => queue.length > 0)
  ) {
    subjectQueues.forEach((queue) => {
      const question = queue.shift();
      if (question != null && selected.length < count) selected.push(question);
    });
  }

  return selected;
}

// 과목별 누적 정답률 계산
function getSubjectAccuracy(
  question: Question,
  performance: PerformanceStats,
): number {
  const stat =
    performance.bySubject[`${question.examId}:${question.subject}`];
  return stat == null || stat.answered === 0
    ? 101
    : stat.correct / stat.answered;
}

// 맞춤 조건 기반 세션 문제 선정
export function selectCustomSessionQuestions({
  questions,
  selectedSubjects,
  performance,
  count,
  strategy,
}: CustomSessionInput): Question[] {
  const available = questions.filter((question) =>
    selectedSubjects.includes(question.subject),
  );
  const limit = Math.min(Math.max(count, 0), available.length);

  if (strategy === "random")
    return shuffleQuestions(available).slice(0, limit);
  if (strategy === "weakness")
    return [...available]
      .sort(
        (left, right) =>
          getSubjectAccuracy(left, performance) -
          getSubjectAccuracy(right, performance),
      )
      .slice(0, limit);
  return selectBalancedQuestions(available, selectedSubjects, limit);
}
