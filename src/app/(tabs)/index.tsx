import { router, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActiveSessionCard } from "@/components/active-session-card";
import { DailyStudyPlanCard } from "@/components/daily-study-plan-card";
import { HomeExamRow } from "@/components/home-exam-row";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { NativeAdCard } from "@/components/native-ad-card";
import { PageHead } from "@/components/page-head";
import { PullRefreshControl } from "@/components/pull-refresh-control";
import { SectionHeader } from "@/components/section-header";
import { StudyDeadlineCard } from "@/components/study-deadline-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  BottomTabInset,
  MaxContentWidth,
  Radius,
  Spacing,
  TabScreenEdges,
} from "@/constants/theme";
import { useActiveQuizSession } from "@/hooks/use-active-quiz-session";
import { useDailyStats } from "@/hooks/use-daily-stats";
import { useDailyStudyPlan } from "@/hooks/use-daily-study-plan";
import { useExamCatalog } from "@/hooks/use-exam-catalog";
import { useExamEnrollment } from "@/hooks/use-exam-enrollment";
import { useLearningReport } from "@/hooks/use-learning-report";
import { useNotifications } from "@/hooks/use-notifications";
import { useSettings } from "@/hooks/use-settings";
import { useSrsSummary } from "@/hooks/use-srs-summary";
import { useStudyTarget } from "@/hooks/use-study-target";
import { useTheme } from "@/hooks/use-theme";
import type { StudyPlanTask } from "@/learning/daily-study-plan";
import { calculateExamPace } from "@/learning/exam-pace";
import { calculateWeeklyGoalProgress } from "@/learning/weekly-goal";
import type { ActiveQuizSession } from "@/storage/active-quiz-session-store";
import type { Exam } from "@/types/exam";

// 학습 세션 진입
function startLearnSession(exam: Exam) {
  router.push({ pathname: "/quiz/[examId]", params: { examId: exam.id } });
}

// 시험별 맞춤 세션 구성 화면 진입
function openSessionBuilder(examId: string) {
  router.push({
    pathname: "/session-builder/[examId]",
    params: { examId },
  });
}

// 맞춤 플랜 문제 세션 진입
function startStudyPlanSession(
  questionIds: string[],
  mode: StudyPlanTask["mode"] = "learn",
) {
  router.push({
    pathname: "/quiz/[examId]",
    params: { examId: "all", mode, questionIds: questionIds.join(",") },
  });
}

// 저장된 학습 세션 복구 진입
function resumeQuizSession(session: ActiveQuizSession) {
  router.push({
    pathname: "/quiz/[examId]",
    params: {
      examId: session.examId,
      mode: session.mode,
      resume: "true",
    },
  });
}

// 오늘 할 학습 중심 홈 화면
export default function HomeScreen() {
  const { todayStat, currentWeekActivity, streak } = useDailyStats();
  const { performance } = useLearningReport();
  const { studiedCounts, dueCounts, recentExamId } = useSrsSummary();
  const { exams, questions, selectQuestionsByExam } = useExamCatalog();
  const { examIds } = useExamEnrollment();
  const { settings } = useSettings();
  const {
    session: activeQuizSession,
    isLoading: isActiveSessionLoading,
    discard: discardActiveSession,
  } = useActiveQuizSession();
  const { target: studyTarget, evaluatedAt: paceEvaluatedAt } =
    useStudyTarget();
  const targetExamEnrolled =
    studyTarget != null && examIds.includes(studyTarget.examId);
  const targetQuestionCount =
    studyTarget == null
      ? 0
      : questions.filter((question) => question.examId === studyTarget.examId)
          .length;
  const examPace =
    studyTarget == null || !targetExamEnrolled || paceEvaluatedAt === 0
      ? null
      : calculateExamPace(
          studyTarget,
          targetQuestionCount,
          studiedCounts[studyTarget.examId] ?? 0,
          paceEvaluatedAt,
        );
  const weeklyGoalProgress = calculateWeeklyGoalProgress({
    goal: settings.weeklyGoal,
    answered: currentWeekActivity.reduce(
      (sum, activity) => sum + activity.answered,
      0,
    ),
    todayAnswered: todayStat.answered,
    elapsedDays: currentWeekActivity.filter((activity) => !activity.isFuture)
      .length,
  });
  const planDailyGoal = Math.max(
    settings.dailyGoal,
    examPace?.dailyQuestionTarget ?? 0,
    todayStat.answered + weeklyGoalProgress.remainingToday,
  );
  const planExamIds =
    examPace != null && examPace.status !== "complete"
      ? [examPace.examId]
      : examIds;
  const { plan: dailyStudyPlan, isLoading: isDailyPlanLoading } =
    useDailyStudyPlan({
      questions,
      enrolledExamIds: planExamIds,
      performance,
      dailyGoal: planDailyGoal,
      todayAnswered: todayStat.answered,
      sessionSize: settings.sessionSize,
    });
  const { unreadCount, reload: reloadNotifications } = useNotifications();
  const theme = useTheme();
  const myExams = exams.filter((exam) => examIds.includes(exam.id));
  const activeSessionExamIds =
    activeQuizSession == null
      ? []
      : [
          ...new Set(
            activeQuizSession.questions.map((question) => question.examId),
          ),
        ];
  const activeSessionExam =
    activeSessionExamIds.length === 1
      ? exams.find((exam) => exam.id === activeSessionExamIds[0])
      : null;
  const activeSessionTitle =
    activeSessionExam?.shortTitle ??
    (activeSessionExamIds.length > 1
      ? "여러 시험 맞춤 플랜"
      : "진행 중인 학습");
  const hasActiveSession = !isActiveSessionLoading && activeQuizSession != null;

  // 화면 포커스 시 알림 개수 갱신
  useFocusEffect(
    useCallback(() => {
      void reloadNotifications();
    }, [reloadNotifications]),
  );

  return (
    <ThemedView style={styles.container}>
      <PageHead title="산업안전기사·정처기·SQLD 자격증 문제 풀이" />
      <SafeAreaView edges={TabScreenEdges} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<PullRefreshControl />}
        >
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <ThemedText style={[styles.brand, { color: theme.primary }]}>
                또풀
              </ThemedText>
              <ThemedText type="smallBold" themeColor="textSecondary">
                기출, 또 풀자!
              </ThemedText>
            </View>
            <View style={styles.headerActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`알림 열기${unreadCount > 0 ? `, 새 알림 ${unreadCount}개` : ""}`}
                onPress={() => router.push("/notifications")}
                hitSlop={Spacing.two}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  tintColor={theme.text}
                  name={{
                    ios: "bell",
                    android: "notifications_none",
                    web: "notifications_none",
                  }}
                  size={24}
                />
                {unreadCount > 0 && (
                  <View
                    style={[styles.unreadDot, { backgroundColor: theme.danger }]}
                  />
                )}
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="설정 열기"
                onPress={() => router.push("/settings")}
                hitSlop={Spacing.two}
                style={({ pressed }) => [
                  styles.iconButton,
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  tintColor={theme.text}
                  name={{
                    ios: "gearshape",
                    android: "settings",
                    web: "settings",
                  }}
                  size={24}
                />
              </Pressable>
            </View>
          </View>

          <StudyDeadlineCard />

          {hasActiveSession && (
            <ActiveSessionCard
              session={activeQuizSession}
              title={activeSessionTitle}
              onResume={() => resumeQuizSession(activeQuizSession)}
              onDiscard={() => void discardActiveSession()}
            />
          )}

          <DailyStudyPlanCard
            plan={dailyStudyPlan}
            isLoading={isDailyPlanLoading}
            answered={todayStat.answered}
            dailyGoal={settings.dailyGoal}
            streak={streak}
            emphasizeStart={!hasActiveSession}
            onStartPlan={startStudyPlanSession}
            onEmptyAction={() => router.push("/discover")}
          />

          <View style={styles.section}>
            <SectionHeader
              title="내 시험"
              actionLabel={myExams.length > 0 ? "관리" : undefined}
              actionAccessibilityLabel="내 시험 관리"
              onAction={() =>
                router.push({ pathname: "/catalog", params: { tab: "mine" } })
              }
            />
            {myExams.length > 0 ? (
              <ThemedView type="backgroundElement" style={styles.listCard}>
                {myExams.map((exam, listIndex) => {
                  const total = selectQuestionsByExam(exam.id).length;
                  return (
                    <View key={exam.id}>
                      {listIndex > 0 && (
                        <View
                          style={[
                            styles.rowDivider,
                            { backgroundColor: theme.border },
                          ]}
                        />
                      )}
                      <HomeExamRow
                        exam={exam}
                        total={total}
                        studied={Math.min(studiedCounts[exam.id] ?? 0, total)}
                        dueCount={dueCounts[exam.id] ?? 0}
                        isRecent={exam.id === recentExamId}
                        accent={theme.primary}
                        softAccent={theme.primarySoft}
                        onCustomize={() => openSessionBuilder(exam.id)}
                        onStart={() => startLearnSession(exam)}
                      />
                    </View>
                  );
                })}
              </ThemedView>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="준비할 시험 추가"
                onPress={() => router.push("/discover")}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <ThemedView type="backgroundElement" style={styles.emptyCard}>
                  <SymbolView
                    tintColor={theme.primary}
                    name={{ ios: "plus", android: "add", web: "add" }}
                    size={22}
                  />
                  <ThemedText type="smallBold">
                    준비할 시험을 추가해 주세요
                  </ThemedText>
                </ThemedView>
              </Pressable>
            )}
          </View>

          <NativeAdCard />
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
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.twoHalf,
  },
  brand: {
    fontSize: 28,
    lineHeight: 36,
    fontWeight: 900,
    letterSpacing: -0.6,
  },
  headerActions: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  iconButton: {
    position: "relative",
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.pill,
  },
  unreadDot: {
    position: "absolute",
    top: 9,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
  section: {
    gap: Spacing.two,
  },
  listCard: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.large,
  },
  rowDivider: {
    height: 1,
  },
  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.large,
  },
  pressed: {
    opacity: 0.68,
  },
});
