import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

export interface PulseViewProps {
  active?: boolean;
  scaleTo?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}

// 강조 요소 반복 확대 전환 래퍼
export function PulseView({
  active = true,
  scaleTo = 1.08,
  duration = 1100,
  style,
  children,
}: PropsWithChildren<PulseViewProps>) {
  const reduceMotion = useReducedMotion();
  const pulse = useSharedValue(0);

  // active 상태에서만 반복 전환 유지
  useEffect(() => {
    if (!active || reduceMotion) {
      cancelAnimation(pulse);
      pulse.value = withTiming(0, { duration: 160 });
      return;
    }
    pulse.value = withRepeat(
      withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [active, duration, pulse, reduceMotion]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * (scaleTo - 1) }],
  }));

  return (
    <Animated.View style={[style, pulseStyle]}>{children}</Animated.View>
  );
}
