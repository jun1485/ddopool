const BASE_RETRY_DELAY_MS = 5_000;
const MAX_RETRY_DELAY_MS = 5 * 60_000;

// 연속 실패 횟수 기준 학습 동기화 재시도 대기 시간 계산
export function learningSyncRetryDelay(
  failures: number,
  random: () => number = Math.random,
): number {
  const delay = Math.min(
    MAX_RETRY_DELAY_MS,
    BASE_RETRY_DELAY_MS * 2 ** Math.max(0, failures - 1),
  );
  // 여러 기기가 같은 시각에 몰리지 않도록 ±20% 분산
  return Math.round(delay * (0.8 + random() * 0.4));
}
