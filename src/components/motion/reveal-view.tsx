import type { PropsWithChildren } from "react";
import type { ViewProps } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  ZoomIn,
  useReducedMotion,
} from "react-native-reanimated";

import { Durations } from "@/constants/motion";

// 등장 전환 방향
export type RevealVariant = "rise" | "drop" | "fade" | "zoom";

export interface RevealViewProps extends ViewProps {
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
}

// 진입 애니메이션 프리셋 생성
function createEntering(
  variant: RevealVariant,
  delay: number,
  duration: number,
) {
  const preset =
    variant === "drop"
      ? FadeInUp
      : variant === "fade"
        ? FadeIn
        : variant === "zoom"
          ? ZoomIn
          : FadeInDown;
  return preset.delay(delay).duration(duration);
}

// 카드·섹션 등장 전환 적용
export function RevealView({
  variant = "rise",
  delay = 0,
  duration = Durations.base,
  children,
  ...props
}: PropsWithChildren<RevealViewProps>) {
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      {...props}
      entering={
        reduceMotion ? undefined : createEntering(variant, delay, duration)
      }
    >
      {children}
    </Animated.View>
  );
}
