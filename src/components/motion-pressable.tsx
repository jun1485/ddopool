import * as Haptics from "expo-haptics";
import { forwardRef, useState } from "react";
import {
  Platform,
  Pressable as NativePressable,
  type PressableProps,
  type View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Springs } from "@/constants/motion";
import { useSettings } from "@/hooks/use-settings";

const AnimatedPressable = Animated.createAnimatedComponent(NativePressable);

export interface MotionPressableProps extends PressableProps {
  motionScale?: number;
  hapticFeedback?: boolean;
}

// 전체 버튼 터치 피드백 제공
export const MotionPressable = forwardRef<View, MotionPressableProps>(
  function MotionPressable(
    {
      disabled,
      motionScale = 0.97,
      hapticFeedback = true,
      onHoverIn,
      onHoverOut,
      onPressIn,
      onPressOut,
      style,
      ...props
    },
    ref,
  ) {
    const reduceMotion = useReducedMotion();
    const { settings } = useSettings();
    const hovered = useSharedValue(false);
    const pressed = useSharedValue(false);
    const scale = useSharedValue(1);
    const [isPressed, setIsPressed] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));
    // 애니메이션 style 배열과 합칠 수 있도록 상태 기반 style을 평탄화
    const resolvedStyle =
      typeof style === "function"
        ? style({ pressed: isPressed, hovered: isHovered })
        : style;

    return (
      <AnimatedPressable
        {...props}
        ref={ref}
        disabled={disabled}
        onHoverIn={(event) => {
          hovered.value = true;
          setIsHovered(true);
          if (!pressed.value)
            scale.value = reduceMotion ? 1 : withSpring(1.01, Springs.press);
          onHoverIn?.(event);
        }}
        onHoverOut={(event) => {
          hovered.value = false;
          setIsHovered(false);
          if (!pressed.value)
            scale.value = reduceMotion ? 1 : withSpring(1, Springs.press);
          onHoverOut?.(event);
        }}
        onPressIn={(event) => {
          pressed.value = true;
          setIsPressed(true);
          if (
            hapticFeedback &&
            settings.hapticsEnabled &&
            Platform.OS !== "web"
          )
            void Haptics.selectionAsync();
          scale.value = reduceMotion
            ? 1
            : withSpring(motionScale, Springs.press);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          pressed.value = false;
          setIsPressed(false);
          scale.value = reduceMotion
            ? 1
            : withSpring(hovered.value ? 1.01 : 1, Springs.press);
          onPressOut?.(event);
        }}
        style={[resolvedStyle, animatedStyle]}
      />
    );
  },
);

MotionPressable.displayName = "MotionPressable";
