import { expect, test } from "@jest/globals";

import { pickParticle } from "./legal-documents";

test("운영자 이름 받침 유무에 맞는 조사를 고른다", () => {
  expect(pickParticle("김철민", "은", "는")).toBe("은");
  expect(pickParticle("또풀 운영자", "은", "는")).toBe("는");
  expect(pickParticle("홍길동", "이", "가")).toBe("이");
  expect(pickParticle("김하나", "이", "가")).toBe("가");
});

test("한글로 끝나지 않는 이름은 두 조사를 함께 표기한다", () => {
  expect(pickParticle("ddopool Inc.", "은", "는")).toBe("은(는)");
});
