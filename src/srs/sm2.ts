import { ExamId, SrsCard } from "@/types/exam";

// SM-2 품질 점수 (정답 4, 오답 2)
const QUALITY_CORRECT = 4;
const QUALITY_INCORRECT = 2;

const INITIAL_EASE_FACTOR = 2.5;
const MIN_EASE_FACTOR = 1.3;
const DAY_MS = 24 * 60 * 60 * 1000;

// 신규 문제 SRS 카드 생성
export function createSrsCard(
  questionId: string,
  examId: ExamId,
  now: number,
): SrsCard {
  return {
    questionId,
    examId,
    repetitions: 0,
    easeFactor: INITIAL_EASE_FACTOR,
    intervalDays: 0,
    dueAt: now,
    lastReviewedAt: now,
  };
}

// 정답 여부 기반 SRS 카드 갱신 (SM-2)
export function reviewSrsCard(
  card: SrsCard,
  isCorrect: boolean,
  now: number,
): SrsCard {
  const quality = isCorrect ? QUALITY_CORRECT : QUALITY_INCORRECT;
  // easeFactor 갱신 후 하한 보정
  const easeFactor = Math.max(
    MIN_EASE_FACTOR,
    card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  // 오답: repetitions 초기화 + 즉시 복습 대상 전환
  if (!isCorrect) {
    return {
      ...card,
      repetitions: 0,
      easeFactor,
      intervalDays: 0,
      dueAt: now,
      lastReviewedAt: now,
    };
  }

  // 정답: repetitions 단계별 복습 간격 확장
  const repetitions = card.repetitions + 1;
  const intervalDays =
    repetitions === 1
      ? 1
      : repetitions === 2
        ? 3
        : Math.round(card.intervalDays * easeFactor);

  return {
    ...card,
    repetitions,
    easeFactor,
    intervalDays,
    dueAt: now + intervalDays * DAY_MS,
    lastReviewedAt: now,
  };
}
