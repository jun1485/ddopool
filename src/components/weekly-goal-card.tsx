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
  canStart: boolean;
  onStart: () => void;
  onAdjust: () => void;
  onOpenActivity: () => void;
}

// 주간 목표 진행·학습 실행 카드
export function WeeklyGoalCard({
  activities,
  progress,
  canStart,
  onStart,
  onAdjust,
  onOpenActivity,
}: WeeklyGoalCardProps) {
  const theme = useTheme();
  const maxAnswered = Math.max(
    ...activities.map((activity) => activity.answered),
    1,
  );
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
  const statusTitle =
    progress.status === "complete"
      ? "이번 주 목표 달성"
      : progress.status === "onTrack"
        ? "오늘 페이스 완료"
        : `오늘 ${progress.remainingToday}문제 더 추천`;
  const statusDescription =
    progress.status === "complete"
      ? "다음 주를 위해 가볍게 복습하거나 기록을 돌아보세요."
      : progress.status === "onTrack"
        ? `이번 주 ${progress.remaining}문제가 남았어요.`
        : "남은 날에 무리하지 않도록 오늘 분량을 나눴어요.";

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View>
          <ThemedText style={styles.sectionTitle}>이번 주 목표</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            월요일부터 일요일까지의 학습 페이스
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
            size={17}
          />
        </Pressable>
      </View>

      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.summaryRow}>
          <View style={styles.progressCopy}>
            <View style={styles.valueRow}>
              <ThemedText style={styles.value}>{progress.answered}</ThemedText>
              <ThemedText type="smallBold" themeColor="textSecondary">
                / {progress.goal}문제
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              주간 목표의 {Math.round(progress.progress * 100)}% 완료
            </ThemedText>
          </View>
          <View
            style={[styles.percentBadge, { backgroundColor: statusBackground }]}
          >
            <ThemedText type="smallBold" style={{ color: statusColor }}>
              {Math.round(progress.progress * 100)}%
            </ThemedText>
          </View>
        </View>

        <AnimatedProgressBar
          progress={progress.progress}
          height={9}
          color={statusColor}
          trackColor={theme.backgroundSelected}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="월간 학습 기록 보기"
          onPress={onOpenActivity}
          style={({ pressed }) => [
            styles.activityRow,
            pressed && styles.pressed,
          ]}
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
                          : 10 + (activity.answered / maxAnswered) * 30,
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

        <View
          style={[styles.statusPanel, { backgroundColor: statusBackground }]}
        >
          <View style={styles.statusCopy}>
            <ThemedText type="smallBold" style={{ color: statusColor }}>
              {statusTitle}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {statusDescription}
            </ThemedText>
          </View>
          {progress.status === "complete" ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="월간 학습 기록 보기"
              onPress={onOpenActivity}
              hitSlop={Spacing.two}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <SymbolView
                tintColor={statusColor}
                name={{
                  ios: "chart.bar.fill",
                  android: "bar_chart",
                  web: "bar_chart",
                }}
                size={22}
              />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="주간 목표 맞춤 학습 시작"
              accessibilityState={{ disabled: !canStart }}
              disabled={!canStart}
              onPress={onStart}
              style={({ pressed }) => [
                styles.startButton,
                { backgroundColor: statusColor },
                !canStart && styles.disabled,
                pressed && styles.startPressed,
              ]}
            >
              <ThemedText type="smallBold" style={styles.startText}>
                학습 시작
              </ThemedText>
              <SymbolView
                tintColor={theme.onPrimary}
                name={{
                  ios: "arrow.right",
                  android: "arrow_forward",
                  web: "arrow_forward",
                }}
                size={16}
              />
            </Pressable>
          )}
        </View>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: 800,
  },
  adjustButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  progressCopy: {
    gap: Spacing.half,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.one,
  },
  value: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: 900,
  },
  percentBadge: {
    minWidth: 52,
    alignItems: "center",
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  activityRow: {
    minHeight: 64,
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
    height: 42,
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
  statusPanel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  statusCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  startButton: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
  },
  startText: {
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.72,
  },
  startPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.45,
  },
});
