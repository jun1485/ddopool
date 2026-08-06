import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { AnimatedProgressBar } from "@/components/motion/animated-progress-bar";
import { RevealView } from "@/components/motion/reveal-view";
import { SkeletonBlock } from "@/components/motion/skeleton-block";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { SubjectMasteryMap } from "@/components/subject-mastery-map";
import type { SubjectMasteryExamItem } from "@/components/subject-mastery-map";
import { PageHead } from "@/components/page-head";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { stagger } from "@/constants/motion";
import {
  Alpha,
  MaxContentWidth,
  Radius,
  Shadows,
  Spacing,
} from "@/constants/theme";
import { useAchievements } from "@/hooks/use-achievements";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useDailyStats } from "@/hooks/use-daily-stats";
import { useExamCatalog } from "@/hooks/use-exam-catalog";
import { useExamEnrollment } from "@/hooks/use-exam-enrollment";
import { useLearningReport } from "@/hooks/use-learning-report";
import { useSrsSummary } from "@/hooks/use-srs-summary";
import { useSubjectMastery } from "@/hooks/use-subject-mastery";
import { useTheme } from "@/hooks/use-theme";
import { useWrongAnswerNotes } from "@/hooks/use-wrong-answer-notes";
import type { AchievementId } from "@/learning/achievements";
import {
  calculateLearningProgression,
  createLevelMilestones,
} from "@/learning/progression";
import type { SubjectMastery } from "@/learning/subject-mastery";

// 과목 추천 학습 세션 진입
function startSubjectMasterySession(mastery: SubjectMastery) {
  router.push({
    pathname: "/quiz/[examId]",
    params: {
      examId: "all",
      mode: mastery.recommendation === "review" ? "review" : "learn",
      questionIds: mastery.recommendedQuestionIds.join(","),
    },
  });
}

// 레벨·업적 진행 화면
export default function ProgressScreen() {
  const {
    lifetime,
    performance,
    isLoading: isReportLoading,
  } = useLearningReport();
  const { streak, isLoading: isDailyLoading } = useDailyStats();
  const { bookmarkedQuestionIds, isLoading: isBookmarksLoading } =
    useBookmarks();
  const { examIds, isLoading: isEnrollmentLoading } = useExamEnrollment();
  const { totalStudied, isLoading: isSrsLoading } = useSrsSummary();
  const { exams, questions, isLoading: isCatalogLoading } = useExamCatalog();
  const { unresolvedNotes, isLoading: isWrongAnswersLoading } =
    useWrongAnswerNotes();
  const unresolvedQuestionIds = useMemo(
    () => unresolvedNotes.map((note) => note.questionId),
    [unresolvedNotes],
  );
  const { masteries, isLoading: isMasteryLoading } = useSubjectMastery({
    questions,
    enrolledExamIds: examIds,
    performance,
    unresolvedQuestionIds,
  });
  const masteryItems = useMemo<SubjectMasteryExamItem[]>(
    () =>
      exams
        .filter((exam) => examIds.includes(exam.id))
        .map((exam) => ({
          exam,
          subjects: masteries.filter((mastery) => mastery.examId === exam.id),
        }))
        .filter((item) => item.subjects.length > 0),
    [examIds, exams, masteries],
  );
  const [selectedAchievementId, setSelectedAchievementId] =
    useState<AchievementId | null>(null);
  const theme = useTheme();
  const metrics = useMemo(
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
  const {
    achievements,
    unlockedCount,
    isLoading: isAchievementsLoading,
  } = useAchievements(metrics);
  const progression = calculateLearningProgression(lifetime);
  const levelMilestones = createLevelMilestones(progression);
  const selectedAchievement =
    achievements.find(
      (achievement) => achievement.id === selectedAchievementId,
    ) ??
    achievements.find((achievement) => !achievement.unlocked) ??
    achievements.at(-1);
  const accuracy =
    lifetime.answered === 0
      ? 0
      : Math.round((lifetime.correct / lifetime.answered) * 100);
  const isLoading =
    isReportLoading ||
    isDailyLoading ||
    isBookmarksLoading ||
    isEnrollmentLoading ||
    isSrsLoading ||
    isCatalogLoading ||
    isWrongAnswersLoading ||
    isMasteryLoading ||
    isAchievementsLoading;

  return (
    <ThemedView style={styles.container}>
      <PageHead
        title="학습 진행"
        description="시험별 진도와 목표 달성률 확인."
      />
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
            <ThemedText type="smallBold">나의 성장</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              레벨·XP·업적·과목 숙련도
            </ThemedText>
          </View>
          <View style={styles.iconButton} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <Animated.View entering={FadeInDown.duration(320)}>
            <View style={[styles.hero, { backgroundColor: theme.primary }]}>
              <View
                style={[styles.heroOrb, { backgroundColor: theme.onPrimary }]}
              />
              <View style={styles.heroHeader}>
                <View style={styles.levelMark}>
                  <ThemedText style={styles.levelCaption}>LEVEL</ThemedText>
                  <ThemedText style={styles.levelNumber}>
                    {progression.level}
                  </ThemedText>
                </View>
                <View style={styles.heroCopy}>
                  <ThemedText type="small" style={styles.onPrimaryMuted}>
                    누적 학습 경험치
                  </ThemedText>
                  <ThemedText style={styles.xpTitle}>
                    {progression.totalXp.toLocaleString()} XP
                  </ThemedText>
                  <ThemedText type="small" style={styles.onPrimaryMuted}>
                    다음 레벨까지{" "}
                    {Math.max(
                      progression.nextLevelXp - progression.totalXp,
                      0,
                    ).toLocaleString()}{" "}
                    XP
                  </ThemedText>
                </View>
              </View>
              <AnimatedProgressBar
                progress={progression.levelProgress}
                height={9}
                color="#FFFFFF"
                trackColor={Alpha.onPrimaryTrack}
              />
            </View>
          </Animated.View>

          <View style={styles.statRow}>
            <ThemedView type="backgroundElement" style={styles.statCard}>
              <ThemedText style={styles.statEmoji}>🔥</ThemedText>
              <ThemedText type="smallBold">{streak}일</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                연속 학습
              </ThemedText>
            </ThemedView>
            <ThemedView type="backgroundElement" style={styles.statCard}>
              <ThemedText style={styles.statEmoji}>🎯</ThemedText>
              <ThemedText type="smallBold">{accuracy}%</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                누적 정답률
              </ThemedText>
            </ThemedView>
            <ThemedView type="backgroundElement" style={styles.statCard}>
              <ThemedText style={styles.statEmoji}>🏅</ThemedText>
              <ThemedText type="smallBold">
                {unlockedCount}/{achievements.length}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                해제 업적
              </ThemedText>
            </ThemedView>
          </View>

          <SubjectMasteryMap
            items={masteryItems}
            isLoading={isMasteryLoading || isCatalogLoading}
            onStart={startSubjectMasterySession}
            onOpenCatalog={() => router.push("/catalog")}
          />

          <View style={styles.section}>
            <View>
              <ThemedText style={styles.sectionTitle}>레벨 여정</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                문제를 풀고 XP를 모아 다음 구간으로 이동해요
              </ThemedText>
            </View>
            <ThemedView type="backgroundElement" style={styles.levelCard}>
              <View
                style={[
                  styles.levelJourneyLine,
                  { backgroundColor: theme.border },
                ]}
              />
              {levelMilestones.map((milestone) => (
                <View key={milestone.level} style={styles.milestone}>
                  <View
                    style={[
                      styles.milestoneDot,
                      {
                        backgroundColor: milestone.unlocked
                          ? theme.primary
                          : theme.backgroundSelected,
                        borderColor: milestone.current
                          ? theme.warning
                          : theme.backgroundElement,
                      },
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{
                        color: milestone.unlocked
                          ? theme.onPrimary
                          : theme.textSecondary,
                      }}
                    >
                      {milestone.level}
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="small"
                    style={{
                      color: milestone.current
                        ? theme.warning
                        : theme.textSecondary,
                    }}
                  >
                    {milestone.requiredXp}
                  </ThemedText>
                </View>
              ))}
            </ThemedView>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <ThemedText style={styles.sectionTitle}>업적 배지</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  달성한 배지는 계속 보관돼요
                </ThemedText>
              </View>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {unlockedCount} 해제
                </ThemedText>
              </View>
            </View>

            {isLoading ? (
              <View style={styles.achievementGrid}>
                {[0, 1, 2, 3].map((placeholderIndex) => (
                  <View key={placeholderIndex} style={styles.achievementCell}>
                    <SkeletonBlock height={124} radius={Radius.medium} />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.achievementGrid}>
                {achievements.map((achievement, index) => {
                  const selected = achievement.id === selectedAchievement?.id;
                  return (
                    <RevealView
                      key={achievement.id}
                      variant="zoom"
                      delay={stagger(index, 35)}
                      style={styles.achievementCell}
                    >
                      <Pressable
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        accessibilityLabel={`${achievement.title}, ${
                          achievement.unlocked ? "해제됨" : "진행 중"
                        }`}
                        onPress={() => setSelectedAchievementId(achievement.id)}
                        style={({ pressed }) => [
                          styles.achievementCard,
                          {
                            backgroundColor: achievement.unlocked
                              ? theme.backgroundElement
                              : theme.backgroundSelected,
                            borderColor: selected
                              ? theme.primary
                              : achievement.unlocked
                                ? theme.successSoft
                                : theme.border,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <View
                          style={[
                            styles.achievementIcon,
                            {
                              backgroundColor: achievement.unlocked
                                ? theme.successSoft
                                : theme.background,
                            },
                          ]}
                        >
                          <ThemedText
                            style={[
                              styles.achievementEmoji,
                              !achievement.unlocked && styles.locked,
                            ]}
                          >
                            {achievement.icon}
                          </ThemedText>
                        </View>
                        <View style={styles.achievementCopy}>
                          <ThemedText type="smallBold" numberOfLines={1}>
                            {achievement.title}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {achievement.unlocked
                              ? "달성 완료"
                              : `${achievement.progress}/${achievement.target}`}
                          </ThemedText>
                        </View>
                        {achievement.unlocked && (
                          <View
                            style={[
                              styles.checkMark,
                              { backgroundColor: theme.success },
                            ]}
                          >
                            <ThemedText style={styles.checkText}>✓</ThemedText>
                          </View>
                        )}
                      </Pressable>
                    </RevealView>
                  );
                })}
              </View>
            )}
          </View>

          {selectedAchievement != null && (
            <ThemedView
              type="backgroundElement"
              style={[
                styles.detailCard,
                {
                  borderColor: selectedAchievement.unlocked
                    ? theme.success
                    : theme.primary,
                },
              ]}
            >
              <View style={styles.detailHeader}>
                <View
                  style={[
                    styles.detailIcon,
                    {
                      backgroundColor: selectedAchievement.unlocked
                        ? theme.successSoft
                        : theme.primarySoft,
                    },
                  ]}
                >
                  <ThemedText style={styles.detailEmoji}>
                    {selectedAchievement.icon}
                  </ThemedText>
                </View>
                <View style={styles.detailCopy}>
                  <ThemedText type="smallBold">
                    {selectedAchievement.unlocked
                      ? `${selectedAchievement.title} 달성!`
                      : `다음 목표 · ${selectedAchievement.title}`}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {selectedAchievement.description}
                  </ThemedText>
                </View>
                <ThemedText
                  type="smallBold"
                  style={{
                    color: selectedAchievement.unlocked
                      ? theme.success
                      : theme.primary,
                  }}
                >
                  {selectedAchievement.progress}/{selectedAchievement.target}
                </ThemedText>
              </View>
              <AnimatedProgressBar
                progress={((selectedAchievement.progress /
                          selectedAchievement.target) *
                        100) / 100}
                height={7}
                color={selectedAchievement.unlocked ? theme.success : theme.primary}
                trackColor={theme.backgroundSelected}
              />
            </ThemedView>
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
    gap: Spacing.four,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  heroOrb: {
    position: "absolute",
    width: 190,
    height: 190,
    right: -55,
    top: -90,
    opacity: 0.09,
    borderRadius: 95,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.four,
  },
  levelMark: {
    width: 82,
    height: 82,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "rgba(255, 255, 255, 0.38)",
    borderRadius: Radius.large,
    backgroundColor: "rgba(255, 255, 255, 0.13)",
  },
  levelCaption: {
    color: "rgba(255, 255, 255, 0.72)",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: 800,
    letterSpacing: 1.2,
  },
  levelNumber: {
    color: "#FFFFFF",
    fontSize: 33,
    lineHeight: 38,
    fontWeight: 900,
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  xpTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    lineHeight: 34,
    fontWeight: 900,
  },
  onPrimaryMuted: {
    color: "rgba(255, 255, 255, 0.76)",
  },
  statRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.half,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.three,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  statEmoji: {
    fontSize: 21,
    lineHeight: 28,
  },
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: 800,
  },
  countBadge: {
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  levelCard: {
    position: "relative",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  levelJourneyLine: {
    position: "absolute",
    top: Spacing.four + 21,
    left: Spacing.four,
    right: Spacing.four,
    height: 2,
  },
  milestone: {
    zIndex: 1,
    alignItems: "center",
    gap: Spacing.one,
  },
  milestoneDot: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderRadius: Radius.pill,
  },
  achievementGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  achievementCell: {
    minWidth: 150,
    flexBasis: "48%",
    flexGrow: 1,
  },
  achievementCard: {
    minHeight: 88,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.twoHalf,
    borderWidth: 1,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  achievementIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  achievementEmoji: {
    fontSize: 23,
    lineHeight: 30,
  },
  locked: {
    opacity: 0.28,
  },
  achievementCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  checkMark: {
    position: "absolute",
    top: Spacing.one,
    right: Spacing.one,
    width: 19,
    height: 19,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.pill,
  },
  checkText: {
    color: "#FFFFFF",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: 900,
  },
  loadingCard: {
    alignItems: "center",
    padding: Spacing.five,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  detailCard: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  detailIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  detailEmoji: {
    fontSize: 24,
    lineHeight: 32,
  },
  detailCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.72,
  },
});
