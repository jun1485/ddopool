import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { AnimatedProgressBar } from "@/components/motion/animated-progress-bar";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { ExamPace } from "@/learning/exam-pace";
import type { Exam } from "@/types/exam";

interface ExamPaceCardProps {
  pace: ExamPace | null;
  exam: Exam | null;
  targetScore?: number;
  isLoading: boolean;
  onPress: () => void;
}

// 학습 페이스 상태 라벨 생성
function getPaceStatusLabel(status: ExamPace["status"]): string {
  if (status === "ahead") return "계획보다 빠름";
  if (status === "behind") return "페이스 조절 필요";
  if (status === "complete") return "문제은행 완료";
  if (status === "expired") return "목표일 재설정";
  return "계획대로 진행 중";
}

// 시험일 학습 페이스 카드
export function ExamPaceCard({
  pace,
  exam,
  targetScore,
  isLoading,
  onPress,
}: ExamPaceCardProps) {
  const theme = useTheme();

  if (isLoading)
    return (
      <ThemedView type="backgroundElement" style={styles.emptyCard}>
        <View
          style={[
            styles.emptyIcon,
            { backgroundColor: theme.backgroundSelected },
          ]}
        >
          <SymbolView
            tintColor={theme.textSecondary}
            name={{
              ios: "calendar",
              android: "calendar_month",
              web: "calendar_month",
            }}
            size={22}
          />
        </View>
        <View style={styles.emptyCopy}>
          <ThemedText type="smallBold">시험일 페이스 계산 중</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            저장한 목표와 현재 진도를 불러오고 있어요
          </ThemedText>
        </View>
      </ThemedView>
    );

  if (pace == null || exam == null)
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="시험일 학습 계획 설정"
        onPress={onPress}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <ThemedView type="backgroundElement" style={styles.emptyCard}>
          <View
            style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}
          >
            <SymbolView
              tintColor={theme.primary}
              name={{
                ios: "calendar.badge.plus",
                android: "event_available",
                web: "event_available",
              }}
              size={22}
            />
          </View>
          <View style={styles.emptyCopy}>
            <ThemedText type="smallBold">시험일을 정해 보세요</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              남은 문제와 학습 가능일로 하루 권장량을 계산해요
            </ThemedText>
          </View>
          <SymbolView
            tintColor={theme.primary}
            name={{
              ios: "chevron.right",
              android: "chevron_right",
              web: "chevron_right",
            }}
            size={20}
          />
        </ThemedView>
      </Pressable>
    );

  const needsAttention = pace.status === "behind" || pace.status === "expired";
  const statusColor = needsAttention
    ? theme.warning
    : pace.status === "complete" || pace.status === "ahead"
      ? theme.success
      : theme.primary;
  const statusBackground = needsAttention
    ? theme.warningSoft
    : pace.status === "complete" || pace.status === "ahead"
      ? theme.successSoft
      : theme.primarySoft;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${exam.shortTitle} 시험일 학습 계획 수정`}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}
    >
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.header}>
          <View
            style={[styles.examIcon, { backgroundColor: theme.primarySoft }]}
          >
            <ThemedText style={styles.examEmoji}>{exam.icon}</ThemedText>
          </View>
          <View style={styles.headerCopy}>
            <View style={styles.titleRow}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {exam.shortTitle}
              </ThemedText>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: statusBackground },
                ]}
              >
                <ThemedText type="smallBold" style={{ color: statusColor }}>
                  {getPaceStatusLabel(pace.status)}
                </ThemedText>
              </View>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {pace.daysRemaining === 0
                ? `오늘이 목표 시험일이에요${targetScore == null ? "" : ` · 목표 ${targetScore}점`}`
                : `시험까지 D-${pace.daysRemaining}${targetScore == null ? "" : ` · 목표 ${targetScore}점`}`}
            </ThemedText>
          </View>
          <SymbolView
            tintColor={theme.textSecondary}
            name={{
              ios: "slider.horizontal.3",
              android: "tune",
              web: "tune",
            }}
            size={19}
          />
        </View>

        <View style={styles.paceRow}>
          <View>
            <ThemedText type="small" themeColor="textSecondary">
              오늘 권장 학습량
            </ThemedText>
            <ThemedText style={styles.dailyTarget}>
              {pace.dailyQuestionTarget}
              <ThemedText type="smallBold"> 문제</ThemedText>
            </ThemedText>
          </View>
          <View style={styles.remainingCopy}>
            <ThemedText type="small" themeColor="textSecondary">
              남은 문제
            </ThemedText>
            <ThemedText type="smallBold">
              {pace.remainingQuestions}개
            </ThemedText>
          </View>
        </View>

        <AnimatedProgressBar
          progress={pace.progress}
          height={8}
          color={statusColor}
          trackColor={theme.backgroundSelected}
        />
        <View style={styles.progressMeta}>
          <ThemedText type="small" themeColor="textSecondary">
            문제은행 진도
          </ThemedText>
          <ThemedText type="smallBold" style={{ color: statusColor }}>
            {Math.round(pace.progress * 100)}%
          </ThemedText>
        </View>
      </ThemedView>
    </Pressable>
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
    alignItems: "center",
    gap: Spacing.three,
  },
  examIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  examEmoji: {
    fontSize: 22,
    lineHeight: 29,
  },
  headerCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  paceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  dailyTarget: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: 900,
  },
  remainingCopy: {
    alignItems: "flex-end",
    gap: Spacing.half,
  },
  progressMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  emptyCard: {
    minHeight: 92,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  emptyCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.99 }],
  },
});
