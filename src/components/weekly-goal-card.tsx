import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { AnimatedProgressBar } from "@/components/motion/animated-progress-bar";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import type { DailyActivity } from "@/hooks/use-daily-stats";
import { useTheme } from "@/hooks/use-theme";
import type { WeeklyGoalProgress } from "@/learning/weekly-goal";

interface WeeklyGoalCardProps {
  activities: DailyActivity[];
  progress: WeeklyGoalProgress;
  onAdjust: () => void;
  onOpenActivity: () => void;
}

// 주간 목표 진행 요약 카드
export function WeeklyGoalCard({
  activities,
  progress,
  onAdjust,
  onOpenActivity,
}: WeeklyGoalCardProps) {
  const theme = useTheme();
  const maxAnswered = Math.max(
    ...activities.map((activity) => activity.answered),
    1,
  );
  const percent = Math.round(progress.progress * 100);
  const statusColor =
    progress.status === "complete"
      ? theme.success
      : progress.status === "onTrack"
        ? theme.primary
        : theme.warning;
  const statusBackground =
    progress.status === "complete"
      ? theme.successSoft
      : progress.status === "onTrack"
        ? theme.primarySoft
        : theme.warningSoft;
  const statusText =
    progress.status === "complete"
      ? "이번 주 목표를 달성했어요"
      : progress.status === "onTrack"
        ? `페이스 순조 · 이번 주 ${progress.remaining}문제 남음`
        : `이번 주 목표까지 ${progress.remaining}문제 남았어요`;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.summaryRow}>
        <View style={styles.valueRow}>
          <ThemedText style={styles.value}>{progress.answered}</ThemedText>
          <ThemedText type="smallBold" themeColor="textSecondary">
            / {progress.goal}문제
          </ThemedText>
        </View>
        <View
          style={[styles.percentBadge, { backgroundColor: statusBackground }]}
        >
          <ThemedText type="smallBold" style={{ color: statusColor }}>
            {percent}%
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="주간 학습 목표 조정"
          onPress={onAdjust}
          hitSlop={Spacing.two}
          style={({ pressed }) => [
            styles.adjustButton,
            { backgroundColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            tintColor={theme.textSecondary}
            name={{ ios: "slider.horizontal.3", android: "tune", web: "tune" }}
            size={16}
          />
        </Pressable>
      </View>

      <AnimatedProgressBar
        progress={progress.progress}
        height={6}
        color={statusColor}
        trackColor={theme.backgroundSelected}
      />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="월간 학습 기록 보기"
        onPress={onOpenActivity}
        style={({ pressed }) => [styles.activityRow, pressed && styles.pressed]}
      >
        {activities.map((activity) => (
          <View key={activity.dateKey} style={styles.dayColumn}>
            <View style={styles.barArea}>
              <View
                style={[
                  styles.activityBar,
                  {
                    height:
                      activity.answered === 0
                        ? Spacing.one
                        : 8 + (activity.answered / maxAnswered) * 26,
                    backgroundColor: activity.isFuture
                      ? theme.border
                      : activity.isToday
                        ? statusColor
                        : statusBackground,
                  },
                ]}
              />
            </View>
            <ThemedText
              type="small"
              style={[
                styles.dayLabel,
                {
                  color: activity.isToday
                    ? statusColor
                    : activity.isFuture
                      ? theme.border
                      : theme.textSecondary,
                },
                activity.isToday && styles.todayLabel,
              ]}
            >
              {activity.dayLabel}
            </ThemedText>
          </View>
        ))}
        <SymbolView
          tintColor={theme.textSecondary}
          name={{
            ios: "chevron.right",
            android: "chevron_right",
            web: "chevron_right",
          }}
          size={16}
        />
      </Pressable>

      <ThemedText type="small" themeColor="textSecondary">
        {statusText}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  valueRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.one,
  },
  value: {
    fontSize: 24,
    lineHeight: 32,
    fontWeight: 800,
  },
  percentBadge: {
    minWidth: 48,
    alignItems: "center",
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  adjustButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  activityRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.two,
  },
  dayColumn: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.one,
  },
  barArea: {
    height: 36,
    justifyContent: "flex-end",
  },
  activityBar: {
    width: 8,
    minHeight: Spacing.one,
    borderRadius: Radius.pill,
  },
  dayLabel: {
    lineHeight: 15,
  },
  todayLabel: {
    fontWeight: 800,
  },
  pressed: {
    opacity: 0.72,
  },
});
