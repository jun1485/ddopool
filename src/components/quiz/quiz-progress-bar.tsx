import { StyleSheet, View } from "react-native";

import { AnimatedProgressBar } from "@/components/motion/animated-progress-bar";
import { useTheme } from "@/hooks/use-theme";

export interface QuizProgressBarProps {
  progress: number;
}

// 퀴즈 진행률 바
export function QuizProgressBar({ progress }: QuizProgressBarProps) {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <AnimatedProgressBar
        progress={progress}
        height={7}
        shimmer={progress > 0 && progress < 1}
        color={progress >= 1 ? theme.success : theme.primary}
        trackColor={theme.backgroundElement}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
