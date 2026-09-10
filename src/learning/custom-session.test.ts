import { describe, expect, test } from "@jest/globals";

import { selectCustomSessionQuestions } from "@/learning/custom-session";
import type { PerformanceStats } from "@/storage/stats-store";
import type { SrsCardMap } from "@/storage/srs-store";
import type { Question } from "@/types/exam";

const PERFORMANCE: PerformanceStats = {
  overall: { answered: 0, correct: 0 },
  byExam: {},
  bySubject: {},
};
const QUESTIONS: Question[] = [
  "reviewed-a",
  "new-a",
  "reviewed-b",
  "new-b",
].map((id, index) => ({
  id,
  examId: "test",
  subject: index % 2 === 0 ? "A" : "B",
  prompt: id,
  choices: ["1", "2"],
  answerIndex: 0,
  explanation: "해설",
}));
const CARDS: SrsCardMap = Object.fromEntries(
  ["reviewed-a", "reviewed-b"].map((questionId) => [
    questionId,
    {
      questionId,
      examId: "test",
      repetitions: 1,
      easeFactor: 2.5,
      intervalDays: 1,
      dueAt: Date.now(),
      lastReviewedAt: Date.now(),
    },
  ]),
);

describe("맞춤 세션 문제 선정", () => {
  // 명시 구성 세션 신규 문제 우선 검증
  test("빠른 진단에서 푼 문제를 신규 문제 뒤로 배치한다", () => {
    const selected = selectCustomSessionQuestions({
      questions: QUESTIONS,
      selectedSubjects: ["A", "B"],
      performance: PERFORMANCE,
      cards: CARDS,
      count: 4,
      strategy: "balanced",
    }).map((question) => question.id);

    expect(selected.slice(0, 2)).toEqual(["new-a", "new-b"]);
    expect(selected.slice(2)).toEqual(
      expect.arrayContaining(["reviewed-a", "reviewed-b"]),
    );
  });
});
