import type { PerformanceStats } from "@/storage/stats-store";
import type { SrsCardMap } from "@/storage/srs-store";
import type { Question } from "@/types/exam";

// 맞춤 세션 출제 전략
export type CustomSessionStrategy = "balanced" | "weakness" | "random";

interface CustomSessionInput {
  questions: Question[];
  selectedSubjects: string[];
  performance: PerformanceStats;
  cards: SrsCardMap;
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
  const stat = performance.bySubject[`${question.examId}:${question.subject}`];
  return stat == null || stat.answered === 0
    ? 101
    : stat.correct / stat.answered;
}

// 출제 전략별 문제 목록 구성
function selectQuestionsByStrategy(
  questions: Question[],
  selectedSubjects: string[],
  performance: PerformanceStats,
  count: number,
  strategy: CustomSessionStrategy,
): Question[] {
  if (strategy === "random") return shuffleQuestions(questions).slice(0, count);
  if (strategy === "weakness")
    return [...questions]
      .sort(
        (left, right) =>
          getSubjectAccuracy(left, performance) -
          getSubjectAccuracy(right, performance),
      )
      .slice(0, count);
  return selectBalancedQuestions(questions, selectedSubjects, count);
}

// 맞춤 조건 기반 세션 문제 선정
export function selectCustomSessionQuestions({
  questions,
  selectedSubjects,
  performance,
  cards,
  count,
  strategy,
}: CustomSessionInput): Question[] {
  const available = questions.filter((question) =>
    selectedSubjects.includes(question.subject),
  );
  const limit = Math.min(Math.max(count, 0), available.length);
  const unseen = available.filter((question) => cards[question.id] == null);
  const reviewed = available.filter((question) => cards[question.id] != null);
  const selectedUnseen = selectQuestionsByStrategy(
    unseen,
    selectedSubjects,
    performance,
    limit,
    strategy,
  );
  return [
    ...selectedUnseen,
    ...selectQuestionsByStrategy(
      reviewed,
      selectedSubjects,
      performance,
      limit - selectedUnseen.length,
      strategy,
    ),
  ];
}
