import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";

import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export interface QuizProgressBarProps {
  progress: number;
}

// 퀴즈 진행률 바
export function QuizProgressBar({ progress }: QuizProgressBarProps) {
  const theme = useTheme();
  const [trackWidth, setTrackWidth] = useState(0);

  // progress 변경 시 채움 폭 전환
  const fillStyle = useAnimatedStyle(
    () => ({ width: withTiming(trackWidth * progress, { duration: 300 }) }),
    [trackWidth, progress],
  );

  return (
    <View
      style={[styles.track, { backgroundColor: theme.backgroundElement }]}
      onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[styles.fill, { backgroundColor: theme.primary }, fillStyle]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flex: 1,
    height: 7,
    borderRadius: Radius.pill,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: Radius.pill,
  },
});
