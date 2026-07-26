import { useEffect, useState } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Springs } from "@/constants/motion";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export interface AnimatedProgressBarProps {
  progress: number;
  color?: string;
  trackColor?: string;
  height?: number;
  shimmer?: boolean;
  style?: StyleProp<ViewStyle>;
}

// 진행률 채움 전환 바
export function AnimatedProgressBar({
  progress,
  color,
  trackColor,
  height = 8,
  shimmer = false,
  style,
}: AnimatedProgressBarProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [trackWidth, setTrackWidth] = useState(0);
  const glow = useSharedValue(0);
  const ratio = Math.min(Math.max(progress, 0), 1);
  const fillWidth = trackWidth * ratio;

  // progress 변경 시 채움 폭 전환
  const fillStyle = useAnimatedStyle(
    () => ({
      width: reduceMotion ? fillWidth : withSpring(fillWidth, Springs.gentle),
    }),
    [fillWidth, reduceMotion],
  );

  // 진행 중 채움 구간 반복 하이라이트 시작·중단
  useEffect(() => {
    if (!shimmer || reduceMotion || ratio === 0) {
      cancelAnimation(glow);
      glow.value = 0;
      return;
    }
    glow.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => cancelAnimation(glow);
  }, [glow, ratio, reduceMotion, shimmer]);

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.28,
  }));

  return (
    <View
      style={[
        styles.track,
        { height, backgroundColor: trackColor ?? theme.backgroundSelected },
        style,
      ]}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          styles.fill,
          { backgroundColor: color ?? theme.primary },
          fillStyle,
        ]}
      >
        <Animated.View
          style={[styles.shimmer, { backgroundColor: "#FFFFFF" }, shimmerStyle]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    borderRadius: Radius.pill,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: Radius.pill,
    overflow: "hidden",
  },
  shimmer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
