import { describe, expect, test } from "@jest/globals";

import { selectAdaptiveQuestions } from "@/learning/adaptive-questions";
import type { PerformanceStats } from "@/storage/stats-store";
import type { SrsCardMap } from "@/storage/srs-store";
import type { Question } from "@/types/exam";

const NOW = new Date(2026, 8, 10, 12).getTime();
const DAY_MS = 24 * 60 * 60 * 1000;
const PERFORMANCE: PerformanceStats = {
  overall: { answered: 0, correct: 0 },
  byExam: {},
  bySubject: {},
};
const QUESTIONS: Question[] = [
  {
    id: "yesterday",
    examId: "test",
    subject: "A",
    prompt: "어제 풀이",
    choices: ["1", "2"],
    answerIndex: 0,
    explanation: "해설",
  },
  {
    id: "diagnostic",
    examId: "test",
    subject: "B",
    prompt: "진단 풀이",
    choices: ["1", "2"],
    answerIndex: 0,
    explanation: "해설",
  },
  {
    id: "new-a",
    examId: "test",
    subject: "A",
    prompt: "신규 A",
    choices: ["1", "2"],
    answerIndex: 0,
    explanation: "해설",
  },
  {
    id: "new-b",
    examId: "test",
    subject: "B",
    prompt: "신규 B",
    choices: ["1", "2"],
    answerIndex: 0,
    explanation: "해설",
  },
];
const CARDS: SrsCardMap = {
  yesterday: {
    questionId: "yesterday",
    examId: "test",
    repetitions: 1,
    easeFactor: 2.5,
    intervalDays: 1,
    dueAt: NOW,
    lastReviewedAt: NOW - DAY_MS,
  },
  diagnostic: {
    questionId: "diagnostic",
    examId: "test",
    repetitions: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    dueAt: NOW,
    lastReviewedAt: NOW,
  },
};

describe("맞춤 문제 출제 순서", () => {
  // 신규 문제 우선 출제 검증
  test("어제 풀이와 진단 문제보다 신규 문제를 먼저 출제한다", () => {
    expect(
      selectAdaptiveQuestions(QUESTIONS, CARDS, PERFORMANCE, 2, NOW, false).map(
        (question) => question.id,
      ),
    ).toEqual(["new-a", "new-b"]);
  });

  // 풀이 문제 후순위 보충 검증
  test("신규 문제 소진 후 기존 풀이 문제를 보충한다", () => {
    const selected = selectAdaptiveQuestions(
      QUESTIONS,
      CARDS,
      PERFORMANCE,
      4,
      NOW,
      false,
    ).map((question) => question.id);

    expect(selected.slice(0, 2)).toEqual(["new-a", "new-b"]);
    expect(selected.slice(2)).toEqual(
      expect.arrayContaining(["yesterday", "diagnostic"]),
    );
  });
});
