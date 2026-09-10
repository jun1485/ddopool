import { router, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ActiveSessionCard } from "@/components/active-session-card";
import { MascotCat } from "@/components/mascot-cat";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { AnimatedProgressBar } from "@/components/motion/animated-progress-bar";
import { CelebrationBurst } from "@/components/motion/celebration-burst";
import { PulseView } from "@/components/motion/pulse-view";
import { RevealView } from "@/components/motion/reveal-view";
import { DailyStudyPlanCard } from "@/components/daily-study-plan-card";
import { StudyDeadlineCard } from "@/components/study-deadline-card";
import { ExamPaceCard } from "@/components/exam-pace-card";
import { LearningMomentumCard } from "@/components/learning-momentum-card";
import { SavedStudyRoutineCard } from "@/components/saved-study-routine-card";
import { PageHead } from "@/components/page-head";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { WeeklyGoalCard } from "@/components/weekly-goal-card";
import { stagger } from "@/constants/motion";
import {
  accentByIndex,
  Alpha,
  BottomTabInset,
  MaxContentWidth,
  Radius,
  Shadows,
  Spacing,
} from "@/constants/theme";
import { useDailyStats } from "@/hooks/use-daily-stats";
import { useAchievements } from "@/hooks/use-achievements";
import { useActiveQuizSession } from "@/hooks/use-active-quiz-session";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useCustomSessionPresets } from "@/hooks/use-custom-session-presets";
import { useDailyStudyPlan } from "@/hooks/use-daily-study-plan";
import { useExamCatalog } from "@/hooks/use-exam-catalog";
import { useExamEnrollment } from "@/hooks/use-exam-enrollment";
import { useLearningReport } from "@/hooks/use-learning-report";
import { useSettings } from "@/hooks/use-settings";
import { useSrsSummary } from "@/hooks/use-srs-summary";
import { useStudyTarget } from "@/hooks/use-study-target";
import { useTheme } from "@/hooks/use-theme";
import { useNotifications } from "@/hooks/use-notifications";
import { calculateExamPace } from "@/learning/exam-pace";
import { selectCustomSessionQuestions } from "@/learning/custom-session";
import { calculateWeeklyGoalProgress } from "@/learning/weekly-goal";
import type { ActiveQuizSession } from "@/storage/active-quiz-session-store";
import type { StudyPlanTask } from "@/learning/daily-study-plan";
import type { Exam } from "@/types/exam";

// 학습 세션 진입
function startLearnSession(exam: Exam) {
  router.push({ pathname: "/quiz/[examId]", params: { examId: exam.id } });
}

// 시험별 맞춤 세션 구성 화면 진입
function openSessionBuilder(examId: string) {
  router.push({
    pathname: "./session-builder/[examId]",
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

// 시험 선택 홈 화면
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
    totalDue,
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
  const recentExam =
    myExams.find((exam) => exam.id === recentExamId) ?? myExams[0];
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
  const dailyProgress = Math.min(todayStat.answered / settings.dailyGoal, 1);
  const remainingGoal = Math.max(settings.dailyGoal - todayStat.answered, 0);
  const todayAccuracyRate =
    todayStat.answered > 0
      ? Math.round((todayStat.correct / todayStat.answered) * 100)
      : null;
  const isGoalReached = settings.dailyGoal > 0 && remainingGoal === 0;
  const [goalCelebration, setGoalCelebration] = useState(0);
  const wasGoalReachedRef = useRef<boolean | null>(null);

  // 목표 달성 전환 시점에만 축하 연출 실행
  useEffect(() => {
    if (isStatsLoading) return;
    if (wasGoalReachedRef.current === false && isGoalReached)
      setGoalCelebration((count) => count + 1);
    wasGoalReachedRef.current = isGoalReached;
  }, [isGoalReached, isStatsLoading]);

  // 주간 목표 맞춤 세션 진입
  const startWeeklyGoalSession = () => {
    if (dailyStudyPlan.questionIds.length > 0) {
      startStudyPlanSession(dailyStudyPlan.questionIds);
      return;
    }
    if (recentExam != null) startLearnSession(recentExam);
  };

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
                accessibilityLabel="시험 찾기 및 요청"
                onPress={() => router.push("/catalog")}
                hitSlop={Spacing.two}
                style={({ pressed }) => [
                  styles.iconButton,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.cardBorder,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  tintColor={theme.primary}
                  name={{
                    ios: "magnifyingglass",
                    android: "search",
                    web: "search",
                  }}
                  size={21}
                />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`알림 열기${unreadCount > 0 ? `, 새 알림 ${unreadCount}개` : ""}`}
                onPress={() => router.push("/notifications")}
                hitSlop={Spacing.two}
                style={({ pressed }) => [
                  styles.iconButton,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.cardBorder,
                  },
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
                  size={21}
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
                    <ThemedText style={styles.notificationBadgeText}>
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
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.cardBorder,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  tintColor={theme.text}
                  name={{
                    ios: "gearshape.fill",
                    android: "settings",
                    web: "settings",
                  }}
                  size={21}
                />
              </Pressable>
            </View>
          </View>

          {!isActiveSessionLoading && activeQuizSession != null && (
            <RevealView delay={stagger(1, 40)}>
              <ActiveSessionCard
                session={activeQuizSession}
                title={activeSessionTitle}
                onResume={() => resumeQuizSession(activeQuizSession)}
                onDiscard={() => void discardActiveSession()}
              />
            </RevealView>
          )}

          <RevealView delay={stagger(2, 40)}>
            <DailyStudyPlanCard
              plan={dailyStudyPlan}
              isLoading={isDailyPlanLoading}
              onStartTask={(task) =>
                startStudyPlanSession(task.questionIds, task.mode)
              }
              onStartPlan={startStudyPlanSession}
              onEmptyAction={() => router.push("/catalog")}
              onCompletedAction={() => router.push("/report")}
            />
          </RevealView>

          <StudyDeadlineCard />
          <RevealView variant="fade" duration={180} style={styles.goalWrapper}>
            <View
              style={[
                styles.goalCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: theme.border,
                },
              ]}
            >
              <View style={styles.goalHeader}>
                <View style={styles.goalText}>
                  <ThemedText
                    type="smallBold"
                    style={{ color: theme.textSecondary }}
                  >
                    오늘의 목표
                  </ThemedText>
                  <ThemedText style={[styles.goalTitle, { color: theme.text }]}>
                    {isGoalReached
                      ? "오늘 목표를 채웠어요"
                      : `남은 문제 ${remainingGoal}개`}
                  </ThemedText>
                </View>
                <MascotCat size={64} />
              </View>

              <AnimatedProgressBar
                progress={dailyProgress}
                height={8}
                shimmer={!isGoalReached && dailyProgress > 0}
                color={theme.primary}
                trackColor={theme.backgroundSelected}
              />

              <View style={styles.goalStats}>
                <View style={styles.goalStatItem}>
                  <AnimatedCounter
                    style={[styles.goalStatValue, { color: theme.text }]}
                    value={todayStat.answered}
                  />
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary }}
                  >
                    오늘 풀이
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.goalDivider,
                    { backgroundColor: theme.border },
                  ]}
                />
                <View style={styles.goalStatItem}>
                  {todayAccuracyRate == null ? (
                    <ThemedText
                      style={[styles.goalStatValue, { color: theme.text }]}
                    >
                      –
                    </ThemedText>
                  ) : (
                    <AnimatedCounter
                      style={[styles.goalStatValue, { color: theme.text }]}
                      value={todayAccuracyRate}
                      suffix="%"
                    />
                  )}
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary }}
                  >
                    정답률
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.goalDivider,
                    { backgroundColor: theme.border },
                  ]}
                />
                <View style={styles.goalStatItem}>
                  <View style={styles.streakRow}>
                    <AnimatedCounter
                      style={[styles.goalStatValue, { color: theme.text }]}
                      value={streak}
                    />
                  </View>
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary }}
                  >
                    연속 학습
                  </ThemedText>
                </View>
              </View>
            </View>
            <CelebrationBurst trigger={goalCelebration} />
          </RevealView>

          <RevealView delay={stagger(3, 40)}>
            <ExamPaceCard
              pace={examPace}
              exam={targetExam}
              targetScore={studyTarget?.targetScore}
              isLoading={isStudyTargetLoading || isCatalogLoading}
              onPress={() => router.push("./study-plan-settings")}
            />
          </RevealView>

          <RevealView delay={stagger(4, 40)}>
            <LearningMomentumCard
              lifetime={lifetime}
              today={todayStat}
              dailyGoal={settings.dailyGoal}
              unlockedAchievementCount={unlockedAchievementCount}
              onOpenProgress={() => router.push("./progress")}
            />
          </RevealView>

          {recentExam != null && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${recentExam.shortTitle} 학습 시작`}
              onPress={() => startLearnSession(recentExam)}
            >
              <ThemedView type="backgroundElement" style={styles.continueCard}>
                <View
                  style={[
                    styles.continueIcon,
                    { backgroundColor: theme.primarySoft },
                  ]}
                >
                  <SymbolView
                    tintColor={theme.primary}
                    name={{
                      ios: "play.fill",
                      android: "play_arrow",
                      web: "play_arrow",
                    }}
                    size={22}
                  />
                </View>
                <View style={styles.continueText}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {recentExamId == null ? "첫 학습 추천" : "이어서 학습"}
                  </ThemedText>
                  <ThemedText type="smallBold">
                    {recentExam.shortTitle}
                  </ThemedText>
                </View>
                {totalDue > 0 && (
                  <View
                    style={[
                      styles.dueBadge,
                      { backgroundColor: theme.warningSoft },
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{ color: theme.warning }}
                    >
                      복습 {totalDue}
                    </ThemedText>
                  </View>
                )}
                <SymbolView
                  tintColor={theme.textSecondary}
                  name={{
                    ios: "chevron.right",
                    android: "chevron_right",
                    web: "chevron_right",
                  }}
                  size={18}
                />
              </ThemedView>
            </Pressable>
          )}

          {!isCustomSessionPresetsLoading &&
            !isSrsLoading &&
            savedRoutinePreset != null &&
            savedRoutineExam != null && (
              <RevealView delay={stagger(5, 40)}>
                <SavedStudyRoutineCard
                  preset={savedRoutinePreset}
                  exam={savedRoutineExam}
                  onStart={startSavedRoutine}
                  onEdit={() => openSessionBuilder(savedRoutineExam.id)}
                />
              </RevealView>
            )}

          <RevealView delay={stagger(6, 40)}>
            <WeeklyGoalCard
              activities={currentWeekActivity}
              progress={weeklyGoalProgress}
              canStart={
                dailyStudyPlan.questionIds.length > 0 || recentExam != null
              }
              onStart={startWeeklyGoalSession}
              onAdjust={() => router.push("/settings")}
              onOpenActivity={() => router.push("./activity")}
            />
          </RevealView>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <ThemedText style={styles.sectionTitle}>시험별 학습</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  원하는 시험을 선택해 바로 시작해 보세요
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: "/catalog",
                    params: { tab: "mine" },
                  })
                }
                style={({ pressed }) => [
                  styles.manageButton,
                  { backgroundColor: theme.primarySoft },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  관리
                </ThemedText>
              </Pressable>
            </View>

            {myExams.length > 0 ? (
              <View style={styles.examList}>
                {myExams.map((exam, listIndex) => {
                  const total = selectQuestionsByExam(exam.id).length;
                  const studied = Math.min(studiedCounts[exam.id] ?? 0, total);
                  const dueCount = dueCounts[exam.id] ?? 0;
                  const progress = total === 0 ? 0 : studied / total;
                  const { accent, soft: softAccent } = accentByIndex(
                    theme,
                    listIndex,
                  );

                  return (
                    <RevealView
                      key={exam.id}
                      delay={stagger(listIndex + 5, 45)}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${exam.title} 맞춤 학습 구성`}
                        onPress={() => openSessionBuilder(exam.id)}
                      >
                        <ThemedView
                          type="backgroundElement"
                          style={styles.examCard}
                        >
                          <View style={styles.examRow}>
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
                              <View style={styles.examTitleRow}>
                                <ThemedText
                                  type="smallBold"
                                  style={styles.examTitle}
                                >
                                  {exam.title}
                                </ThemedText>
                                {dueCount > 0 && (
                                  <View
                                    style={[
                                      styles.miniBadge,
                                      { backgroundColor: theme.dangerSoft },
                                    ]}
                                  >
                                    <ThemedText
                                      type="smallBold"
                                      style={{ color: theme.danger }}
                                    >
                                      복습 {dueCount}
                                    </ThemedText>
                                  </View>
                                )}
                              </View>
                              <ThemedText
                                type="small"
                                themeColor="textSecondary"
                                numberOfLines={1}
                              >
                                {exam.description}
                              </ThemedText>
                            </View>
                          </View>

                          <View style={styles.progressMeta}>
                            <ThemedText type="small" themeColor="textSecondary">
                              문제은행 학습률
                            </ThemedText>
                            <ThemedText
                              type="smallBold"
                              style={{ color: accent }}
                            >
                              {studied}/{total}
                            </ThemedText>
                          </View>
                          <AnimatedProgressBar
                            progress={progress}
                            height={7}
                            color={accent}
                            trackColor={softAccent}
                          />
                          <View style={styles.customizeHint}>
                            <SymbolView
                              tintColor={accent}
                              name={{
                                ios: "slider.horizontal.3",
                                android: "tune",
                                web: "tune",
                              }}
                              size={16}
                            />
                            <ThemedText
                              type="smallBold"
                              style={{ color: accent }}
                            >
                              과목·문제 수 맞춤 설정
                            </ThemedText>
                            <SymbolView
                              tintColor={accent}
                              name={{
                                ios: "chevron.right",
                                android: "chevron_right",
                                web: "chevron_right",
                              }}
                              size={16}
                            />
                          </View>
                        </ThemedView>
                      </Pressable>
                    </RevealView>
                  );
                })}
              </View>
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="준비할 시험 추가"
                onPress={() => router.push("/catalog")}
              >
                <ThemedView
                  type="backgroundElement"
                  style={styles.emptyExamCard}
                >
                  <View
                    style={[
                      styles.emptyExamIcon,
                      { backgroundColor: theme.primarySoft },
                    ]}
                  >
                    <SymbolView
                      tintColor={theme.primary}
                      name={{
                        ios: "plus.circle.fill",
                        android: "add_circle",
                        web: "add_circle",
                      }}
                      size={27}
                    />
                  </View>
                  <View style={styles.examTexts}>
                    <ThemedText type="smallBold">
                      준비할 시험을 추가해 주세요
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      내 시험에 담으면 학습률과 복습 일정을 바로 관리할 수
                      있어요.
                    </ThemedText>
                  </View>
                  <SymbolView
                    tintColor={theme.primary}
                    name={{
                      ios: "chevron.right",
                      android: "chevron_right",
                      web: "chevron_right",
                    }}
                    size={18}
                  />
                </ThemedView>
              </Pressable>
            )}
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
    gap: Spacing.two,
  },
  iconButton: {
    position: "relative",
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: Radius.medium,
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
    color: "#FFFFFF",
    fontSize: 10,
    lineHeight: 12,
    fontWeight: 700,
  },
  goalWrapper: {
    position: "relative",
  },
  goalCard: {
    position: "relative",
    overflow: "hidden",
    gap: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    borderColor: Alpha.onPrimarySurface,
    borderRadius: Radius.large,
  },
  streakRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  goalText: {
    flex: 1,
    gap: Spacing.one,
  },
  goalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 26,
    fontWeight: 700,
  },
  goalStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  goalStatItem: {
    flex: 1,
    alignItems: "flex-start",
    paddingLeft: Spacing.three,
    gap: Spacing.half,
  },
  goalStatValue: {
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 32,
    fontWeight: 600,
  },
  goalDivider: {
    width: 1,
    height: 28,
    backgroundColor: Alpha.onPrimaryDivider,
  },
  continueCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
    borderColor: Alpha.hairline,
    ...Shadows.card,
  },
  continueIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  continueText: {
    flex: 1,
    gap: Spacing.half,
  },
  dueBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  manageButton: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: 800,
  },
  examList: {
    gap: Spacing.three,
  },
  emptyExamCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  emptyExamIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  examCard: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  examRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  examIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  examIconText: {
    fontSize: 22,
    lineHeight: 29,
  },
  examTexts: {
    flex: 1,
    gap: Spacing.one,
  },
  examTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  examTitle: {
    flex: 1,
  },
  miniBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  progressMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  customizeHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: Spacing.one,
  },
  footerText: {
    textAlign: "center",
    paddingTop: Spacing.two,
  },
  pressed: {
    opacity: 0.68,
  },
});
