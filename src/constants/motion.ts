import {
  Easing,
  type WithSpringConfig,
  type WithTimingConfig,
} from "react-native-reanimated";

// 전환 지속 시간 단계
export const Durations = {
  instant: 120,
  fast: 180,
  base: 260,
  slow: 380,
  slower: 560,
  celebrate: 900,
} as const;

// 물리 전환 프리셋
export const Springs = {
  press: { damping: 18, stiffness: 420, mass: 0.35 },
  pop: { damping: 12, stiffness: 260, mass: 0.6 },
  gentle: { damping: 20, stiffness: 150, mass: 0.8 },
  bouncy: { damping: 9, stiffness: 220, mass: 0.7 },
} satisfies Record<string, WithSpringConfig>;

// 시간 기반 전환 프리셋
export const Timings = {
  fast: { duration: Durations.fast, easing: Easing.out(Easing.quad) },
  base: { duration: Durations.base, easing: Easing.out(Easing.cubic) },
  slow: { duration: Durations.slow, easing: Easing.out(Easing.cubic) },
  linear: { duration: Durations.slower, easing: Easing.linear },
} satisfies Record<string, WithTimingConfig>;

// 오답 흔들림 이동 거리 단계
export const ShakeOffsets = [-9, 8, -5, 3, 0] as const;

// 리스트 순차 등장 지연 산출
export function stagger(index: number, step = 55, maxIndex = 8): number {
  return Math.min(Math.max(index, 0), maxIndex) * step;
}
