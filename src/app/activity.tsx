import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { LearningSessionTimeline } from "@/components/learning-session-timeline";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { RevealView } from "@/components/motion/reveal-view";
import { SkeletonBlock } from "@/components/motion/skeleton-block";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { stagger } from "@/constants/motion";
import { MaxContentWidth, Radius, Shadows, Spacing } from "@/constants/theme";
import { useActivityCalendar } from "@/hooks/use-activity-calendar";
import { useDailyStats } from "@/hooks/use-daily-stats";
import { useExamCatalog } from "@/hooks/use-exam-catalog";
import { useLearningSessionHistory } from "@/hooks/use-learning-session-history";
import { useTheme } from "@/hooks/use-theme";
import type { LearningSessionResult } from "@/storage/learning-session-history-store";

const WEEKDAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

// 선택 날짜 표시 문구 생성
function formatActivityDate(dateKey: string): string {
  const date = new Date(`${dateKey}T00:00:00`);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// 완료 세션 동일 문제 범위 재학습
function repeatLearningSession(result: LearningSessionResult) {
  router.push({
    pathname: "/quiz/[examId]",
    params: {
      examId: result.examIds.length === 1 ? result.examIds[0] : "all",
      mode: result.mode === "mock" ? "mock" : "learn",
      questionIds: result.questionIds.join(","),
    },
  });
}

// 월간 학습 활동 화면
export default function ActivityScreen() {
  const { activityMonth, isLoading, canGoNext, goPreviousMonth, goNextMonth } =
    useActivityCalendar();
  const { streak } = useDailyStats();
  const { exams } = useExamCatalog();
  const {
    results: learningSessionResults,
    isLoading: isLearningSessionHistoryLoading,
  } = useLearningSessionHistory();
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const theme = useTheme();
  const selectedDay =
    activityMonth?.days.find(
      (day) => day.inMonth && day.dateKey === selectedDateKey,
    ) ??
    activityMonth?.days.find((day) => day.inMonth && day.isToday) ??
    activityMonth?.days.find((day) => day.inMonth && day.answered > 0) ??
    activityMonth?.days.find((day) => day.inMonth);
  const monthAccuracy =
    activityMonth == null || activityMonth.totalAnswered === 0
      ? 0
      : Math.round(
          (activityMonth.totalCorrect / activityMonth.totalAnswered) * 100,
        );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이전 화면"
            onPress={() => goBack()}
            hitSlop={Spacing.two}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              tintColor={theme.text}
              name={{
                ios: "chevron.left",
                android: "arrow_back",
                web: "arrow_back",
              }}
              size={22}
            />
          </Pressable>
          <View style={styles.topTitle}>
            <ThemedText type="smallBold">학습 캘린더</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              날짜별 학습 기록
            </ThemedText>
          </View>
          <View style={styles.iconButton} />
        </View>

        <Animated.ScrollView
          entering={FadeInDown.duration(320)}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={[styles.hero, { backgroundColor: theme.primary }]}>
            <View
              style={[styles.heroOrb, { backgroundColor: theme.onPrimary }]}
            />
            <View style={styles.heroHeader}>
              <View>
                <ThemedText type="smallBold" style={styles.onPrimaryMuted}>
                  현재 학습 스트릭
                </ThemedText>
                <ThemedText style={styles.streakTitle}>
                  🔥 {streak}일
                </ThemedText>
              </View>
              <View style={styles.heroBadge}>
                <SymbolView
                  tintColor={theme.onPrimary}
                  name={{
                    ios: "calendar",
                    android: "calendar_month",
                    web: "calendar_month",
                  }}
                  size={25}
                />
              </View>
            </View>
            <ThemedText type="small" style={styles.onPrimaryMuted}>
              하루 한 문제도 기록에 남아요. 진한 날짜일수록 더 많이 학습한
              날이에요.
            </ThemedText>
          </View>

          {isLoading || activityMonth == null ? (
            <View style={styles.loadingGroup}>
              <SkeletonBlock height={286} radius={Radius.large} />
              <SkeletonBlock height={104} radius={Radius.medium} />
            </View>
          ) : (
            <>
              <ThemedView type="backgroundElement" style={styles.calendarCard}>
                <View style={styles.monthHeader}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="이전 달"
                    onPress={goPreviousMonth}
                    hitSlop={Spacing.two}
                    style={({ pressed }) => [
                      styles.monthButton,
                      pressed && styles.pressed,
                    ]}
                  >
                    <SymbolView
                      tintColor={theme.text}
                      name={{
                        ios: "chevron.left",
                        android: "chevron_left",
                        web: "chevron_left",
                      }}
                      size={20}
                    />
                  </Pressable>
                  <ThemedText type="smallBold">
                    {activityMonth.label}
                  </ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="다음 달"
                    accessibilityState={{ disabled: !canGoNext }}
                    disabled={!canGoNext}
                    onPress={goNextMonth}
                    hitSlop={Spacing.two}
                    style={({ pressed }) => [
                      styles.monthButton,
                      !canGoNext && styles.disabled,
                      pressed && styles.pressed,
                    ]}
                  >
                    <SymbolView
                      tintColor={canGoNext ? theme.text : theme.textSecondary}
                      name={{
                        ios: "chevron.right",
                        android: "chevron_right",
                        web: "chevron_right",
                      }}
                      size={20}
                    />
                  </Pressable>
                </View>

                <View style={styles.weekRow}>
                  {WEEKDAY_LABELS.map((label, index) => (
                    <ThemedText
                      key={label}
                      type="small"
                      themeColor="textSecondary"
                      style={[
                        styles.weekLabel,
                        index === 0 && { color: theme.danger },
                      ]}
                    >
                      {label}
                    </ThemedText>
                  ))}
                </View>

                <View style={styles.calendarGrid}>
                  {Array.from({ length: 6 }, (_, weekIndex) => (
                    <RevealView
                      key={weekIndex}
                      delay={stagger(weekIndex, 45)}
                      duration={240}
                      style={styles.weekRow}
                    >
                      {activityMonth.days
                        .slice(weekIndex * 7, weekIndex * 7 + 7)
                        .map((day) => {
                          const selected = day.dateKey === selectedDay?.dateKey;
                          const highActivity =
                            day.inMonth &&
                            day.answered >=
                              Math.max(activityMonth.bestAnswered * 0.6, 2);
                          const hasActivity = day.inMonth && day.answered > 0;
                          const backgroundColor = highActivity
                            ? theme.primary
                            : hasActivity
                              ? theme.primarySoft
                              : theme.background;
                          const textColor = highActivity
                            ? theme.onPrimary
                            : day.inMonth
                              ? theme.text
                              : theme.textSecondary;
                          return (
                            <Pressable
                              key={day.dateKey}
                              accessibilityRole="button"
                              accessibilityLabel={`${formatActivityDate(
                                day.dateKey,
                              )}, ${day.answered}문제 학습`}
                              accessibilityState={{ selected }}
                              onPress={() => setSelectedDateKey(day.dateKey)}
                              style={({ pressed }) => [
                                styles.dayCell,
                                {
                                  backgroundColor,
                                  borderColor: selected
                                    ? theme.warning
                                    : "transparent",
                                  opacity: day.inMonth ? 1 : 0.28,
                                },
                                pressed && styles.dayPressed,
                              ]}
                            >
                              <ThemedText
                                type="small"
                                style={[styles.dayNumber, { color: textColor }]}
                              >
                                {day.day}
                              </ThemedText>
                              {day.isToday && (
                                <View
                                  style={[
                                    styles.todayDot,
                                    {
                                      backgroundColor: highActivity
                                        ? theme.onPrimary
                                        : theme.primary,
                                    },
                                  ]}
                                />
                              )}
                            </Pressable>
                          );
                        })}
                    </RevealView>
                  ))}
                </View>

                <View style={styles.legend}>
                  <ThemedText type="small" themeColor="textSecondary">
                    적게
                  </ThemedText>
                  <View
                    style={[
                      styles.legendCell,
                      { backgroundColor: theme.background },
                    ]}
                  />
                  <View
                    style={[
                      styles.legendCell,
                      { backgroundColor: theme.primarySoft },
                    ]}
                  />
                  <View
                    style={[
                      styles.legendCell,
                      { backgroundColor: theme.primary },
                    ]}
                  />
                  <ThemedText type="small" themeColor="textSecondary">
                    많이
                  </ThemedText>
                </View>
              </ThemedView>

              <View style={styles.summaryRow}>
                <ThemedView type="backgroundElement" style={styles.summaryCard}>
                  <ThemedText style={styles.summaryValue}>
                    {activityMonth.activeDays}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    학습한 날
                  </ThemedText>
                </ThemedView>
                <ThemedView type="backgroundElement" style={styles.summaryCard}>
                  <ThemedText style={styles.summaryValue}>
                    {activityMonth.totalAnswered}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    풀이 문제
                  </ThemedText>
                </ThemedView>
                <ThemedView type="backgroundElement" style={styles.summaryCard}>
                  <ThemedText style={styles.summaryValue}>
                    {monthAccuracy}%
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    월 정답률
                  </ThemedText>
                </ThemedView>
              </View>

              {selectedDay != null && (
                <ThemedView
                  type="backgroundElement"
                  style={[
                    styles.dayDetail,
                    {
                      borderColor:
                        selectedDay.answered > 0 ? theme.primary : theme.border,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.detailIcon,
                      {
                        backgroundColor:
                          selectedDay.answered > 0
                            ? theme.primarySoft
                            : theme.backgroundSelected,
                      },
                    ]}
                  >
                    <ThemedText style={styles.detailEmoji}>
                      {selectedDay.answered > 0 ? "📚" : "🌱"}
                    </ThemedText>
                  </View>
                  <View style={styles.detailCopy}>
                    <ThemedText type="smallBold">
                      {formatActivityDate(selectedDay.dateKey)}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {selectedDay.answered > 0
                        ? `${selectedDay.answered}문제 중 ${selectedDay.correct}문제 정답`
                        : "학습 기록이 없는 날이에요"}
                    </ThemedText>
                  </View>
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    {selectedDay.answered > 0
                      ? `${Math.round(
                          (selectedDay.correct / selectedDay.answered) * 100,
                        )}%`
                      : "–"}
                  </ThemedText>
                </ThemedView>
              )}
            </>
          )}

          <LearningSessionTimeline
            results={learningSessionResults}
            exams={exams}
            isLoading={isLearningSessionHistoryLoading}
            onRepeat={repeatLearningSession}
          />
        </Animated.ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    minWidth: 0,
  },
  safeArea: {
    flex: 1,
    width: "100%",
    minWidth: 0,
    maxWidth: MaxContentWidth,
  },
  topBar: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === "web" ? Spacing.four : Spacing.two,
    paddingBottom: Spacing.three,
  },
  topTitle: {
    flex: 1,
    gap: Spacing.half,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  content: {
    minWidth: 0,
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  hero: {
    position: "relative",
    overflow: "hidden",
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  heroOrb: {
    position: "absolute",
    width: 160,
    height: 160,
    right: -48,
    top: -84,
    opacity: 0.09,
    borderRadius: 80,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  streakTitle: {
    color: "#FFFFFF",
    fontSize: 29,
    lineHeight: 38,
    fontWeight: 900,
  },
  heroBadge: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  onPrimaryMuted: {
    color: "rgba(255, 255, 255, 0.76)",
  },
  loadingGroup: {
    gap: Spacing.three,
  },
  calendarCard: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  monthHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  calendarGrid: {
    gap: Spacing.one,
  },
  weekRow: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  weekLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    lineHeight: 16,
  },
  dayCell: {
    minWidth: 0,
    flex: 1,
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: Radius.small,
  },
  dayNumber: {
    fontSize: 11,
    lineHeight: 16,
  },
  todayDot: {
    position: "absolute",
    bottom: Spacing.half,
    width: 4,
    height: 4,
    borderRadius: Radius.pill,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: Spacing.one,
  },
  legendCell: {
    width: 14,
    height: 14,
    borderRadius: Spacing.one,
  },
  summaryRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  summaryCard: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.half,
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  summaryValue: {
    fontSize: 19,
    lineHeight: 27,
    fontWeight: 900,
  },
  dayDetail: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  detailIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  detailEmoji: {
    fontSize: 22,
    lineHeight: 29,
  },
  detailCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  disabled: {
    opacity: 0.35,
  },
  pressed: {
    opacity: 0.7,
  },
  dayPressed: {
    opacity: 0.72,
    transform: [{ scale: 0.94 }],
  },
});
