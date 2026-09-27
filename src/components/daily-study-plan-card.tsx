import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { MascotCat } from "@/components/mascot-cat";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { AnimatedProgressBar } from "@/components/motion/animated-progress-bar";
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
  answered: number;
  dailyGoal: number;
  streak: number;
  accuracyRate: number | null;
  emphasizeStart: boolean;
  onStartTask: (task: StudyPlanTask) => void;
  onStartPlan: (questionIds: string[]) => void;
  onEmptyAction: () => void;
  onCompletedAction: () => void;
}

// 오늘 목표 진행과 맞춤 플랜 카드
export function DailyStudyPlanCard({
  plan,
  isLoading,
  answered,
  dailyGoal,
  streak,
  accuracyRate,
  emphasizeStart,
  onStartTask,
  onStartPlan,
  onEmptyAction,
  onCompletedAction,
}: DailyStudyPlanCardProps) {
  const theme = useTheme();
  const isGoalReached = dailyGoal > 0 && answered >= dailyGoal;
  const progress = dailyGoal === 0 ? 0 : Math.min(answered / dailyGoal, 1);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.goalHeader}>
        <View style={styles.goalCopy}>
          <ThemedText type="smallBold" themeColor="textSecondary">
            오늘의 목표
          </ThemedText>
          <View style={styles.goalValueRow}>
            <AnimatedCounter style={styles.goalValue} value={answered} />
            <ThemedText type="smallBold" themeColor="textSecondary">
              / {dailyGoal}문제
            </ThemedText>
          </View>
          <View style={styles.metaRow}>
            <ThemedText type="small" themeColor="textSecondary">
              🔥 {streak}일 연속
            </ThemedText>
            <View style={[styles.metaDot, { backgroundColor: theme.border }]} />
            <ThemedText type="small" themeColor="textSecondary">
              정답률 {accuracyRate == null ? "–" : `${accuracyRate}%`}
            </ThemedText>
          </View>
        </View>
        <MascotCat size={60} />
      </View>

      <AnimatedProgressBar
        progress={progress}
        height={8}
        shimmer={!isGoalReached && progress > 0}
        color={isGoalReached ? theme.success : theme.primary}
        trackColor={theme.backgroundSelected}
      />

      <View style={[styles.separator, { backgroundColor: theme.border }]} />

      {isLoading ? (
        <View style={styles.stateRow}>
          <SymbolView
            tintColor={theme.textSecondary}
            name={{
              ios: "wand.and.stars",
              android: "checklist",
              web: "checklist",
            }}
            size={20}
          />
          <View style={styles.stateCopy}>
            <ThemedText type="smallBold">오늘의 플랜 구성 중</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              복습 일정과 학습 기록을 분석하고 있어요
            </ThemedText>
          </View>
        </View>
      ) : plan.status === "completed" ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="학습 리포트 보기"
          onPress={onCompletedAction}
          style={({ pressed }) => [styles.stateRow, pressed && styles.pressed]}
        >
          <SymbolView
            tintColor={theme.success}
            name={{
              ios: "checkmark.seal.fill",
              android: "verified",
              web: "verified",
            }}
            size={22}
          />
          <View style={styles.stateCopy}>
            <ThemedText type="smallBold">오늘의 맞춤 플랜 완료</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              리포트에서 오늘 쌓은 기록을 확인해 보세요
            </ThemedText>
          </View>
          <SymbolView
            tintColor={theme.textSecondary}
            name={{
              ios: "chevron.right",
              android: "chevron_right",
              web: "chevron_right",
            }}
            size={18}
          />
        </Pressable>
      ) : plan.status === "empty" ? (
        <>
          <View style={styles.stateRow}>
            <SymbolView
              tintColor={theme.primary}
              name={{
                ios: "books.vertical.fill",
                android: "library_books",
                web: "library_books",
              }}
              size={20}
            />
            <View style={styles.stateCopy}>
              <ThemedText type="smallBold">
                학습할 문제를 기다리고 있어요
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                문제은행이 있는 시험을 추가하면 맞춤 플랜을 만들어요
              </ThemedText>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="시험 문제 찾아보기"
            onPress={onEmptyAction}
            style={({ pressed }) => [
              styles.startButton,
              { backgroundColor: theme.primary },
              pressed && styles.primaryPressed,
            ]}
          >
            <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
              시험 찾아보기
            </ThemedText>
          </Pressable>
        </>
      ) : (
        <>
          <View style={styles.planHeader}>
            <ThemedText type="smallBold">오늘의 맞춤 플랜</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              복습·취약 과목 반영 {plan.totalCount}문제
            </ThemedText>
          </View>

          <View style={styles.taskList}>
            {plan.tasks.map((task) => {
              const accent =
                task.id === "review"
                  ? theme.danger
                  : task.id === "weak"
                    ? theme.warning
                    : task.id === "new"
                      ? theme.primary
                      : theme.success;
              return (
                <Pressable
                  key={task.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${task.title} ${task.questionIds.length}문제 시작`}
                  onPress={() => onStartTask(task)}
                  style={({ pressed }) => [
                    styles.taskRow,
                    { backgroundColor: theme.background },
                    pressed && styles.taskPressed,
                  ]}
                >
                  <View style={[styles.taskDot, { backgroundColor: accent }]} />
                  <View style={styles.taskCopy}>
                    <ThemedText type="smallBold">{task.title}</ThemedText>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      numberOfLines={1}
                    >
                      {task.description}
                    </ThemedText>
                  </View>
                  <ThemedText type="smallBold" style={{ color: accent }}>
                    {task.questionIds.length}문제
                  </ThemedText>
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
              {
                backgroundColor: emphasizeStart
                  ? theme.primary
                  : theme.primarySoft,
              },
              pressed && styles.primaryPressed,
            ]}
          >
            <SymbolView
              tintColor={emphasizeStart ? theme.onPrimary : theme.primary}
              name={{
                ios: "play.fill",
                android: "play_arrow",
                web: "play_arrow",
              }}
              size={18}
            />
            <ThemedText
              type="smallBold"
              style={{
                color: emphasizeStart ? theme.onPrimary : theme.primary,
              }}
            >
              맞춤 플랜 {plan.totalCount}문제 시작
            </ThemedText>
          </Pressable>
        </>
      )}
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
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  goalCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.one,
  },
  goalValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.one,
  },
  goalValue: {
    fontSize: 30,
    lineHeight: 38,
    fontWeight: 800,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: Radius.pill,
  },
  separator: {
    height: 1,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  taskList: {
    gap: Spacing.two,
  },
  taskRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.twoHalf,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.medium,
  },
  taskDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
  taskCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  startButton: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderRadius: Radius.medium,
  },
  stateRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
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
