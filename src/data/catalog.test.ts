import { expect, test } from "@jest/globals";
import { EXAMS } from "@/data/exams";
import { QUESTIONS } from "@/data/questions";

test("시험 10종 이상에 모든 과목의 학습 문제를 제공한다", () => {
  expect(EXAMS.length).toBeGreaterThanOrEqual(10);
  expect(new Set(EXAMS.map((exam) => exam.id)).size).toBe(EXAMS.length);
  expect(new Set(QUESTIONS.map((question) => question.id)).size).toBe(
    QUESTIONS.length,
  );
  for (const exam of EXAMS) {
    for (const subject of exam.subjects) {
      expect(
        QUESTIONS.some(
          (question) =>
            question.examId === exam.id && question.subject === subject,
        ),
      ).toBe(true);
    }
  }
  for (const question of QUESTIONS) {
    const exam = EXAMS.find((item) => item.id === question.examId);
    expect(exam?.subjects).toContain(question.subject);
    expect(question.prompt.trim()).not.toBe("");
    expect(question.explanation.trim()).not.toBe("");
    expect(question.choices.length).toBeGreaterThanOrEqual(2);
    expect(question.choices.every((choice) => choice.trim().length > 0)).toBe(
      true,
    );
    expect(Number.isInteger(question.answerIndex)).toBe(true);
    expect(question.answerIndex).toBeGreaterThanOrEqual(0);
    expect(question.answerIndex).toBeLessThan(question.choices.length);
  }
});
