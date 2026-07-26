import { useEffect } from "react";
import {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
  type AnimatedStyle,
} from "react-native-reanimated";
import type { ViewStyle } from "react-native";

import { Springs, Timings } from "@/constants/motion";

export interface SelectionTransitionColors {
  background: [string, string];
  border?: [string, string];
  scaleTo?: number;
}

// 선택 상태 전환 시 배경·테두리·확대 보간 스타일 제공
export function useSelectionTransition(
  selected: boolean,
  colors: SelectionTransitionColors,
): AnimatedStyle<ViewStyle> {
  const reduceMotion = useReducedMotion();
  const progress = useSharedValue(selected ? 1 : 0);
  const { background, border, scaleTo = 1 } = colors;

  useEffect(() => {
    const target = selected ? 1 : 0;
    progress.value = reduceMotion ? target : withTiming(target, Timings.fast);
  }, [progress, reduceMotion, selected]);

  return useAnimatedStyle(
    () => ({
      backgroundColor: interpolateColor(progress.value, [0, 1], background),
      ...(border == null
        ? {}
        : { borderColor: interpolateColor(progress.value, [0, 1], border) }),
      transform: [
        {
          scale:
            reduceMotion || scaleTo === 1
              ? 1
              : withSpring(1 + progress.value * (scaleTo - 1), Springs.pop),
        },
      ],
    }),
    [background, border, reduceMotion, scaleTo],
  );
}
