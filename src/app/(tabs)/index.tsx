import { router, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActiveSessionCard } from "@/components/active-session-card";
import { DailyStudyPlanCard } from "@/components/daily-study-plan-card";
import { ExamPaceCard } from "@/components/exam-pace-card";
import { HomeExamRow } from "@/components/home-exam-row";
import { LearningMomentumCard } from "@/components/learning-momentum-card";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { CelebrationBurst } from "@/components/motion/celebration-burst";
import { PulseView } from "@/components/motion/pulse-view";
import { RevealView } from "@/components/motion/reveal-view";
import { PageHead } from "@/components/page-head";
import { SavedStudyRoutineCard } from "@/components/saved-study-routine-card";
import { SectionHeader } from "@/components/section-header";
import { StudyDeadlineCard } from "@/components/study-deadline-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { WeeklyGoalCard } from "@/components/weekly-goal-card";
import { stagger } from "@/constants/motion";
import {
  accentByIndex,
  BottomTabInset,
  MaxContentWidth,
  Radius,
  Shadows,
  Spacing,
} from "@/constants/theme";
import { useAchievements } from "@/hooks/use-achievements";
import { useActiveQuizSession } from "@/hooks/use-active-quiz-session";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useCustomSessionPresets } from "@/hooks/use-custom-session-presets";
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
import { selectCustomSessionQuestions } from "@/learning/custom-session";
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

// 현재 시간대 인사말 생성
function getGreeting(hour: number): string {
  if (hour < 6) return "늦은 시간에도 꾸준하네요";
  if (hour < 12) return "좋은 아침이에요";
  if (hour < 18) return "오늘도 한 걸음 더";
  return "오늘의 마무리 학습";
}

// 오늘 할 학습 중심 홈 화면
export default function HomeScreen() {
  const {
    todayStat,
    currentWeekActivity,
    streak,
    isLoading: isStatsLoading,
  } = useDailyStats();
  const { lifetime, performance } = useLearningReport();
  const {
    cards,
    studiedCounts,
    dueCounts,
    totalStudied,
    recentExamId,
    isLoading: isSrsLoading,
  } = useSrsSummary();
  const { bookmarkedQuestionIds } = useBookmarks();
  const {
    exams,
    questions,
    selectQuestionsByExam,
    isLoading: isCatalogLoading,
  } = useExamCatalog();
  const { examIds } = useExamEnrollment();
  const { settings } = useSettings();
  const {
    presets: customSessionPresets,
    isLoading: isCustomSessionPresetsLoading,
  } = useCustomSessionPresets();
  const {
    session: activeQuizSession,
    isLoading: isActiveSessionLoading,
    discard: discardActiveSession,
  } = useActiveQuizSession();
  const {
    target: studyTarget,
    evaluatedAt: paceEvaluatedAt,
    isLoading: isStudyTargetLoading,
  } = useStudyTarget();
  const targetExam =
    studyTarget == null || !examIds.includes(studyTarget.examId)
      ? null
      : (exams.find((exam) => exam.id === studyTarget.examId) ?? null);
  const targetQuestionCount =
    studyTarget == null
      ? 0
      : questions.filter((question) => question.examId === studyTarget.examId)
          .length;
  const examPace =
    studyTarget == null || targetExam == null || paceEvaluatedAt === 0
      ? null
      : calculateExamPace(
          studyTarget,
          targetQuestionCount,
          studiedCounts[studyTarget.examId] ?? 0,
          paceEvaluatedAt,
        );
  const weeklyAnswered = currentWeekActivity.reduce(
    (sum, activity) => sum + activity.answered,
    0,
  );
  const weeklyGoalProgress = calculateWeeklyGoalProgress({
    goal: settings.weeklyGoal,
    answered: weeklyAnswered,
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
  const achievementMetrics = useMemo(
    () => ({
      answered: lifetime.answered,
      correct: lifetime.correct,
      streak,
      bookmarked: bookmarkedQuestionIds.length,
      enrolled: examIds.length,
      studied: totalStudied,
    }),
    [
      bookmarkedQuestionIds.length,
      examIds.length,
      lifetime.answered,
      lifetime.correct,
      streak,
      totalStudied,
    ],
  );
  const { unlockedCount: unlockedAchievementCount } =
    useAchievements(achievementMetrics);
  const theme = useTheme();
  const myExams = exams.filter((exam) => examIds.includes(exam.id));
  const savedRoutinePreset = Object.values(customSessionPresets)
    .filter((preset) => examIds.includes(preset.examId))
    .sort((left, right) => right.updatedAt - left.updatedAt)[0];
  const savedRoutineExam =
    savedRoutinePreset == null
      ? null
      : (myExams.find((exam) => exam.id === savedRoutinePreset.examId) ?? null);
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
  const todayAccuracyRate =
    todayStat.answered > 0
      ? Math.round((todayStat.correct / todayStat.answered) * 100)
      : null;
  const isGoalReached =
    settings.dailyGoal > 0 && todayStat.answered >= settings.dailyGoal;
  const [goalCelebration, setGoalCelebration] = useState(0);
  const wasGoalReachedRef = useRef<boolean | null>(null);

  // 목표 달성 전환 시점에만 축하 연출 실행
  useEffect(() => {
    if (isStatsLoading) return;
    if (wasGoalReachedRef.current === false && isGoalReached)
      setGoalCelebration((count) => count + 1);
    wasGoalReachedRef.current = isGoalReached;
  }, [isGoalReached, isStatsLoading]);

  // 최근 저장 학습 루틴 즉시 시작
  const startSavedRoutine = () => {
    if (savedRoutinePreset == null || savedRoutineExam == null) return;
    const selectedQuestions = selectCustomSessionQuestions({
      questions: selectQuestionsByExam(savedRoutinePreset.examId),
      selectedSubjects: savedRoutinePreset.selectedSubjects,
      performance,
      cards,
      count: savedRoutinePreset.questionCount,
      strategy: savedRoutinePreset.strategy,
    });
    if (selectedQuestions.length === 0) {
      openSessionBuilder(savedRoutinePreset.examId);
      return;
    }
    router.push({
      pathname: "/quiz/[examId]",
      params: {
        examId: savedRoutinePreset.examId,
        mode: savedRoutinePreset.mode,
        questionIds: selectedQuestions.map((question) => question.id).join(","),
      },
    });
  };

  // 화면 포커스 시 알림 개수 갱신
  useFocusEffect(
    useCallback(() => {
      void reloadNotifications();
    }, [reloadNotifications]),
  );

  return (
    <ThemedView style={styles.container}>
      <PageHead
        title="컴활·토익·자격증 연습문제 반복학습"
        description="컴활·토익·드론 등 자격시험 연습문제를 풀고 틀린 문제는 간격 반복으로 다시 풀어 완전히 익히는 학습 앱."
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.header}>
            <View style={styles.headerText}>
              <ThemedText type="small" themeColor="textSecondary">
                {getGreeting(new Date().getHours())}
              </ThemedText>
              <ThemedText style={styles.brandTitle}>또풀</ThemedText>
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
                    ios: unreadCount > 0 ? "bell.fill" : "bell",
                    android:
                      unreadCount > 0 ? "notifications" : "notifications_none",
                    web:
                      unreadCount > 0 ? "notifications" : "notifications_none",
                  }}
                  size={22}
                />
                {unreadCount > 0 && (
                  <PulseView
                    scaleTo={1.16}
                    duration={1300}
                    style={[
                      styles.notificationBadge,
                      { backgroundColor: theme.danger },
                    ]}
                  >
                    <ThemedText
                      themeColor="onPrimary"
                      style={styles.notificationBadgeText}
                    >
                      {Math.min(unreadCount, 9)}
                    </ThemedText>
                  </PulseView>
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
                  size={22}
                />
              </Pressable>
            </View>
          </View>

          <StudyDeadlineCard />

          {hasActiveSession && (
            <RevealView delay={stagger(1, 40)}>
              <ActiveSessionCard
                session={activeQuizSession}
                title={activeSessionTitle}
                onResume={() => resumeQuizSession(activeQuizSession)}
                onDiscard={() => void discardActiveSession()}
              />
            </RevealView>
          )}

          <RevealView delay={stagger(2, 40)} style={styles.todayWrapper}>
            <DailyStudyPlanCard
              plan={dailyStudyPlan}
              isLoading={isDailyPlanLoading}
              answered={todayStat.answered}
              dailyGoal={settings.dailyGoal}
              streak={streak}
              accuracyRate={todayAccuracyRate}
              emphasizeStart={!hasActiveSession}
              onStartTask={(task) =>
                startStudyPlanSession(task.questionIds, task.mode)
              }
              onStartPlan={startStudyPlanSession}
              onEmptyAction={() => router.push("/discover")}
              onCompletedAction={() => router.push("/report")}
            />
            <CelebrationBurst trigger={goalCelebration} />
          </RevealView>

          <View style={styles.section}>
            <SectionHeader
              title="내 시험"
              subtitle={
                myExams.length > 0
                  ? "시험을 누르면 과목·문제 수를 맞출 수 있어요"
                  : undefined
              }
              actionLabel="관리"
              actionAccessibilityLabel="내 시험 관리"
              onAction={() =>
                router.push({ pathname: "/catalog", params: { tab: "mine" } })
              }
            />
            {myExams.length > 0 ? (
              <ThemedView type="backgroundElement" style={styles.listCard}>
                {myExams.map((exam, listIndex) => {
                  const total = selectQuestionsByExam(exam.id).length;
                  const { accent, soft } = accentByIndex(theme, listIndex);
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
                        accent={accent}
                        softAccent={soft}
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
                  <View
                    style={[
                      styles.emptyIcon,
                      { backgroundColor: theme.primarySoft },
                    ]}
                  >
                    <SymbolView
                      tintColor={theme.primary}
                      name={{
                        ios: "plus",
                        android: "add",
                        web: "add",
                      }}
                      size={22}
                    />
                  </View>
                  <View style={styles.emptyCopy}>
                    <ThemedText type="smallBold">
                      준비할 시험을 추가해 주세요
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      시험찾기에서 담으면 진도와 복습 일정을 관리해요
                    </ThemedText>
                  </View>
                </ThemedView>
              </Pressable>
            )}

            {!isCustomSessionPresetsLoading &&
              !isSrsLoading &&
              savedRoutinePreset != null &&
              savedRoutineExam != null && (
                <SavedStudyRoutineCard
                  preset={savedRoutinePreset}
                  exam={savedRoutineExam}
                  onStart={startSavedRoutine}
                  onEdit={() => openSessionBuilder(savedRoutineExam.id)}
                />
              )}
          </View>

          <View style={styles.section}>
            <SectionHeader title="이번 주" />
            <WeeklyGoalCard
              activities={currentWeekActivity}
              progress={weeklyGoalProgress}
              onAdjust={() => router.push("/settings")}
              onOpenActivity={() => router.push("/activity")}
            />
          </View>

          <View style={styles.section}>
            <SectionHeader title="계획과 성장" />
            <ExamPaceCard
              pace={examPace}
              exam={targetExam}
              targetScore={studyTarget?.targetScore}
              isLoading={isStudyTargetLoading || isCatalogLoading}
              onPress={() => router.push("/study-plan-settings")}
            />
            <LearningMomentumCard
              lifetime={lifetime}
              today={todayStat}
              dailyGoal={settings.dailyGoal}
              unlockedAchievementCount={unlockedAchievementCount}
              onOpenProgress={() => router.push("/progress")}
            />
          </View>

          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.footerText}
          >
            매일 조금씩, 기억은 오래도록
          </ThemedText>
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerText: {
    gap: Spacing.half,
  },
  brandTitle: {
    fontSize: 25,
    lineHeight: 32,
    fontWeight: 800,
    letterSpacing: -0.4,
  },
  headerActions: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  iconButton: {
    position: "relative",
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.pill,
  },
  notificationBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    minWidth: 17,
    height: 17,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.half,
    borderRadius: Radius.pill,
  },
  notificationBadgeText: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: 700,
  },
  todayWrapper: {
    position: "relative",
  },
  section: {
    gap: Spacing.three,
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
  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  emptyCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  footerText: {
    textAlign: "center",
    paddingTop: Spacing.two,
  },
  pressed: {
    opacity: 0.68,
  },
});
