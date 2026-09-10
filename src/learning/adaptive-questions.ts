import type { PerformanceStats } from "@/storage/stats-store";
import type { SrsCardMap } from "@/storage/srs-store";
import type { Question } from "@/types/exam";

type AdaptiveGroup = "due" | "new" | "practice";

const ADAPTIVE_GROUPS: AdaptiveGroup[] = ["new", "due", "practice"];

// 문제 과목 취약도 계산
function calculateSubjectWeakness(
  question: Question,
  performance: PerformanceStats,
): number {
  const stat = performance.bySubject[`${question.examId}:${question.subject}`];
  if (stat == null || stat.answered === 0) return 0.5;
  const accuracy = stat.correct / stat.answered;
  const confidence = Math.min(stat.answered / 10, 1);
  return (1 - accuracy) * confidence + 0.5 * (1 - confidence);
}

// 문제 맞춤 우선순위 계산
function calculateQuestionPriority(
  question: Question,
  cards: SrsCardMap,
  performance: PerformanceStats,
  now: number,
  randomize: boolean,
): number {
  const card = cards[question.id];
  const weakness = calculateSubjectWeakness(question, performance) * 100;
  const overdueDays =
    card == null ? 0 : Math.max((now - card.dueAt) / 86_400_000, 0);
  const familiarity =
    card == null ? 35 : Math.max(25 - card.repetitions * 5, 0);
  const jitter = randomize ? Math.random() * 12 : 0;
  return weakness + overdueDays * 8 + familiarity + jitter;
}

// 문제 맞춤 그룹 분류
function classifyAdaptiveGroup(
  question: Question,
  cards: SrsCardMap,
  now: number,
): AdaptiveGroup {
  const card = cards[question.id];
  if (card == null) return "new";
  return card.dueAt <= now ? "due" : "practice";
}

// 맞춤 그룹 내부 우선순위 정렬
function sortAdaptiveGroup(
  questions: Question[],
  cards: SrsCardMap,
  performance: PerformanceStats,
  now: number,
  randomize: boolean,
): Question[] {
  return questions
    .map((question) => ({
      question,
      priority: calculateQuestionPriority(
        question,
        cards,
        performance,
        now,
        randomize,
      ),
    }))
    .sort((left, right) => right.priority - left.priority)
    .map((item) => item.question);
}

// SRS·취약 과목 기반 맞춤 문제 선택
export function selectAdaptiveQuestions(
  questions: Question[],
  cards: SrsCardMap,
  performance: PerformanceStats,
  limit: number,
  now: number,
  randomize: boolean,
): Question[] {
  const groups: Record<AdaptiveGroup, Question[]> = {
    due: [],
    new: [],
    practice: [],
  };
  questions.forEach((question) => {
    groups[classifyAdaptiveGroup(question, cards, now)].push(question);
  });
  ADAPTIVE_GROUPS.forEach((group) => {
    groups[group] = sortAdaptiveGroup(
      groups[group],
      cards,
      performance,
      now,
      randomize,
    );
  });

  return ADAPTIVE_GROUPS.flatMap((group) => groups[group]).slice(
    0,
    Math.min(limit, questions.length),
  );
}
