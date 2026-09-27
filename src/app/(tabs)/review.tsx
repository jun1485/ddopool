import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { PulseView } from "@/components/motion/pulse-view";
import { RevealView } from "@/components/motion/reveal-view";
import { PageHead } from "@/components/page-head";
import { ReviewForecastCard } from "@/components/review-forecast-card";
import { SectionHeader } from "@/components/section-header";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { WrongAnswerSummaryCard } from "@/components/wrong-answer-summary-card";
import { stagger } from "@/constants/motion";
import {
  accentByIndex,
  BottomTabInset,
  MaxContentWidth,
  Radius,
  Shadows,
  Spacing,
} from "@/constants/theme";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useExamCatalog } from "@/hooks/use-exam-catalog";
import { useSettings } from "@/hooks/use-settings";
import { useSrsSummary } from "@/hooks/use-srs-summary";
import { useTheme } from "@/hooks/use-theme";
import { useWrongAnswerNotes } from "@/hooks/use-wrong-answer-notes";
import { createReviewForecast } from "@/learning/review-forecast";
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

// 선택 날짜 복습 예정 문항 학습 진입
function startForecastSession(questionIds: string[], sessionSize: number) {
  router.push({
    pathname: "/quiz/[examId]",
    params: {
      examId: "all",
      questionIds: questionIds.slice(0, sessionSize).join(","),
    },
  });
}

// 복습 보관함 필터 화면 진입
function openReviewLibrary(filter: "wrong" | "bookmarked") {
  router.push({
    pathname: "/review-library",
    params: { filter },
  });
}

// 복습 일정·다시 볼 문제 화면
export default function ReviewScreen() {
  const {
    cards,
    dueCounts,
    studiedCounts,
    totalDue,
    totalStudied,
    upcomingCount,
    scheduledCount,
    evaluatedAt,
    isLoading,
  } = useSrsSummary();
  const { exams, questions } = useExamCatalog();
  const { settings } = useSettings();
  const { bookmarkedQuestionIds } = useBookmarks();
  const { unresolvedNotes, resolvedNotes } = useWrongAnswerNotes();
  const theme = useTheme();
  const forecast = useMemo(
    () => createReviewForecast(cards, evaluatedAt),
    [cards, evaluatedAt],
  );
  const examLabels = useMemo(
    () =>
      Object.fromEntries(
        exams.map((exam) => [exam.id, exam.shortTitle] as const),
      ),
    [exams],
  );
  const studiedExams = exams.filter(
    (exam) => (studiedCounts[exam.id] ?? 0) > 0,
  );
  const availableUnresolvedNotes = unresolvedNotes.filter((note) =>
    questions.some((question) => question.id === note.questionId),
  );
  const hasBookmarks = bookmarkedQuestionIds.length > 0;

  return (
    <ThemedView style={styles.container}>
      <PageHead
        title="복습"
        description="틀린 문제를 간격 반복 일정에 맞춰 다시 푸는 복습 화면."
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.header}>
            <ThemedText type="subtitle">복습</ThemedText>
            <ThemedText themeColor="textSecondary">
              잊을 때쯤 다시 만나 오래 기억하도록 도와드려요.
            </ThemedText>
          </View>

          <RevealView variant="zoom" duration={400}>
            <View style={[styles.heroCard, { backgroundColor: theme.primary }]}>
              <View style={styles.heroTop}>
                <View style={styles.heroCopy}>
                  <ThemedText themeColor="onPrimaryMuted" type="smallBold">
                    지금 복습할 문제
                  </ThemedText>
                  <AnimatedCounter
                    themeColor="onPrimary"
                    style={styles.heroCount}
                    value={totalDue}
                  />
                  <ThemedText themeColor="onPrimaryMuted" type="small">
                    24시간 내 {upcomingCount} · 이후 예정 {scheduledCount}
                  </ThemedText>
                </View>
                <PulseView active={totalDue > 0} scaleTo={1.07}>
                  <View
                    style={[
                      styles.heroIcon,
                      { backgroundColor: theme.onPrimarySurface },
                    ]}
                  >
                    <SymbolView
                      tintColor={theme.onPrimary}
                      name={{
                        ios: "brain.head.profile",
                        android: "psychology",
                        web: "psychology",
                      }}
                      size={32}
                    />
                  </View>
                </PulseView>
              </View>

              {totalDue > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${totalDue}문제 전체 복습 시작`}
                  onPress={startAllReviewSession}
                  style={({ pressed }) => [
                    styles.reviewAllButton,
                    { backgroundColor: theme.onPrimary },
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
              ) : (
                <ThemedText themeColor="onPrimaryMuted" type="small">
                  {totalStudied > 0
                    ? "오늘 예정된 복습을 모두 마쳤어요"
                    : "문제를 풀면 복습 일정이 자동으로 만들어져요"}
                </ThemedText>
              )}
            </View>
          </RevealView>

          {!isLoading && totalStudied > 0 && (
            <ReviewForecastCard
              forecast={forecast}
              examLabels={examLabels}
              sessionSize={settings.sessionSize}
              onStart={(questionIds) =>
                startForecastSession(questionIds, settings.sessionSize)
              }
            />
          )}

          <View style={styles.section}>
            <SectionHeader
              title="다시 볼 문제"
              subtitle="틀린 문제와 저장한 문제를 골라서 풀어요"
            />
            <WrongAnswerSummaryCard
              unresolvedNotes={availableUnresolvedNotes}
              resolvedCount={resolvedNotes.length}
              onOpen={() => openReviewLibrary("wrong")}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                hasBookmarks
                  ? `저장한 문제 ${bookmarkedQuestionIds.length}개 보기`
                  : "저장한 문제 없음"
              }
              aria-disabled={!hasBookmarks}
              disabled={!hasBookmarks}
              onPress={() => openReviewLibrary("bookmarked")}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedView
                type="backgroundElement"
                style={[styles.rowCard, !hasBookmarks && styles.dimmed]}
              >
                <View
                  style={[
                    styles.rowIcon,
                    { backgroundColor: theme.warningSoft },
                  ]}
                >
                  <SymbolView
                    tintColor={theme.warning}
                    name={{
                      ios: "bookmark.fill",
                      android: "bookmark",
                      web: "bookmark",
                    }}
                    size={20}
                  />
                </View>
                <View style={styles.rowCopy}>
                  <ThemedText type="smallBold">저장한 문제</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {hasBookmarks
                      ? `${bookmarkedQuestionIds.length}문제를 골라서 다시 풀 수 있어요`
                      : "풀이 중 북마크를 누르면 여기에 모여요"}
                  </ThemedText>
                </View>
                {hasBookmarks && (
                  <SymbolView
                    tintColor={theme.textSecondary}
                    name={{
                      ios: "chevron.right",
                      android: "chevron_right",
                      web: "chevron_right",
                    }}
                    size={18}
                  />
                )}
              </ThemedView>
            </Pressable>
          </View>

          {studiedExams.length > 0 && (
            <View style={styles.section}>
              <SectionHeader
                title="시험별 복습"
                subtitle={`학습한 ${totalStudied}문제를 기억 주기에 맞춰 관리 중`}
              />
              <ThemedView type="backgroundElement" style={styles.listCard}>
                {studiedExams.map((exam, listIndex) => {
                  const dueCount = dueCounts[exam.id] ?? 0;
                  const hasDue = dueCount > 0;
                  const { accent, soft } = accentByIndex(theme, listIndex);

                  return (
                    <RevealView key={exam.id} delay={stagger(listIndex, 60)}>
                      {listIndex > 0 && (
                        <View
                          style={[
                            styles.rowDivider,
                            { backgroundColor: theme.border },
                          ]}
                        />
                      )}
                      <Pressable
                        accessibilityRole="button"
                        aria-disabled={!hasDue}
                        accessibilityLabel={
                          hasDue
                            ? `${exam.shortTitle} ${dueCount}문제 복습 시작`
                            : `${exam.shortTitle} 복습할 문제 없음`
                        }
                        disabled={!hasDue}
                        onPress={() => startReviewSession(exam)}
                        style={({ pressed }) => [
                          styles.examRow,
                          pressed && styles.pressed,
                        ]}
                      >
                        <View
                          style={[styles.examIcon, { backgroundColor: soft }]}
                        >
                          <ThemedText style={styles.examIconText}>
                            {exam.icon}
                          </ThemedText>
                        </View>
                        <View style={styles.rowCopy}>
                          <ThemedText type="smallBold">
                            {exam.shortTitle}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {studiedCounts[exam.id] ?? 0}문제 학습
                          </ThemedText>
                        </View>
                        <View
                          style={[
                            styles.examStatus,
                            {
                              backgroundColor: hasDue
                                ? soft
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
                            {hasDue ? `복습 ${dueCount}` : "오늘 완료"}
                          </ThemedText>
                        </View>
                      </Pressable>
                    </RevealView>
                  );
                })}
              </ThemedView>
            </View>
          )}
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
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
    gap: Spacing.four,
  },
  header: {
    gap: Spacing.two,
  },
  heroCard: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
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
    fontSize: 44,
    lineHeight: 52,
    fontWeight: 800,
  },
  heroIcon: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.large,
  },
  reviewAllButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderRadius: Radius.medium,
  },
  heroPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  section: {
    gap: Spacing.three,
  },
  rowCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  rowIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  rowCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  dimmed: {
    opacity: 0.66,
  },
  listCard: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  rowDivider: {
    height: 1,
  },
  examRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.twoHalf,
  },
  examIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  examIconText: {
    fontSize: 20,
    lineHeight: 27,
  },
  examStatus: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  pressed: {
    opacity: 0.72,
  },
});
