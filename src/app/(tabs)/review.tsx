import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  BottomTabInset,
  MaxContentWidth,
  Radius,
  Shadows,
  Spacing,
} from "@/constants/theme";
import { useExamCatalog } from "@/hooks/use-exam-catalog";
import { useSrsSummary } from "@/hooks/use-srs-summary";
import { useTheme } from "@/hooks/use-theme";
import { Exam } from "@/types/exam";

// 복습 세션 진입
function startReviewSession(exam: Exam) {
  router.push({
    pathname: "/quiz/[examId]",
    params: { examId: exam.id, mode: "review" },
  });
}

// 전체 시험 복습 세션 진입
function startAllReviewSession() {
  router.push({
    pathname: "/quiz/[examId]",
    params: { examId: "all", mode: "review" },
  });
}

// SRS 복습 큐 화면
export default function ReviewScreen() {
  const {
    dueCounts,
    studiedCounts,
    totalDue,
    totalStudied,
    upcomingCount,
    scheduledCount,
    isLoading,
  } = useSrsSummary();
  const { exams } = useExamCatalog();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.header}>
            <ThemedText type="subtitle">스마트 복습</ThemedText>
            <ThemedText themeColor="textSecondary">
              잊을 때쯤 다시 만나 오래 기억하도록 도와드려요.
            </ThemedText>
          </View>

          <Animated.View entering={FadeInDown.duration(350)}>
            <View style={[styles.heroCard, { backgroundColor: theme.primary }]}>
              <View
                style={[styles.heroOrb, { backgroundColor: theme.onPrimary }]}
              />
              <View style={styles.heroTop}>
                <View style={styles.heroCopy}>
                  <ThemedText type="smallBold" style={styles.onPrimaryMuted}>
                    지금 복습할 문제
                  </ThemedText>
                  <ThemedText style={styles.heroCount}>{totalDue}</ThemedText>
                  <ThemedText type="small" style={styles.onPrimaryMuted}>
                    {totalDue > 0
                      ? "짧게 복습하고 기억을 단단하게 만들어요"
                      : "오늘 예정된 복습을 모두 마쳤어요"}
                  </ThemedText>
                </View>
                <View style={styles.heroIcon}>
                  <SymbolView
                    tintColor={theme.onPrimary}
                    name={{
                      ios: "brain.head.profile",
                      android: "psychology",
                      web: "psychology",
                    }}
                    size={36}
                  />
                </View>
              </View>

              {totalDue > 0 && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${totalDue}문제 전체 복습 시작`}
                  onPress={startAllReviewSession}
                  style={({ pressed }) => [
                    styles.reviewAllButton,
                    pressed && styles.heroPressed,
                  ]}
                >
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    전체 복습 시작
                  </ThemedText>
                  <SymbolView
                    tintColor={theme.primary}
                    name={{
                      ios: "arrow.right",
                      android: "arrow_forward",
                      web: "arrow_forward",
                    }}
                    size={18}
                  />
                </Pressable>
              )}
            </View>
          </Animated.View>

          <View style={styles.scheduleGrid}>
            <ThemedView type="backgroundElement" style={styles.scheduleCard}>
              <View
                style={[styles.scheduleDot, { backgroundColor: theme.danger }]}
              />
              <ThemedText style={styles.scheduleValue}>{totalDue}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                지금
              </ThemedText>
            </ThemedView>
            <ThemedView type="backgroundElement" style={styles.scheduleCard}>
              <View
                style={[styles.scheduleDot, { backgroundColor: theme.warning }]}
              />
              <ThemedText style={styles.scheduleValue}>
                {upcomingCount}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                24시간 내
              </ThemedText>
            </ThemedView>
            <ThemedView type="backgroundElement" style={styles.scheduleCard}>
              <View
                style={[styles.scheduleDot, { backgroundColor: theme.success }]}
              />
              <ThemedText style={styles.scheduleValue}>
                {scheduledCount}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                이후 예정
              </ThemedText>
            </ThemedView>
          </View>

          {!isLoading && totalStudied === 0 && (
            <ThemedView type="backgroundElement" style={styles.guideCard}>
              <View
                style={[
                  styles.guideIcon,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <SymbolView
                  tintColor={theme.primary}
                  name={{
                    ios: "sparkles",
                    android: "auto_awesome",
                    web: "auto_awesome",
                  }}
                  size={22}
                />
              </View>
              <View style={styles.guideText}>
                <ThemedText type="smallBold">
                  첫 학습을 시작해 보세요
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  문제를 풀면 정답 여부에 따라 복습 일정이 자동으로 만들어져요.
                </ThemedText>
              </View>
            </ThemedView>
          )}

          <View style={styles.section}>
            <View>
              <ThemedText style={styles.sectionTitle}>시험별 복습</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                학습한 {totalStudied}문제를 기억 주기에 맞춰 관리 중
              </ThemedText>
            </View>

            <View style={styles.examList}>
              {exams.map((exam, listIndex) => {
                const dueCount = dueCounts[exam.id] ?? 0;
                const studiedCount = studiedCounts[exam.id] ?? 0;
                const hasDue = dueCount > 0;
                const accent = [theme.primary, theme.success, theme.warning][
                  listIndex % 3
                ];
                const softAccent = [
                  theme.primarySoft,
                  theme.successSoft,
                  theme.warningSoft,
                ][listIndex % 3];

                return (
                  <Animated.View
                    key={exam.id}
                    entering={FadeInDown.delay(70 * listIndex).duration(300)}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityState={{ disabled: !hasDue }}
                      accessibilityLabel={
                        hasDue
                          ? `${exam.shortTitle} ${dueCount}문제 복습 시작`
                          : `${exam.shortTitle} 복습할 문제 없음`
                      }
                      disabled={!hasDue}
                      onPress={() => startReviewSession(exam)}
                      style={({ pressed }) => pressed && styles.pressed}
                    >
                      <ThemedView
                        type="backgroundElement"
                        style={[
                          styles.examCard,
                          !hasDue && styles.examCardDisabled,
                        ]}
                      >
                        <View
                          style={[
                            styles.examIcon,
                            { backgroundColor: softAccent },
                          ]}
                        >
                          <ThemedText style={styles.examIconText}>
                            {exam.icon}
                          </ThemedText>
                        </View>
                        <View style={styles.examTexts}>
                          <ThemedText type="smallBold">
                            {exam.shortTitle}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {studiedCount > 0
                              ? `${studiedCount}문제 학습 완료`
                              : "아직 학습 전"}
                          </ThemedText>
                        </View>
                        <View
                          style={[
                            styles.examStatus,
                            {
                              backgroundColor: hasDue
                                ? softAccent
                                : theme.backgroundSelected,
                            },
                          ]}
                        >
                          <ThemedText
                            type="smallBold"
                            style={{
                              color: hasDue ? accent : theme.textSecondary,
                            }}
                          >
                            {hasDue ? `${dueCount}문제` : "완료"}
                          </ThemedText>
                          {hasDue && (
                            <SymbolView
                              tintColor={accent}
                              name={{
                                ios: "chevron.right",
                                android: "chevron_right",
                                web: "chevron_right",
                              }}
                              size={15}
                            />
                          )}
                        </View>
                      </ThemedView>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          </View>
        </ScrollView>
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
  content: {
    minWidth: 0,
    paddingHorizontal: Spacing.four,
    paddingTop:
      Platform.OS === "web" ? Spacing.six + Spacing.four : Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.two,
  },
  heroCard: {
    position: "relative",
    overflow: "hidden",
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  heroOrb: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    opacity: 0.08,
    right: -54,
    top: -96,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  heroCount: {
    color: "#FFFFFF",
    fontSize: 48,
    lineHeight: 54,
    fontWeight: 800,
  },
  heroIcon: {
    width: 64,
    height: 64,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.large,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  onPrimaryMuted: {
    color: "rgba(255, 255, 255, 0.78)",
  },
  reviewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.twoHalf,
    borderRadius: Radius.medium,
    backgroundColor: "#FFFFFF",
  },
  heroPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  scheduleGrid: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  scheduleCard: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.half,
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  scheduleDot: {
    width: 7,
    height: 7,
    marginBottom: Spacing.half,
    borderRadius: Radius.pill,
  },
  scheduleValue: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: 800,
  },
  guideCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: "rgba(127, 127, 127, 0.12)",
  },
  guideIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  guideText: {
    flex: 1,
    gap: Spacing.half,
  },
  section: {
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: 800,
  },
  examList: {
    gap: Spacing.three,
  },
  examCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  examCardDisabled: {
    opacity: 0.62,
  },
  examIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  examIconText: {
    fontSize: 23,
    lineHeight: 29,
  },
  examTexts: {
    flex: 1,
    gap: Spacing.half,
  },
  examStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.half,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
});
