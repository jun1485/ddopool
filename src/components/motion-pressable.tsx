import { forwardRef } from "react";
import {
  Pressable as NativePressable,
  type PressableProps,
  type View,
} from "react-native";

export type MotionPressableProps = PressableProps;

// 전체 버튼 터치 피드백 제공
export const MotionPressable = forwardRef<View, MotionPressableProps>(
  function MotionPressable(props, ref) {
    return <NativePressable {...props} ref={ref} />;
  },
);

MotionPressable.displayName = "MotionPressable";
