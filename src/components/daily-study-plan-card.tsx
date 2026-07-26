import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type {
  DailyStudyPlan,
  StudyPlanTask,
} from "@/learning/daily-study-plan";

interface DailyStudyPlanCardProps {
  plan: DailyStudyPlan;
  isLoading: boolean;
  onStartTask: (task: StudyPlanTask) => void;
  onStartPlan: (questionIds: string[]) => void;
  onEmptyAction: () => void;
  onCompletedAction: () => void;
}

// 일일 맞춤 학습 플랜 카드
export function DailyStudyPlanCard({
  plan,
  isLoading,
  onStartTask,
  onStartPlan,
  onEmptyAction,
  onCompletedAction,
}: DailyStudyPlanCardProps) {
  const theme = useTheme();

  if (isLoading)
    return (
      <ThemedView type="backgroundElement" style={styles.stateCard}>
        <View
          style={[
            styles.stateIcon,
            { backgroundColor: theme.backgroundSelected },
          ]}
        >
          <SymbolView
            tintColor={theme.textSecondary}
            name={{
              ios: "wand.and.stars",
              android: "auto_awesome",
              web: "auto_awesome",
            }}
            size={22}
          />
        </View>
        <View style={styles.stateCopy}>
          <ThemedText type="smallBold">오늘의 플랜 구성 중</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            복습 일정과 학습 기록을 분석하고 있어요
          </ThemedText>
        </View>
      </ThemedView>
    );

  if (plan.status === "completed")
    return (
      <ThemedView
        type="backgroundElement"
        style={[styles.stateCard, { borderColor: theme.successSoft }]}
      >
        <View
          style={[styles.stateIcon, { backgroundColor: theme.successSoft }]}
        >
          <SymbolView
            tintColor={theme.success}
            name={{
              ios: "checkmark.seal.fill",
              android: "verified",
              web: "verified",
            }}
            size={24}
          />
        </View>
        <View style={styles.stateCopy}>
          <ThemedText type="smallBold">오늘의 맞춤 플랜 완료</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            목표를 채웠어요. 리포트에서 성장 기록을 확인해 보세요
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="학습 리포트 보기"
          onPress={onCompletedAction}
          hitSlop={Spacing.two}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <SymbolView
            tintColor={theme.success}
            name={{
              ios: "chevron.right",
              android: "chevron_right",
              web: "chevron_right",
            }}
            size={20}
          />
        </Pressable>
      </ThemedView>
    );

  if (plan.status === "empty")
    return (
      <ThemedView type="backgroundElement" style={styles.stateCard}>
        <View
          style={[styles.stateIcon, { backgroundColor: theme.primarySoft }]}
        >
          <SymbolView
            tintColor={theme.primary}
            name={{
              ios: "books.vertical.fill",
              android: "library_books",
              web: "library_books",
            }}
            size={22}
          />
        </View>
        <View style={styles.stateCopy}>
          <ThemedText type="smallBold">
            학습할 문제를 기다리고 있어요
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            문제은행이 있는 시험을 추가하면 맞춤 플랜을 만들어요
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="시험 문제 찾아보기"
          onPress={onEmptyAction}
          hitSlop={Spacing.two}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <SymbolView
            tintColor={theme.primary}
            name={{
              ios: "chevron.right",
              android: "chevron_right",
              web: "chevron_right",
            }}
            size={20}
          />
        </Pressable>
      </ThemedView>
    );

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <View style={styles.eyebrow}>
            <SymbolView
              tintColor={theme.primary}
              name={{
                ios: "sparkles",
                android: "auto_awesome",
                web: "auto_awesome",
              }}
              size={16}
            />
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              오늘의 맞춤 플랜
            </ThemedText>
          </View>
          <ThemedText style={styles.title}>
            남은 목표를 가장 효율적인 순서로
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            복습 일정과 취약 과목을 반영한 {plan.totalCount}문제
          </ThemedText>
        </View>
        <View
          style={[styles.totalBadge, { backgroundColor: theme.primarySoft }]}
        >
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            {plan.totalCount}
          </ThemedText>
          <ThemedText style={[styles.badgeUnit, { color: theme.primary }]}>
            문제
          </ThemedText>
        </View>
      </View>

      <View style={styles.taskList}>
        {plan.tasks.map((task, index) => {
          const accent =
            task.id === "review"
              ? theme.danger
              : task.id === "weak"
                ? theme.warning
                : task.id === "new"
                  ? theme.primary
                  : theme.success;
          const softAccent =
            task.id === "review"
              ? theme.dangerSoft
              : task.id === "weak"
                ? theme.warningSoft
                : task.id === "new"
                  ? theme.primarySoft
                  : theme.successSoft;
          return (
            <Pressable
              key={task.id}
              accessibilityRole="button"
              accessibilityLabel={`${task.title} ${task.questionIds.length}문제 시작`}
              onPress={() => onStartTask(task)}
              style={({ pressed }) => [
                styles.taskRow,
                pressed && styles.taskPressed,
              ]}
            >
              <View style={styles.stepColumn}>
                <View
                  style={[styles.taskIcon, { backgroundColor: softAccent }]}
                >
                  <ThemedText style={styles.taskEmoji}>{task.icon}</ThemedText>
                </View>
                {index < plan.tasks.length - 1 && (
                  <View
                    style={[styles.stepLine, { backgroundColor: theme.border }]}
                  />
                )}
              </View>
              <View style={styles.taskCopy}>
                <View style={styles.taskTitleRow}>
                  <ThemedText type="smallBold">{task.title}</ThemedText>
                  <ThemedText type="smallBold" style={{ color: accent }}>
                    {task.questionIds.length}문제
                  </ThemedText>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  {task.description}
                </ThemedText>
              </View>
              <SymbolView
                tintColor={accent}
                name={{
                  ios: "play.circle.fill",
                  android: "play_circle",
                  web: "play_circle",
                }}
                size={23}
              />
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`맞춤 플랜 ${plan.totalCount}문제 시작`}
        onPress={() => onStartPlan(plan.questionIds)}
        style={({ pressed }) => [
          styles.startButton,
          { backgroundColor: theme.primary },
          pressed && styles.primaryPressed,
        ]}
      >
        <SymbolView
          tintColor={theme.onPrimary}
          name={{
            ios: "play.fill",
            android: "play_arrow",
            web: "play_arrow",
          }}
          size={18}
        />
        <ThemedText type="smallBold" style={styles.startButtonText}>
          맞춤 플랜 {plan.totalCount}문제 시작
        </ThemedText>
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.three,
  },
  headerCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.one,
  },
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  title: {
    fontSize: 16,
    lineHeight: 23,
    fontWeight: 800,
  },
  totalBadge: {
    minWidth: 58,
    alignItems: "center",
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
  },
  badgeUnit: {
    fontSize: 10,
    lineHeight: 13,
    fontWeight: 700,
  },
  taskList: {
    gap: Spacing.one,
  },
  taskRow: {
    minHeight: 62,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    borderRadius: Radius.medium,
  },
  stepColumn: {
    alignSelf: "stretch",
    alignItems: "center",
  },
  taskIcon: {
    zIndex: 1,
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  taskEmoji: {
    fontSize: 19,
    lineHeight: 26,
  },
  stepLine: {
    width: 2,
    flex: 1,
    minHeight: Spacing.two,
  },
  taskCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  taskTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  startButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderRadius: Radius.medium,
  },
  startButtonText: {
    color: "#FFFFFF",
  },
  stateCard: {
    minHeight: 96,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: "rgba(127, 127, 127, 0.1)",
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  stateIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  stateCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.68,
  },
  taskPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.99 }],
  },
  primaryPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
