import { forwardRef } from "react";
import {
  Pressable as NativePressable,
  type PressableProps,
  type PressableStateCallbackType,
  type View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(NativePressable);
const PRESS_SPRING = {
  damping: 18,
  stiffness: 420,
  mass: 0.35,
};

export interface MotionPressableProps extends PressableProps {
  motionScale?: number;
}

// 전체 버튼 터치 피드백 제공
export const MotionPressable = forwardRef<View, MotionPressableProps>(
  function MotionPressable(
    {
      disabled,
      motionScale = 0.97,
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
    const hovered = useSharedValue(false);
    const pressed = useSharedValue(false);
    const scale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
    }));

    return (
      <AnimatedPressable
        {...props}
        ref={ref}
        disabled={disabled}
        onHoverIn={(event) => {
          hovered.value = true;
          if (!pressed.value)
            scale.value = reduceMotion ? 1 : withSpring(1.01, PRESS_SPRING);
          onHoverIn?.(event);
        }}
        onHoverOut={(event) => {
          hovered.value = false;
          if (!pressed.value)
            scale.value = reduceMotion ? 1 : withSpring(1, PRESS_SPRING);
          onHoverOut?.(event);
        }}
        onPressIn={(event) => {
          pressed.value = true;
          scale.value = reduceMotion
            ? 1
            : withSpring(motionScale, PRESS_SPRING);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          pressed.value = false;
          scale.value = reduceMotion
            ? 1
            : withSpring(hovered.value ? 1.01 : 1, PRESS_SPRING);
          onPressOut?.(event);
        }}
        style={(state: PressableStateCallbackType) => [
          typeof style === "function" ? style(state) : style,
          animatedStyle,
        ]}
      />
    );
  },
);

MotionPressable.displayName = "MotionPressable";
