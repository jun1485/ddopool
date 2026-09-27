import { SymbolView } from "expo-symbols";
import { View } from "react-native";

import { quizStyles as styles } from "@/components/quiz/quiz-styles";
import { ThemedText } from "@/components/themed-text";
import { useCountdown } from "@/hooks/use-countdown";
import { useTheme } from "@/hooks/use-theme";

interface MockTimerBadgeProps {
  durationSeconds: number;
  active: boolean;
  deadline?: number;
  onExpire: () => void;
}

// 남은 시간 분·초 표시
function formatRemainingTime(remainingSeconds: number): string {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// 모의고사 남은 시간 배지
export function MockTimerBadge({
  durationSeconds,
  active,
  deadline,
  onExpire,
}: MockTimerBadgeProps) {
  const theme = useTheme();
  const remainingSeconds = useCountdown(
    durationSeconds,
    active,
    onExpire,
    deadline,
  );
  const isUrgent = remainingSeconds <= 60;

  return (
    <View
      style={[
        styles.timerBadge,
        {
          backgroundColor: isUrgent
            ? theme.dangerSoft
            : theme.backgroundElement,
        },
      ]}
    >
      <SymbolView
        tintColor={isUrgent ? theme.danger : theme.textSecondary}
        name={{ ios: "timer", android: "timer", web: "timer" }}
        size={15}
      />
      <ThemedText
        type="smallBold"
        style={{ color: isUrgent ? theme.danger : theme.textSecondary }}
      >
        {formatRemainingTime(remainingSeconds)}
      </ThemedText>
    </View>
  );
}
