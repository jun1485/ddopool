import { describe, expect, it } from "@jest/globals";

import { buildResultShareMessage } from "@/lib/share-result";

describe("학습 결과 공유 문구", () => {
  it("시험 이름·점수·시험 소개 링크를 담는다", () => {
    expect(
      buildResultShareMessage({
        examId: "sqld",
        examTitle: "SQLD",
        correctCount: 17,
        totalCount: 20,
      }),
    ).toBe(
      "또풀에서 SQLD 20문제 중 17문제를 맞혔어요 (정답률 85%)\n같이 풀어 보기 https://ddopool.vercel.app/exams/sqld",
    );
  });

  it("여러 시험을 섞은 세션은 첫 화면 링크를 쓴다", () => {
    expect(
      buildResultShareMessage({
        examId: "all",
        correctCount: 3,
        totalCount: 10,
      }),
    ).toBe(
      "또풀에서 10문제 중 3문제를 맞혔어요 (정답률 30%)\n같이 풀어 보기 https://ddopool.vercel.app",
    );
  });
});
