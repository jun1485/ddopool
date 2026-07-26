import { useEffect } from "react";
import { type DimensionValue, StyleSheet } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export interface SkeletonBlockProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
}

// 로딩 자리 표시 깜빡임 블록
export function SkeletonBlock({
  width = "100%",
  height = 16,
  radius = Radius.small,
}: SkeletonBlockProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  // 로딩 중 반복 밝기 전환
  useEffect(() => {
    if (reduceMotion) return;
    pulse.value = withRepeat(
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: 0.45 + pulse.value * 0.4,
  }));

  return (
    <Animated.View
      style={[
        styles.block,
        {
          width,
          height,
          borderRadius: radius,
          backgroundColor: theme.backgroundSelected,
        },
        pulseStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  block: {
    overflow: "hidden",
  },
});
