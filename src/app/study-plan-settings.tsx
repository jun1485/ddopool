import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Radius, Shadows, Spacing } from "@/constants/theme";
import { useExamCatalog } from "@/hooks/use-exam-catalog";
import { useExamEnrollment } from "@/hooks/use-exam-enrollment";
import { useSrsSummary } from "@/hooks/use-srs-summary";
import { useStudyTarget } from "@/hooks/use-study-target";
import { useTheme } from "@/hooks/use-theme";
import {
  calculateExamPace,
  createTargetDateKey,
  formatTargetDate,
} from "@/learning/exam-pace";

const TARGET_PERIOD_OPTIONS = [
  { days: 14, label: "2주" },
  { days: 30, label: "1개월" },
  { days: 60, label: "2개월" },
  { days: 90, label: "3개월" },
  { days: 180, label: "6개월" },
] as const;
const STUDY_DAY_OPTIONS = [3, 5, 6, 7] as const;
const TARGET_SCORE_OPTIONS = [60, 70, 80, 90] as const;

// 학습 페이스 상태 문구 생성
function getPaceMessage(status: string): string {
  if (status === "ahead") return "계획보다 빠른 페이스예요";
  if (status === "behind") return "권장량을 조금 높이면 따라잡을 수 있어요";
  if (status === "complete") return "문제은행 전체 학습을 완료했어요";
  if (status === "expired") return "시험일을 새로 설정해 주세요";
  return "현재 계획에 맞춰 잘 진행 중이에요";
}

// 시험 목표·학습 페이스 설정 화면
export default function StudyPlanSettingsScreen() {
  const { exams, questions } = useExamCatalog();
  const { examIds } = useExamEnrollment();
  const { studiedCounts } = useSrsSummary();
  const { target, evaluatedAt, isLoading, updateTarget } = useStudyTarget();
  const [draftExamId, setDraftExamId] = useState<string | null>(null);
  const [draftTargetDate, setDraftTargetDate] = useState<string | null>(null);
  const [draftStudyDays, setDraftStudyDays] = useState<number | null>(null);
  const [draftTargetScore, setDraftTargetScore] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);
  const theme = useTheme();
  const enrolledExams = exams.filter((exam) => examIds.includes(exam.id));
  const storedTargetExamId =
    target != null && examIds.includes(target.examId) ? target.examId : null;
  const activeExamId = draftExamId ?? storedTargetExamId ?? examIds[0] ?? null;
  const activeExam = exams.find((exam) => exam.id === activeExamId);
  const activeStoredTarget = activeExamId === target?.examId ? target : null;
  const activeTargetDate =
    draftTargetDate ??
    activeStoredTarget?.targetDate ??
    (evaluatedAt > 0 ? createTargetDateKey(60, evaluatedAt) : "");
  const activeStudyDays =
    draftStudyDays ?? activeStoredTarget?.studyDaysPerWeek ?? 5;
  const activeTargetScore =
    draftTargetScore ?? activeStoredTarget?.targetScore ?? 80;
  const totalQuestionCount = questions.filter(
    (question) => question.examId === activeExamId,
  ).length;
  const studiedQuestionCount =
    activeExamId == null ? 0 : (studiedCounts[activeExamId] ?? 0);
  const baselineCreatedAt =
    activeStoredTarget != null &&
    activeTargetDate === activeStoredTarget.targetDate
      ? activeStoredTarget.createdAt
      : evaluatedAt;
  const preview =
    activeExamId == null || activeTargetDate === "" || evaluatedAt === 0
      ? null
      : calculateExamPace(
          {
            examId: activeExamId,
            targetDate: activeTargetDate,
            targetScore: activeTargetScore,
            studyDaysPerWeek: activeStudyDays,
            createdAt: baselineCreatedAt,
            startingQuestionCount:
              activeStoredTarget != null &&
              activeTargetDate === activeStoredTarget.targetDate
                ? activeStoredTarget.startingQuestionCount
                : totalQuestionCount,
            startingStudiedCount:
              activeStoredTarget != null &&
              activeTargetDate === activeStoredTarget.targetDate
                ? activeStoredTarget.startingStudiedCount
                : studiedQuestionCount,
          },
          totalQuestionCount,
          studiedQuestionCount,
          evaluatedAt,
        );

  // 목표 시험 선택
  const selectExam = (examId: string) => {
    setDraftExamId(examId);
    setDraftTargetDate(null);
    setDraftStudyDays(null);
    setDraftTargetScore(null);
    setSaved(false);
  };

  // 시험까지의 준비 기간 선택
  const selectTargetPeriod = (days: number) => {
    if (evaluatedAt === 0) return;
    setDraftTargetDate(createTargetDateKey(days, evaluatedAt));
    setSaved(false);
  };

  // 주간 학습 일수 선택
  const selectStudyDays = (days: number) => {
    setDraftStudyDays(days);
    setSaved(false);
  };

  // 모의고사 목표 점수 선택
  const selectTargetScore = (score: number) => {
    setDraftTargetScore(score);
    setSaved(false);
  };

  // 시험 목표·기준 진도 저장
  const saveTarget = async () => {
    if (activeExamId == null || activeTargetDate === "" || evaluatedAt === 0)
      return;
    const preservesBaseline =
      target != null &&
      target.examId === activeExamId &&
      target.targetDate === activeTargetDate;
    await updateTarget({
      examId: activeExamId,
      targetDate: activeTargetDate,
      targetScore: activeTargetScore,
      studyDaysPerWeek: activeStudyDays,
      createdAt: preservesBaseline ? target.createdAt : evaluatedAt,
      startingQuestionCount: preservesBaseline
        ? target.startingQuestionCount
        : totalQuestionCount,
      startingStudiedCount: preservesBaseline
        ? target.startingStudiedCount
        : studiedQuestionCount,
    });
    setSaved(true);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이전 화면"
            onPress={() => router.back()}
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
            <ThemedText type="smallBold">시험일 학습 계획</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              남은 기간에 맞춘 학습량 계산
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
          <View style={styles.intro}>
            <View
              style={[styles.introIcon, { backgroundColor: theme.primarySoft }]}
            >
              <SymbolView
                tintColor={theme.primary}
                name={{
                  ios: "calendar.badge.clock",
                  android: "event_upcoming",
                  web: "event_upcoming",
                }}
                size={27}
              />
            </View>
            <View style={styles.introCopy}>
              <ThemedText type="subtitle">시험일까지 한 걸음씩</ThemedText>
              <ThemedText themeColor="textSecondary">
                준비할 시험과 학습 가능한 요일을 선택하면 하루 권장 문제를
                계산해 드려요.
              </ThemedText>
            </View>
          </View>

          <View style={styles.section}>
            <View>
              <ThemedText style={styles.sectionTitle}>목표 시험</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                오늘의 맞춤 플랜에서 가장 먼저 다룰 시험
              </ThemedText>
            </View>
            <View style={styles.examGrid}>
              {enrolledExams.map((exam) => {
                const selected = exam.id === activeExamId;
                return (
                  <Pressable
                    key={exam.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${exam.title} 목표 선택`}
                    onPress={() => selectExam(exam.id)}
                    style={({ pressed }) => [
                      styles.examCard,
                      {
                        backgroundColor: selected
                          ? theme.primarySoft
                          : theme.backgroundElement,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText style={styles.examEmoji}>
                      {exam.icon}
                    </ThemedText>
                    <View style={styles.examCopy}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {exam.shortTitle}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {studiedCounts[exam.id] ?? 0}/
                        {
                          questions.filter(
                            (question) => question.examId === exam.id,
                          ).length
                        }
                        문제 학습
                      </ThemedText>
                    </View>
                    {selected && (
                      <SymbolView
                        tintColor={theme.primary}
                        name={{
                          ios: "checkmark.circle.fill",
                          android: "check_circle",
                          web: "check_circle",
                        }}
                        size={20}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <View>
              <ThemedText style={styles.sectionTitle}>
                남은 준비 기간
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                오늘을 기준으로 목표 시험일 설정
              </ThemedText>
            </View>
            <View style={styles.optionRow}>
              {TARGET_PERIOD_OPTIONS.map((option) => {
                const optionDate =
                  evaluatedAt === 0
                    ? ""
                    : createTargetDateKey(option.days, evaluatedAt);
                const selected = optionDate === activeTargetDate;
                return (
                  <Pressable
                    key={option.days}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    disabled={isLoading}
                    onPress={() => selectTargetPeriod(option.days)}
                    style={({ pressed }) => [
                      styles.periodOption,
                      {
                        backgroundColor: selected
                          ? theme.primary
                          : theme.backgroundElement,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{
                        color: selected ? theme.onPrimary : theme.text,
                      }}
                    >
                      {option.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
            {activeTargetDate !== "" && (
              <ThemedText type="small" themeColor="textSecondary">
                목표일 · {formatTargetDate(activeTargetDate)}
              </ThemedText>
            )}
          </View>

          <View style={styles.section}>
            <View>
              <ThemedText style={styles.sectionTitle}>목표 점수</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                모의고사 100점 환산 기준으로 도달할 점수 설정
              </ThemedText>
            </View>
            <View style={styles.scoreGrid}>
              {TARGET_SCORE_OPTIONS.map((score) => {
                const selected = score === activeTargetScore;
                return (
                  <Pressable
                    key={score}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`목표 ${score}점`}
                    onPress={() => selectTargetScore(score)}
                    style={({ pressed }) => [
                      styles.scoreOption,
                      {
                        backgroundColor: selected
                          ? theme.primarySoft
                          : theme.backgroundElement,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.scoreOptionValue,
                        {
                          color: selected ? theme.primary : theme.text,
                        },
                      ]}
                    >
                      {score}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      점
                    </ThemedText>
                    {selected && (
                      <SymbolView
                        tintColor={theme.primary}
                        name={{
                          ios: "checkmark.circle.fill",
                          android: "check_circle",
                          web: "check_circle",
                        }}
                        size={17}
                      />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <View>
              <ThemedText style={styles.sectionTitle}>
                주간 학습 일수
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                실제로 공부할 수 있는 날에 맞춰 권장량 조절
              </ThemedText>
            </View>
            <View
              style={[
                styles.daySelector,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              {STUDY_DAY_OPTIONS.map((days) => {
                const selected = days === activeStudyDays;
                return (
                  <Pressable
                    key={days}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`주 ${days}일 학습`}
                    onPress={() => selectStudyDays(days)}
                    style={({ pressed }) => [
                      styles.dayOption,
                      selected && { backgroundColor: theme.primarySoft },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{
                        color: selected ? theme.primary : theme.textSecondary,
                      }}
                    >
                      주 {days}일
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {preview != null && activeExam != null && (
            <View style={[styles.preview, { backgroundColor: theme.primary }]}>
              <View style={styles.previewHeader}>
                <View style={styles.previewCopy}>
                  <ThemedText type="smallBold" style={styles.onPrimaryMuted}>
                    {activeExam.shortTitle} 권장 페이스
                  </ThemedText>
                  <ThemedText style={styles.previewTitle}>
                    하루 {preview.dailyQuestionTarget}문제
                  </ThemedText>
                </View>
                <View style={styles.dDayBadge}>
                  <ThemedText type="smallBold" style={styles.onPrimary}>
                    {preview.daysRemaining === 0
                      ? "D-DAY"
                      : `D-${preview.daysRemaining}`}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.previewStats}>
                <View style={styles.previewStat}>
                  <ThemedText style={styles.previewValue}>
                    {preview.remainingQuestions}
                  </ThemedText>
                  <ThemedText type="small" style={styles.onPrimaryMuted}>
                    남은 문제
                  </ThemedText>
                </View>
                <View style={styles.previewDivider} />
                <View style={styles.previewStat}>
                  <ThemedText style={styles.previewValue}>
                    {activeTargetScore}점
                  </ThemedText>
                  <ThemedText type="small" style={styles.onPrimaryMuted}>
                    목표 점수
                  </ThemedText>
                </View>
                <View style={styles.previewDivider} />
                <View style={styles.previewStat}>
                  <ThemedText style={styles.previewValue}>
                    {Math.round(preview.progress * 100)}%
                  </ThemedText>
                  <ThemedText type="small" style={styles.onPrimaryMuted}>
                    현재 진도
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="small" style={styles.onPrimaryMuted}>
                {getPaceMessage(preview.status)}
              </ThemedText>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="시험일 학습 계획 저장"
            accessibilityState={{ disabled: preview == null }}
            disabled={preview == null}
            onPress={() => void saveTarget()}
            style={({ pressed }) => [
              styles.saveButton,
              {
                backgroundColor:
                  preview == null ? theme.backgroundSelected : theme.primary,
              },
              pressed && styles.savePressed,
            ]}
          >
            <SymbolView
              tintColor={
                preview == null ? theme.textSecondary : theme.onPrimary
              }
              name={{
                ios: saved ? "checkmark.circle.fill" : "calendar.badge.plus",
                android: saved ? "check_circle" : "event_available",
                web: saved ? "check_circle" : "event_available",
              }}
              size={20}
            />
            <ThemedText
              type="smallBold"
              style={{
                color: preview == null ? theme.textSecondary : theme.onPrimary,
              }}
            >
              {saved ? "학습 계획 저장 완료" : "이 계획으로 시작"}
            </ThemedText>
          </Pressable>
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
  intro: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  introIcon: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.large,
  },
  introCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.one,
  },
  section: {
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: 800,
  },
  examGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  examCard: {
    minWidth: 180,
    flexBasis: "48%",
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  examEmoji: {
    fontSize: 24,
    lineHeight: 30,
  },
  examCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  periodOption: {
    minWidth: 64,
    flexGrow: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.twoHalf,
    borderWidth: 1,
    borderRadius: Radius.pill,
  },
  daySelector: {
    flexDirection: "row",
    gap: Spacing.one,
    padding: Spacing.one,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  scoreGrid: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  scoreOption: {
    minWidth: 0,
    flex: 1,
    alignItems: "center",
    gap: Spacing.half,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  scoreOptionValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 900,
  },
  dayOption: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.twoHalf,
    borderRadius: Radius.small,
  },
  preview: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  previewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  previewCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  previewTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    lineHeight: 36,
    fontWeight: 900,
  },
  dDayBadge: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  onPrimary: {
    color: "#FFFFFF",
  },
  onPrimaryMuted: {
    color: "rgba(255, 255, 255, 0.76)",
  },
  previewStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  previewStat: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.half,
  },
  previewValue: {
    color: "#FFFFFF",
    fontSize: 19,
    lineHeight: 26,
    fontWeight: 800,
  },
  previewDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
  },
  saveButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderRadius: Radius.medium,
  },
  pressed: {
    opacity: 0.72,
  },
  savePressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
