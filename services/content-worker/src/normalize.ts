// 중복 비교 텍스트 정규화
export function normalizeContentText(value: string): string {
  return value
    .toLocaleLowerCase()
    .replaceAll(/[^0-9a-z가-힣]/g, "")
    .trim();
}

// 텍스트 문자 조각 집합 생성
export function createCharacterBigrams(value: string): Set<string> {
  const normalized = normalizeContentText(value);
  if (normalized.length < 2) return new Set([normalized]);
  return new Set(
    Array.from({ length: normalized.length - 1 }, (_, index) =>
      normalized.slice(index, index + 2),
    ),
  );
}

// 문자 조각 유사도 계산
export function calculateTextSimilarity(left: string, right: string): number {
  const leftBigrams = createCharacterBigrams(left);
  const rightBigrams = createCharacterBigrams(right);
  const union = new Set([...leftBigrams, ...rightBigrams]);
  if (union.size === 0) return 1;
  const intersectionCount = [...leftBigrams].filter((value) =>
    rightBigrams.has(value),
  ).length;
  return intersectionCount / union.size;
}
