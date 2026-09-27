import { router } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedCounter } from "@/components/motion/animated-counter";
import { AnimatedProgressBar } from "@/components/motion/animated-progress-bar";
import { PulseView } from "@/components/motion/pulse-view";
import { RevealView } from "@/components/motion/reveal-view";
import { SectionHeader } from "@/components/section-header";
import { PageHead } from "@/components/page-head";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ExamReadinessCard } from "@/components/exam-readiness-card";
import type { ExamReadinessItem } from "@/components/exam-readiness-card";
import { MockExamTrendCard } from "@/components/mock-exam-trend-card";
import { StudyTimeInsightsCard } from "@/components/study-time-insights-card";
import {
  BottomTabInset,
  MaxContentWidth,
  Radius,
  Shadows,
  Spacing,
} from "@/constants/theme";
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
  router.push("/activity");
}

// 누적 학습 리포트 화면
export default function ReportScreen() {
  const { lifetime, performance } = useLearningReport();
  const { weeklyActivity, streak } = useDailyStats();
  const { totalStudied, totalDue, studiedCounts, matureCounts, dueCounts } =
    useSrsSummary();
  const { unresolvedNotes } = useWrongAnswerNotes();
  const { exams, questions } = useExamCatalog();
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
      <PageHead
        title="리포트"
        description="정답률·학습 시간·과목별 취약점을 한눈에 보는 학습 통계."
      />
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
                  <ThemedText themeColor="onPrimaryMuted" type="smallBold">
                    누적 학습
                  </ThemedText>
                  <View style={styles.heroValueRow}>
                    <AnimatedCounter
                      themeColor="onPrimary"
                      style={styles.heroValue}
                      value={lifetime.answered}
                    />
                    <ThemedText
                      themeColor="onPrimaryMuted"
                      style={styles.heroUnit}
                    >
                      문제
                    </ThemedText>
                  </View>
                </View>
                <View
                  style={[
                    styles.accuracyBadge,
                    { backgroundColor: theme.onPrimarySurface },
                  ]}
                >
                  <AnimatedCounter
                    themeColor="onPrimary"
                    style={styles.accuracyValue}
                    value={lifetimeAccuracy}
                    suffix="%"
                  />
                  <ThemedText themeColor="onPrimaryMuted" type="small">
                    전체 정답률
                  </ThemedText>
                </View>
              </View>

              <View style={styles.heroStats}>
                <View style={styles.heroStat}>
                  <AnimatedCounter
                    themeColor="onPrimary"
                    style={styles.heroStatValue}
                    value={totalStudied}
                  />
                  <ThemedText themeColor="onPrimaryMuted" type="small">
                    학습한 문제
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.heroDivider,
                    { backgroundColor: theme.onPrimarySurface },
                  ]}
                />
                <View style={styles.heroStat}>
                  <View style={styles.streakRow}>
                    <PulseView active={streak > 0} scaleTo={1.18}>
                      <ThemedText
                        themeColor="onPrimary"
                        style={styles.heroStatValue}
                      >
                        🔥
                      </ThemedText>
                    </PulseView>
                    <AnimatedCounter
                      themeColor="onPrimary"
                      style={styles.heroStatValue}
                      value={streak}
                    />
                  </View>
                  <ThemedText themeColor="onPrimaryMuted" type="small">
                    연속 학습
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.heroDivider,
                    { backgroundColor: theme.onPrimarySurface },
                  ]}
                />
                <View style={styles.heroStat}>
                  <AnimatedCounter
                    themeColor="onPrimary"
                    style={styles.heroStatValue}
                    value={totalDue}
                  />
                  <ThemedText themeColor="onPrimaryMuted" type="small">
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

          <View style={styles.section}>
            <SectionHeader
              title="최근 7일"
              subtitle={`${weeklyAnswered}문제 · 정답률 ${weeklyAccuracy}%`}
            />

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

          <View style={styles.section}>
            <SectionHeader title="시험별 성과" subtitle="시험별 누적 정답률" />

            <ThemedView type="backgroundElement" style={styles.examList}>
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
                  <View
                    key={exam.id}
                    style={[
                      styles.examCard,
                      index > 0 && {
                        borderTopWidth: 1,
                        borderTopColor: theme.border,
                      },
                    ]}
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
                        progress={accuracy / 100}
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
                  </View>
                );
              })}
            </ThemedView>
          </View>

          <MockExamTrendCard
            exams={mockExams}
            results={mockExamResults}
            target={studyTarget}
            isLoading={isMockExamHistoryLoading}
            onStart={startMockExamSession}
          />

          <StudyTimeInsightsCard
            results={learningSessionResults}
            evaluatedAt={sessionHistoryEvaluatedAt}
            isLoading={isLearningSessionHistoryLoading}
            onOpenActivity={openLearningActivity}
          />
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
    paddingTop: Spacing.three,
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
    fontSize: 41,
    lineHeight: 50,
    fontWeight: 800,
  },
  heroUnit: {
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
  },
  accuracyValue: {
    fontSize: 23,
    lineHeight: 30,
    fontWeight: 800,
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
    fontSize: 17,
    lineHeight: 24,
    fontWeight: 800,
  },
  heroDivider: {
    width: 1,
    height: 28,
  },
  section: {
    gap: Spacing.three,
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
  examList: {
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  examCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.three,
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
