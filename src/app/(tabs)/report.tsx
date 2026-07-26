import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedCounter } from "@/components/motion/animated-counter";
import { AnimatedProgressBar } from "@/components/motion/animated-progress-bar";
import { PulseView } from "@/components/motion/pulse-view";
import { RevealView } from "@/components/motion/reveal-view";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ExamReadinessCard } from "@/components/exam-readiness-card";
import type { ExamReadinessItem } from "@/components/exam-readiness-card";
import { MockExamTrendCard } from "@/components/mock-exam-trend-card";
import { StudyTimeInsightsCard } from "@/components/study-time-insights-card";
import { WrongAnswerSummaryCard } from "@/components/wrong-answer-summary-card";
import {
  Alpha,
  BottomTabInset,
  MaxContentWidth,
  Radius,
  Shadows,
  Spacing,
} from "@/constants/theme";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useDailyStats } from "@/hooks/use-daily-stats";
import { useExamCatalog } from "@/hooks/use-exam-catalog";
import { useExamEnrollment } from "@/hooks/use-exam-enrollment";
import { useLearningReport } from "@/hooks/use-learning-report";
import { useLearningSessionHistory } from "@/hooks/use-learning-session-history";
import { useMockExamHistory } from "@/hooks/use-mock-exam-history";
import { useSrsSummary } from "@/hooks/use-srs-summary";
import { useStudyTarget } from "@/hooks/use-study-target";
import { useTheme } from "@/hooks/use-theme";
import { useWrongAnswerNotes } from "@/hooks/use-wrong-answer-notes";
import { calculateExamReadiness } from "@/learning/exam-readiness";
import { AccuracyStat } from "@/storage/stats-store";

// 정답률 백분율 계산
function getAccuracy(stat: AccuracyStat): number {
  return stat.answered === 0
    ? 0
    : Math.round((stat.correct / stat.answered) * 100);
}

// 복습 보관함 필터 화면 진입
function openReviewLibrary(filter: "wrong" | "bookmarked") {
  router.push({
    pathname: "./review-library",
    params: { filter },
  });
}

// 취약 과목 맞춤 세션 진입
function startFocusedSubjectSession(questionIds: string[]) {
  router.push({
    pathname: "/quiz/[examId]",
    params: { examId: "all", questionIds: questionIds.join(",") },
  });
}

// 시험별 일반·복습 세션 진입
function startExamSession(examId: string, review = false) {
  router.push({
    pathname: "/quiz/[examId]",
    params: { examId, mode: review ? "review" : "learn" },
  });
}

// 시험별 모의고사 세션 진입
function startMockExamSession(examId: string) {
  router.push({
    pathname: "/quiz/[examId]",
    params: { examId, mode: "mock" },
  });
}

// 전체 학습 활동 화면 진입
function openLearningActivity() {
  router.push("./activity");
}

// 누적 학습 리포트 화면
export default function ReportScreen() {
  const { lifetime, performance } = useLearningReport();
  const { weeklyActivity, streak } = useDailyStats();
  const { totalStudied, totalDue, studiedCounts, matureCounts, dueCounts } =
    useSrsSummary();
  const { bookmarkedQuestionIds } = useBookmarks();
  const { unresolvedNotes, resolvedNotes } = useWrongAnswerNotes();
  const { exams, questions, findExam } = useExamCatalog();
  const { examIds } = useExamEnrollment();
  const { target: studyTarget } = useStudyTarget();
  const { results: mockExamResults, isLoading: isMockExamHistoryLoading } =
    useMockExamHistory();
  const {
    results: learningSessionResults,
    evaluatedAt: sessionHistoryEvaluatedAt,
    isLoading: isLearningSessionHistoryLoading,
  } = useLearningSessionHistory();
  const theme = useTheme();

  const lifetimeAccuracy = getAccuracy(lifetime);
  const weeklyAnswered = weeklyActivity.reduce(
    (total, activity) => total + activity.answered,
    0,
  );
  const weeklyCorrect = weeklyActivity.reduce(
    (total, activity) => total + activity.correct,
    0,
  );
  const weeklyAccuracy =
    weeklyAnswered === 0
      ? 0
      : Math.round((weeklyCorrect / weeklyAnswered) * 100);
  const maxDailyAnswered = Math.max(
    ...weeklyActivity.map((activity) => activity.answered),
    1,
  );
  const subjectPerformance = Object.values(performance.bySubject).sort(
    (left, right) => getAccuracy(left) - getAccuracy(right),
  );
  const focusSubject =
    subjectPerformance.find((subject) => subject.answered >= 3) ??
    subjectPerformance[0];
  const focusQuestionIds =
    focusSubject == null
      ? []
      : questions
          .filter(
            (question) =>
              question.examId === focusSubject.examId &&
              question.subject === focusSubject.subject,
          )
          .map((question) => question.id);
  const availableUnresolvedNotes = unresolvedNotes.filter((note) =>
    questions.some((question) => question.id === note.questionId),
  );
  const myExams = exams.filter((exam) => examIds.includes(exam.id));
  const mockExams = myExams.filter((exam) =>
    questions.some((question) => question.examId === exam.id),
  );
  const readinessItems: ExamReadinessItem[] = myExams
    .filter((exam) => questions.some((question) => question.examId === exam.id))
    .map((exam) => ({
      exam,
      readiness: calculateExamReadiness({
        examId: exam.id,
        totalQuestions: questions.filter(
          (question) => question.examId === exam.id,
        ).length,
        studiedQuestions: studiedCounts[exam.id] ?? 0,
        matureQuestions: matureCounts[exam.id] ?? 0,
        dueQuestions: dueCounts[exam.id] ?? 0,
        performance: performance.byExam[exam.id] ?? {
          answered: 0,
          correct: 0,
        },
        unresolvedWrongAnswers: unresolvedNotes.filter(
          (note) => note.examId === exam.id,
        ).length,
        streak,
      }),
    }));

  // 준비도 최저 요인 맞춤 학습 진입
  const startReadinessRecommendation = (item: ExamReadinessItem) => {
    const recommendation = item.readiness.recommendation;
    if (recommendation === "errors") {
      const questionIds = unresolvedNotes
        .filter((note) => note.examId === item.exam.id)
        .map((note) => note.questionId)
        .filter((questionId) =>
          questions.some((question) => question.id === questionId),
        );
      if (questionIds.length > 0) {
        startFocusedSubjectSession(questionIds);
        return;
      }
    }
    if (recommendation === "accuracy") {
      const weakestSubject = Object.values(performance.bySubject)
        .filter((subject) => subject.examId === item.exam.id)
        .sort((left, right) => getAccuracy(left) - getAccuracy(right))[0];
      const questionIds =
        weakestSubject == null
          ? []
          : questions
              .filter(
                (question) =>
                  question.examId === item.exam.id &&
                  question.subject === weakestSubject.subject,
              )
              .map((question) => question.id);
      if (questionIds.length > 0) {
        startFocusedSubjectSession(questionIds);
        return;
      }
    }
    startExamSession(
      item.exam.id,
      recommendation === "retention" && (dueCounts[item.exam.id] ?? 0) > 0,
    );
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.header}>
            <ThemedText type="subtitle">학습 리포트</ThemedText>
            <ThemedText themeColor="textSecondary">
              쌓인 기록에서 다음 학습 방향을 찾아보세요.
            </ThemedText>
          </View>

          <RevealView variant="zoom" duration={400}>
            <View style={[styles.heroCard, { backgroundColor: theme.primary }]}>
              <View
                style={[styles.heroOrb, { backgroundColor: theme.onPrimary }]}
              />
              <View style={styles.heroHeader}>
                <View>
                  <ThemedText type="smallBold" style={styles.onPrimaryMuted}>
                    누적 학습
                  </ThemedText>
                  <View style={styles.heroValueRow}>
                    <AnimatedCounter
                      style={styles.heroValue}
                      value={lifetime.answered}
                    />
                    <ThemedText style={styles.heroUnit}>문제</ThemedText>
                  </View>
                </View>
                <View style={styles.accuracyBadge}>
                  <AnimatedCounter
                    style={styles.accuracyValue}
                    value={lifetimeAccuracy}
                    suffix="%"
                  />
                  <ThemedText type="small" style={styles.onPrimaryMuted}>
                    전체 정답률
                  </ThemedText>
                </View>
              </View>

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <AnimatedCounter
                    style={styles.heroStatValue}
                    value={totalStudied}
                  />
                  <ThemedText type="small" style={styles.onPrimaryMuted}>
                    학습한 문제
                  </ThemedText>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <View style={styles.streakRow}>
                    <PulseView active={streak > 0} scaleTo={1.18}>
                      <ThemedText style={styles.heroStatValue}>🔥</ThemedText>
                    </PulseView>
                    <AnimatedCounter
                      style={styles.heroStatValue}
                      value={streak}
                    />
                  </View>
                  <ThemedText type="small" style={styles.onPrimaryMuted}>
                    연속 학습
                  </ThemedText>
                </View>
                <View style={styles.heroDivider} />
                <View style={styles.heroStat}>
                  <AnimatedCounter
                    style={styles.heroStatValue}
                    value={totalDue}
                  />
                  <ThemedText type="small" style={styles.onPrimaryMuted}>
                    복습 대기
                  </ThemedText>
                </View>
              </View>
            </View>
          </RevealView>

          <ExamReadinessCard
            items={readinessItems}
            onStartRecommendation={startReadinessRecommendation}
          />

          <MockExamTrendCard
            exams={mockExams}
            results={mockExamResults}
            target={studyTarget}
            isLoading={isMockExamHistoryLoading}
            onStart={startMockExamSession}
          />

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <ThemedText style={styles.sectionTitle}>최근 7일</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {weeklyAnswered}문제 · 정답률 {weeklyAccuracy}%
                </ThemedText>
              </View>
              <View
                style={[
                  styles.summaryBadge,
                  { backgroundColor: theme.successSoft },
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.success }}>
                  {weeklyAnswered > 0 ? "학습 중" : "시작 전"}
                </ThemedText>
              </View>
            </View>

            <ThemedView type="backgroundElement" style={styles.weekCard}>
              {weeklyActivity.map((activity) => {
                const dayAccuracy =
                  activity.answered === 0
                    ? 0
                    : Math.round((activity.correct / activity.answered) * 100);
                return (
                  <View key={activity.dateKey} style={styles.dayColumn}>
                    <ThemedText type="smallBold" themeColor="textSecondary">
                      {activity.answered || "·"}
                    </ThemedText>
                    <View style={styles.barArea}>
                      <View
                        style={[
                          styles.activityBar,
                          {
                            height:
                              activity.answered === 0
                                ? Spacing.one
                                : 14 +
                                  (activity.answered / maxDailyAnswered) * 38,
                            backgroundColor: activity.isToday
                              ? theme.primary
                              : theme.primarySoft,
                          },
                        ]}
                      />
                    </View>
                    <ThemedText
                      type="small"
                      style={[
                        styles.dayLabel,
                        activity.isToday && {
                          color: theme.primary,
                          fontWeight: 700,
                        },
                      ]}
                    >
                      {activity.dayLabel}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={[
                        styles.dayAccuracy,
                        {
                          color:
                            activity.answered > 0
                              ? theme.textSecondary
                              : "transparent",
                        },
                      ]}
                    >
                      {dayAccuracy}%
                    </ThemedText>
                  </View>
                );
              })}
            </ThemedView>
          </View>

          <StudyTimeInsightsCard
            results={learningSessionResults}
            evaluatedAt={sessionHistoryEvaluatedAt}
            isLoading={isLearningSessionHistoryLoading}
            onOpenActivity={openLearningActivity}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityState={{
              disabled: bookmarkedQuestionIds.length === 0,
            }}
            disabled={bookmarkedQuestionIds.length === 0}
            onPress={() => openReviewLibrary("bookmarked")}
            style={({ pressed }) => pressed && styles.cardPressed}
          >
            <ThemedView
              type="backgroundElement"
              style={[
                styles.bookmarkCard,
                bookmarkedQuestionIds.length === 0 && styles.disabledCard,
              ]}
            >
              <View
                style={[
                  styles.bookmarkIcon,
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
                  size={24}
                />
              </View>
              <View style={styles.bookmarkText}>
                <ThemedText type="smallBold">저장한 문제</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {bookmarkedQuestionIds.length > 0
                    ? `${bookmarkedQuestionIds.length}문제를 골라서 다시 풀 수 있어요`
                    : "퀴즈에서 북마크를 눌러 문제를 저장해 보세요"}
                </ThemedText>
              </View>
              <View
                style={[
                  styles.bookmarkCount,
                  { backgroundColor: theme.warningSoft },
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.warning }}>
                  {bookmarkedQuestionIds.length}
                </ThemedText>
              </View>
              {bookmarkedQuestionIds.length > 0 && (
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

          <WrongAnswerSummaryCard
            unresolvedNotes={availableUnresolvedNotes}
            resolvedCount={resolvedNotes.length}
            onOpen={() => openReviewLibrary("wrong")}
          />

          {focusSubject != null && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${focusSubject.subject} 집중 학습 시작`}
              accessibilityState={{ disabled: focusQuestionIds.length === 0 }}
              disabled={focusQuestionIds.length === 0}
              onPress={() => startFocusedSubjectSession(focusQuestionIds)}
              style={({ pressed }) => pressed && styles.cardPressed}
            >
              <ThemedView
                style={[
                  styles.focusCard,
                  { backgroundColor: theme.warningSoft },
                ]}
              >
                <View style={styles.focusHeader}>
                  <SymbolView
                    tintColor={theme.warning}
                    name={{
                      ios: "scope",
                      android: "center_focus_strong",
                      web: "center_focus_strong",
                    }}
                    size={22}
                  />
                  <ThemedText type="smallBold" style={{ color: theme.warning }}>
                    다음 집중 추천
                  </ThemedText>
                </View>
                <ThemedText style={styles.focusTitle}>
                  {focusSubject.subject}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {findExam(focusSubject.examId)?.shortTitle ?? "시험"} ·{" "}
                  {focusSubject.answered}문제 기준 정답률{" "}
                  {getAccuracy(focusSubject)}%
                </ThemedText>
                <View style={styles.focusAction}>
                  <ThemedText type="smallBold" style={{ color: theme.warning }}>
                    {focusQuestionIds.length}문제 집중 학습
                  </ThemedText>
                  <SymbolView
                    tintColor={theme.warning}
                    name={{
                      ios: "arrow.right",
                      android: "arrow_forward",
                      web: "arrow_forward",
                    }}
                    size={17}
                  />
                </View>
              </ThemedView>
            </Pressable>
          )}

          <View style={styles.section}>
            <View>
              <ThemedText style={styles.sectionTitle}>시험별 성과</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                새로 푼 문제부터 시험·과목별로 분석
              </ThemedText>
            </View>

            <View style={styles.examList}>
              {myExams.map((exam, index) => {
                const stat = performance.byExam[exam.id] ?? {
                  answered: 0,
                  correct: 0,
                };
                const accuracy = getAccuracy(stat);
                const accent = [theme.primary, theme.success, theme.warning][
                  index % 3
                ];
                const softAccent = [
                  theme.primarySoft,
                  theme.successSoft,
                  theme.warningSoft,
                ][index % 3];

                return (
                  <ThemedView
                    key={exam.id}
                    type="backgroundElement"
                    style={styles.examCard}
                  >
                    <View
                      style={[styles.examIcon, { backgroundColor: softAccent }]}
                    >
                      <ThemedText style={styles.examEmoji}>
                        {exam.icon}
                      </ThemedText>
                    </View>
                    <View style={styles.examBody}>
                      <View style={styles.examTitleRow}>
                        <ThemedText type="smallBold">
                          {exam.shortTitle}
                        </ThemedText>
                        <ThemedText type="smallBold" style={{ color: accent }}>
                          {stat.answered > 0 ? `${accuracy}%` : "–"}
                        </ThemedText>
                      </View>
                      <AnimatedProgressBar
                        progress={(accuracy) / 100}
                        height={7}
                        color={accent}
                        trackColor={softAccent}
                      />
                      <ThemedText type="small" themeColor="textSecondary">
                        {stat.answered > 0
                          ? `${stat.correct}/${stat.answered} 정답`
                          : "첫 학습을 기다리고 있어요"}
                      </ThemedText>
                    </View>
                  </ThemedView>
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
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop:
      Platform.OS === "web" ? Spacing.six + Spacing.four : Spacing.three,
    paddingBottom: BottomTabInset + Spacing.five,
  },
  header: {
    gap: Spacing.two,
  },
  heroCard: {
    position: "relative",
    overflow: "hidden",
    gap: Spacing.four,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  heroOrb: {
    position: "absolute",
    width: 180,
    height: 180,
    top: -90,
    right: -40,
    opacity: 0.08,
    borderRadius: Radius.pill,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  heroValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: Spacing.one,
  },
  heroValue: {
    color: "#FFFFFF",
    fontSize: 41,
    lineHeight: 50,
    fontWeight: 800,
  },
  heroUnit: {
    color: Alpha.onPrimaryMuted,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: 700,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  accuracyBadge: {
    alignItems: "center",
    gap: Spacing.half,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  accuracyValue: {
    color: "#FFFFFF",
    fontSize: 23,
    lineHeight: 30,
    fontWeight: 800,
  },
  onPrimaryMuted: {
    color: "rgba(255, 255, 255, 0.76)",
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  heroStat: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.half,
  },
  heroStatValue: {
    color: "#FFFFFF",
    fontSize: 17,
    lineHeight: 24,
    fontWeight: 800,
  },
  heroDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: 800,
  },
  summaryBadge: {
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  weekCard: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  dayColumn: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.one,
  },
  barArea: {
    height: 58,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  activityBar: {
    width: 14,
    minHeight: Spacing.one,
    borderRadius: Radius.pill,
  },
  dayLabel: {
    fontSize: 11,
    lineHeight: 16,
  },
  dayAccuracy: {
    fontSize: 10,
    lineHeight: 14,
  },
  bookmarkCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: "rgba(127, 127, 127, 0.12)",
    ...Shadows.card,
  },
  bookmarkIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  bookmarkText: {
    flex: 1,
    gap: Spacing.half,
  },
  bookmarkCount: {
    minWidth: 30,
    alignItems: "center",
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  disabledCard: {
    opacity: 0.66,
  },
  cardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
  focusCard: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  focusHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  focusTitle: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: 800,
  },
  focusAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.one,
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
  examIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  examEmoji: {
    fontSize: 21,
    lineHeight: 28,
  },
  examBody: {
    flex: 1,
    gap: Spacing.two,
  },
  examTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
