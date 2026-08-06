import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import type { SymbolViewProps } from "expo-symbols";
import { useMemo, useState } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { SkeletonBlock } from "@/components/motion/skeleton-block";
import { PageHead } from "@/components/page-head";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Radius, Shadows, Spacing } from "@/constants/theme";
import { useCustomSessionPresets } from "@/hooks/use-custom-session-presets";
import { useExamCatalog } from "@/hooks/use-exam-catalog";
import { useLearningReport } from "@/hooks/use-learning-report";
import { useSettings } from "@/hooks/use-settings";
import { useTheme } from "@/hooks/use-theme";
import {
  CustomSessionStrategy,
  selectCustomSessionQuestions,
} from "@/learning/custom-session";
import type { QuizMode } from "@/types/exam";

const QUESTION_COUNT_OPTIONS = [5, 10, 20] as const;
type CustomSessionMode = Extract<QuizMode, "learn" | "mock">;

interface SelectionCardProps {
  icon: SymbolViewProps["name"];
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
}

// 맞춤 세션 선택 카드
function SelectionCard({
  icon,
  title,
  description,
  selected,
  onPress,
}: SelectionCardProps) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`${title}, ${description}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.selectionCard,
        {
          backgroundColor: selected
            ? theme.primarySoft
            : theme.backgroundElement,
          borderColor: selected ? theme.primary : theme.border,
        },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.selectionIcon,
          {
            backgroundColor: selected
              ? theme.primary
              : theme.backgroundSelected,
          },
        ]}
      >
        <SymbolView
          tintColor={selected ? theme.onPrimary : theme.textSecondary}
          name={icon}
          size={20}
        />
      </View>
      <View style={styles.selectionCopy}>
        <ThemedText
          type="smallBold"
          style={{ color: selected ? theme.primary : theme.text }}
        >
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {description}
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
}

// 맞춤 세션 예상 시간 표시
function formatEstimatedMinutes(
  questionCount: number,
  mode: CustomSessionMode,
): string {
  const secondsPerQuestion = mode === "mock" ? 60 : 45;
  return `약 ${Math.max(Math.ceil((questionCount * secondsPerQuestion) / 60), 1)}분`;
}

// 맞춤 학습 세션 구성 화면
export default function SessionBuilderScreen() {
  const params = useLocalSearchParams<{
    examId: string;
    intent?: "diagnostic";
  }>();
  const { findExam, selectQuestionsByExam, isLoading } = useExamCatalog();
  const { performance } = useLearningReport();
  const { settings } = useSettings();
  const { presets, savePreset } = useCustomSessionPresets();
  const theme = useTheme();
  const exam = findExam(params.examId);
  const questions = useMemo(
    () => selectQuestionsByExam(params.examId),
    [params.examId, selectQuestionsByExam],
  );
  const availableSubjects = useMemo(
    () => [...new Set(questions.map((question) => question.subject))],
    [questions],
  );
  const [excludedSubjects, setExcludedSubjects] = useState<string[]>([]);
  const [mode, setMode] = useState<CustomSessionMode>("learn");
  const [strategy, setStrategy] = useState<CustomSessionStrategy>("balanced");
  const [requestedCount, setRequestedCount] = useState(settings.sessionSize);
  const selectedSubjects = availableSubjects.filter(
    (subject) => !excludedSubjects.includes(subject),
  );
  const availableQuestionCount = questions.filter((question) =>
    selectedSubjects.includes(question.subject),
  ).length;
  const countOptions = [
    ...new Set(
      [...QUESTION_COUNT_OPTIONS, availableQuestionCount].filter(
        (count) => count > 0 && count <= availableQuestionCount,
      ),
    ),
  ].sort((left, right) => left - right);
  const questionCount = Math.min(requestedCount, availableQuestionCount);
  const canStart = selectedSubjects.length > 0 && questionCount > 0;
  const diagnosticQuestionCount = Math.min(10, questions.length);
  const savedPreset = presets[params.examId];
  const isCurrentRoutineSaved =
    savedPreset != null &&
    savedPreset.mode === mode &&
    savedPreset.strategy === strategy &&
    savedPreset.questionCount === questionCount &&
    savedPreset.selectedSubjects.length === selectedSubjects.length &&
    selectedSubjects.every((subject) =>
      savedPreset.selectedSubjects.includes(subject),
    );

  // 과목 선택 상태 전환
  const toggleSubject = (subject: string) => {
    setExcludedSubjects((current) =>
      current.includes(subject)
        ? current.filter((item) => item !== subject)
        : [...current, subject],
    );
  };

  // 선택 조건 기반 맞춤 세션 시작
  const startSession = () => {
    if (!canStart) return;
    const selectedQuestions = selectCustomSessionQuestions({
      questions,
      selectedSubjects,
      performance,
      count: questionCount,
      strategy,
    });
    router.push({
      pathname: "/quiz/[examId]",
      params: {
        examId: params.examId,
        mode,
        questionIds: selectedQuestions.map((question) => question.id).join(","),
      },
    });
  };

  // 과목 균형형 빠른 진단 시작
  const startDiagnostic = () => {
    if (diagnosticQuestionCount === 0) return;
    const selectedQuestions = selectCustomSessionQuestions({
      questions,
      selectedSubjects: availableSubjects,
      performance,
      count: diagnosticQuestionCount,
      strategy: "balanced",
    });
    router.push({
      pathname: "/quiz/[examId]",
      params: {
        examId: params.examId,
        mode: "mock",
        diagnostic: "true",
        questionIds: selectedQuestions.map((question) => question.id).join(","),
      },
    });
  };

  // 저장 학습 루틴 현재 구성에 적용
  const applySavedRoutine = () => {
    if (savedPreset == null) return;
    const storedSubjects = savedPreset.selectedSubjects.filter((subject) =>
      availableSubjects.includes(subject),
    );
    const appliedSubjects =
      storedSubjects.length > 0 ? storedSubjects : availableSubjects;
    setExcludedSubjects(
      availableSubjects.filter((subject) => !appliedSubjects.includes(subject)),
    );
    setMode(savedPreset.mode);
    setStrategy(savedPreset.strategy);
    setRequestedCount(savedPreset.questionCount);
  };

  // 현재 맞춤 조건 학습 루틴 저장
  const saveCurrentRoutine = () => {
    if (!canStart) return;
    void savePreset({
      examId: params.examId,
      selectedSubjects,
      questionCount,
      mode,
      strategy,
    });
  };

  if (isLoading) {
    return (
      <ThemedView style={styles.container}>
        <PageHead
          title="학습 세션 구성"
          noIndex
        />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContent}>
            <SkeletonBlock width="55%" height={22} />
            <SkeletonBlock height={92} radius={Radius.medium} />
            <SkeletonBlock height={140} radius={Radius.medium} />
            <SkeletonBlock height={120} radius={Radius.medium} />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (exam == null) {
    return (
      <ThemedView style={styles.centerContainer}>
        <ThemedText type="subtitle">시험을 찾을 수 없어요</ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={() => goBack()}
          style={[styles.fallbackButton, { backgroundColor: theme.primary }]}
        >
          <ThemedText type="smallBold" style={styles.primaryText}>
            돌아가기
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <PageHead
        title="학습 세션 구성"
        noIndex
      />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
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
          <View style={styles.headerCopy}>
            <ThemedText type="smallBold">맞춤 학습 만들기</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {exam.shortTitle}
            </ThemedText>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeInDown.duration(320)}
            style={[styles.hero, { backgroundColor: theme.primary }]}
          >
            <View>
              <ThemedText style={styles.heroEmoji}>{exam.icon}</ThemedText>
              <ThemedText type="subtitle" style={styles.heroTitle}>
                오늘 무엇에 집중할까요?
              </ThemedText>
              <ThemedText type="small" style={styles.heroDescription}>
                필요한 범위만 골라 한 세션으로 바로 시작하세요.
              </ThemedText>
            </View>
            <View style={styles.heroBadge}>
              <ThemedText type="smallBold" style={styles.primaryText}>
                {questionCount > 0
                  ? `${questionCount}문제 · ${formatEstimatedMinutes(questionCount, mode)}`
                  : "과목 선택 필요"}
              </ThemedText>
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.delay(50).duration(320)}>
            <ThemedView
              type="backgroundElement"
              style={[
                styles.diagnosticCard,
                params.intent === "diagnostic" && {
                  borderColor: theme.primary,
                },
              ]}
            >
              <View
                style={[
                  styles.diagnosticIcon,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <SymbolView
                  tintColor={theme.primary}
                  name={{
                    ios: "gauge.with.dots.needle.67percent",
                    android: "speed",
                    web: "speed",
                  }}
                  size={25}
                />
              </View>
              <View style={styles.diagnosticCopy}>
                <View style={styles.diagnosticTitleRow}>
                  <ThemedText type="smallBold">처음이라면 빠른 진단</ThemedText>
                  <View
                    style={[
                      styles.recommendedBadge,
                      { backgroundColor: theme.successSoft },
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{ color: theme.success }}
                    >
                      추천
                    </ThemedText>
                  </View>
                </View>
                <ThemedText type="small" themeColor="textSecondary">
                  과목을 고르게 섞은 {diagnosticQuestionCount}문제로 현재
                  시작점과 우선 학습 과목을 찾아드려요.
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${exam.shortTitle} 빠른 진단 시작`}
                accessibilityState={{
                  disabled: diagnosticQuestionCount === 0,
                }}
                disabled={diagnosticQuestionCount === 0}
                onPress={startDiagnostic}
                style={({ pressed }) => [
                  styles.diagnosticButton,
                  { backgroundColor: theme.primary },
                  diagnosticQuestionCount === 0 && styles.disabled,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={styles.primaryText}>
                  진단 시작
                </ThemedText>
              </Pressable>
            </ThemedView>
          </Animated.View>

          {savedPreset != null && (
            <ThemedView
              type="backgroundElement"
              style={[styles.savedRoutine, { borderColor: theme.border }]}
            >
              <View
                style={[
                  styles.savedRoutineIcon,
                  { backgroundColor: theme.successSoft },
                ]}
              >
                <SymbolView
                  tintColor={theme.success}
                  name={{ ios: "bolt.fill", android: "bolt", web: "bolt" }}
                  size={21}
                />
              </View>
              <View style={styles.savedRoutineCopy}>
                <ThemedText type="smallBold">저장된 학습 루틴</ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={1}
                >
                  {savedPreset.selectedSubjects.join(" · ")} ·{" "}
                  {savedPreset.questionCount}문제
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="저장된 학습 루틴 불러오기"
                onPress={applySavedRoutine}
                style={({ pressed }) => [
                  styles.loadRoutineButton,
                  { backgroundColor: theme.successSoft },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.success }}>
                  불러오기
                </ThemedText>
              </Pressable>
            </ThemedView>
          )}

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <ThemedText style={styles.sectionTitle}>과목</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  여러 과목을 함께 선택할 수 있어요
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => setExcludedSubjects([])}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  전체 선택
                </ThemedText>
              </Pressable>
            </View>
            <View style={styles.chipList}>
              {availableSubjects.map((subject) => {
                const selected = selectedSubjects.includes(subject);
                const stat = performance.bySubject[`${exam.id}:${subject}`];
                const accuracy =
                  stat == null || stat.answered === 0
                    ? null
                    : Math.round((stat.correct / stat.answered) * 100);
                return (
                  <Pressable
                    key={subject}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${subject}${accuracy == null ? "" : `, 누적 정답률 ${accuracy}%`}`}
                    onPress={() => toggleSubject(subject)}
                    style={({ pressed }) => [
                      styles.subjectChip,
                      {
                        backgroundColor: selected
                          ? theme.primarySoft
                          : theme.backgroundElement,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <SymbolView
                      tintColor={selected ? theme.primary : theme.textSecondary}
                      name={{
                        ios: selected ? "checkmark.circle.fill" : "circle",
                        android: selected
                          ? "check_circle"
                          : "radio_button_unchecked",
                        web: selected
                          ? "check_circle"
                          : "radio_button_unchecked",
                      }}
                      size={18}
                    />
                    <View>
                      <ThemedText type="smallBold">{subject}</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {accuracy == null
                          ? "아직 학습 전"
                          : `정답률 ${accuracy}%`}
                      </ThemedText>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <View>
              <ThemedText style={styles.sectionTitle}>문제 수</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                선택 과목에서 {availableQuestionCount}문제 이용 가능
              </ThemedText>
            </View>
            <View style={styles.optionRow}>
              {countOptions.map((count) => {
                const selected = questionCount === count;
                return (
                  <Pressable
                    key={count}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => setRequestedCount(count)}
                    style={({ pressed }) => [
                      styles.countOption,
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
                      style={{ color: selected ? theme.onPrimary : theme.text }}
                    >
                      {count === availableQuestionCount ? "전체" : count}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <View>
              <ThemedText style={styles.sectionTitle}>진행 방식</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                피드백 시점을 선택하세요
              </ThemedText>
            </View>
            <View accessibilityRole="radiogroup" style={styles.cardList}>
              <SelectionCard
                icon={{
                  ios: "lightbulb.fill",
                  android: "lightbulb",
                  web: "lightbulb",
                }}
                title="바로 학습"
                description="문제마다 정답과 해설 확인"
                selected={mode === "learn"}
                onPress={() => setMode("learn")}
              />
              <SelectionCard
                icon={{
                  ios: "timer",
                  android: "timer",
                  web: "timer",
                }}
                title="모의고사"
                description="끝까지 푼 뒤 한 번에 채점"
                selected={mode === "mock"}
                onPress={() => setMode("mock")}
              />
            </View>
          </View>

          <View style={styles.section}>
            <View>
              <ThemedText style={styles.sectionTitle}>출제 전략</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                문제를 고르는 기준을 정하세요
              </ThemedText>
            </View>
            <View accessibilityRole="radiogroup" style={styles.cardList}>
              <SelectionCard
                icon={{
                  ios: "square.grid.2x2.fill",
                  android: "grid_view",
                  web: "grid_view",
                }}
                title="과목 균형"
                description="선택한 과목을 고르게 배치"
                selected={strategy === "balanced"}
                onPress={() => setStrategy("balanced")}
              />
              <SelectionCard
                icon={{
                  ios: "scope",
                  android: "center_focus_strong",
                  web: "center_focus_strong",
                }}
                title="취약 우선"
                description="정답률이 낮은 과목부터 집중"
                selected={strategy === "weakness"}
                onPress={() => setStrategy("weakness")}
              />
              <SelectionCard
                icon={{
                  ios: "shuffle",
                  android: "shuffle",
                  web: "shuffle",
                }}
                title="랜덤"
                description="선택 범위에서 매번 새롭게 구성"
                selected={strategy === "random"}
                onPress={() => setStrategy("random")}
              />
            </View>
          </View>
        </ScrollView>

        <ThemedView
          type="backgroundElement"
          style={[styles.footer, { borderColor: theme.border }]}
        >
          <View style={styles.footerSummary}>
            <ThemedText type="smallBold">
              {selectedSubjects.length}과목 · {questionCount}문제
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {mode === "mock" ? "모의고사" : "바로 학습"} ·{" "}
              {strategy === "balanced"
                ? "과목 균형"
                : strategy === "weakness"
                  ? "취약 우선"
                  : "랜덤"}
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              isCurrentRoutineSaved
                ? "현재 구성이 학습 루틴으로 저장됨"
                : "현재 구성을 학습 루틴으로 저장"
            }
            accessibilityState={{ disabled: !canStart }}
            disabled={!canStart}
            onPress={saveCurrentRoutine}
            style={({ pressed }) => [
              styles.saveRoutineButton,
              {
                backgroundColor: isCurrentRoutineSaved
                  ? theme.successSoft
                  : theme.backgroundSelected,
              },
              !canStart && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              tintColor={
                isCurrentRoutineSaved ? theme.success : theme.textSecondary
              }
              name={{
                ios: isCurrentRoutineSaved
                  ? "checkmark.circle.fill"
                  : "bookmark",
                android: isCurrentRoutineSaved
                  ? "check_circle"
                  : "bookmark_border",
                web: isCurrentRoutineSaved ? "check_circle" : "bookmark_border",
              }}
              size={20}
            />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: !canStart }}
            disabled={!canStart}
            onPress={startSession}
            style={({ pressed }) => [
              styles.startButton,
              { backgroundColor: theme.primary },
              !canStart && styles.disabled,
              pressed && styles.startPressed,
            ]}
          >
            <ThemedText type="smallBold" style={styles.primaryText}>
              세션 시작
            </ThemedText>
            <SymbolView
              tintColor={theme.onPrimary}
              name={{
                ios: "arrow.right",
                android: "arrow_forward",
                web: "arrow_forward",
              }}
              size={18}
            />
          </Pressable>
        </ThemedView>
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
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    padding: Spacing.four,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  headerCopy: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.half,
  },
  headerSpacer: {
    width: 42,
  },
  content: {
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six + Spacing.six,
  },
  loadingContent: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
  },
  hero: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  heroEmoji: {
    fontSize: 27,
    lineHeight: 36,
    marginBottom: Spacing.two,
  },
  heroTitle: {
    color: "#FFFFFF",
  },
  heroDescription: {
    color: "rgba(255, 255, 255, 0.76)",
    marginTop: Spacing.one,
  },
  heroBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  section: {
    gap: Spacing.three,
  },
  savedRoutine: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  savedRoutineIcon: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  savedRoutineCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  loadRoutineButton: {
    minHeight: 36,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.small,
  },
  diagnosticCard: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderColor: "transparent",
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  diagnosticIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  diagnosticCopy: {
    minWidth: 180,
    flex: 1,
    gap: Spacing.one,
  },
  diagnosticTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  recommendedBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  diagnosticButton: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: 800,
  },
  chipList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  subjectChip: {
    minWidth: 132,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  optionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  countOption: {
    minWidth: 70,
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.pill,
  },
  cardList: {
    gap: Spacing.two,
  },
  selectionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    minHeight: 72,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  selectionIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  selectionCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Platform.OS === "ios" ? Spacing.four : Spacing.three,
    borderTopWidth: 1,
  },
  footerSummary: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  startButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.medium,
  },
  saveRoutineButton: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  fallbackButton: {
    minHeight: 46,
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.medium,
  },
  primaryText: {
    color: "#FFFFFF",
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.8,
  },
  startPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
});
