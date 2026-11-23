import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { AnimatedProgressBar } from "@/components/motion/animated-progress-bar";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { DailyStudyPlan } from "@/learning/daily-study-plan";

interface DailyStudyPlanCardProps {
  plan: DailyStudyPlan;
  isLoading: boolean;
  answered: number;
  dailyGoal: number;
  streak: number;
  emphasizeStart: boolean;
  onStartPlan: (questionIds: string[]) => void;
  onEmptyAction: () => void;
}

// 오늘 목표 진행과 학습 시작 카드
export function DailyStudyPlanCard({
  plan,
  isLoading,
  answered,
  dailyGoal,
  streak,
  emphasizeStart,
  onStartPlan,
  onEmptyAction,
}: DailyStudyPlanCardProps) {
  const theme = useTheme();
  const isGoalReached = dailyGoal > 0 && answered >= dailyGoal;
  const progress = dailyGoal === 0 ? 0 : Math.min(answered / dailyGoal, 1);
  const isEmpty = !isLoading && plan.status === "empty";
  const canStart = !isLoading && plan.status === "ready";
  const enabled = canStart || isEmpty;
  const filled = emphasizeStart || isEmpty;
  // 플랜 상태별 버튼 문구
  const buttonLabel = isLoading
    ? "오늘 풀 문제 고르는 중"
    : isEmpty
      ? "시험 추가하기"
      : canStart
        ? `오늘 ${plan.totalCount}문제 풀기`
        : "오늘 목표 완료";
  const buttonColor = !enabled
    ? theme.backgroundSelected
    : filled
      ? theme.primary
      : theme.primarySoft;
  const labelColor = !enabled
    ? theme.textSecondary
    : filled
      ? theme.onPrimary
      : theme.primary;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.headRow}>
        <ThemedText type="smallBold">오늘의 학습</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          연속 {streak}일
        </ThemedText>
      </View>

      <View style={styles.valueRow}>
        <ThemedText style={styles.value}>{answered}</ThemedText>
        <ThemedText type="smallBold" themeColor="textSecondary">
          / {dailyGoal}문제
        </ThemedText>
      </View>

      <AnimatedProgressBar
        progress={progress}
        height={6}
        color={isGoalReached ? theme.success : theme.primary}
        trackColor={theme.backgroundSelected}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        disabled={!enabled}
        onPress={() =>
          isEmpty ? onEmptyAction() : onStartPlan(plan.questionIds)
        }
        style={({ pressed }) => [
          styles.startButton,
          { backgroundColor: buttonColor },
          pressed && styles.pressed,
        ]}
      >
        {canStart && (
          <SymbolView
            tintColor={labelColor}
            name={{ ios: "play.fill", android: "play_arrow", web: "play_arrow" }}
            size={18}
          />
        )}
        <ThemedText type="smallBold" style={{ color: labelColor }}>
          {buttonLabel}
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.twoHalf,
    padding: Spacing.three,
    borderRadius: Radius.large,
  },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.one,
  },
  value: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: 800,
  },
  startButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    marginTop: Spacing.one,
    borderRadius: Radius.medium,
  },
  pressed: {
    opacity: 0.86,
  },
});
