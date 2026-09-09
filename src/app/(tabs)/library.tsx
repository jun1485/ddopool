import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TextInput, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { AnimatedChip } from "@/components/motion/animated-chip";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { PageHead } from "@/components/page-head";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  BottomTabInset,
  MaxContentWidth,
  Radius,
  Shadows,
  Spacing,
} from "@/constants/theme";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useExamCatalog } from "@/hooks/use-exam-catalog";
import { useSettings } from "@/hooks/use-settings";
import { useTheme } from "@/hooks/use-theme";
import { Exam, ExamId, Question } from "@/types/exam";

type ExamFilter = "all" | ExamId;
type SessionMode = "learn" | "mock";

interface FilterChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

interface QuestionCardProps {
  question: Question;
  exam: Exam | undefined;
  index: number;
  expanded: boolean;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onToggleExpanded: () => void;
}

// 문제 검색어 일치 여부 판별
function matchesSearch(
  question: Question,
  searchQuery: string,
  exam: Exam | undefined,
): boolean {
  if (searchQuery.length === 0) return true;
  return [
    question.prompt,
    question.subject,
    question.explanation,
    question.choices.join(" "),
    exam?.title ?? "",
  ]
    .join(" ")
    .toLocaleLowerCase("ko-KR")
    .includes(searchQuery);
}

// 선택 문제 맞춤 세션 진입
function startCustomSession(questionIds: string[], mode: SessionMode) {
  router.push({
    pathname: "/quiz/[examId]",
    params: {
      examId: "all",
      questionIds: questionIds.join(","),
      ...(mode === "mock" ? { mode } : {}),
    },
  });
}

// 문제 필터 선택 칩
function FilterChip({ label, selected, onPress }: FilterChipProps) {
  const theme = useTheme();

  return (
    <AnimatedChip
      label={label}
      selected={selected}
      onPress={onPress}
      idleTextColor={theme.textSecondary}
    />
  );
}

// 문제 요약·정답 해설 카드
function QuestionCard({
  question,
  exam,
  index,
  expanded,
  bookmarked,
  onToggleBookmark,
  onToggleExpanded,
}: QuestionCardProps) {
  const theme = useTheme();

  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index * 35, 280)).duration(260)}
    >
      <ThemedView type="backgroundElement" style={styles.questionCard}>
        <View style={styles.questionTop}>
          <View style={styles.questionMeta}>
            <View
              style={[styles.examBadge, { backgroundColor: theme.primarySoft }]}
            >
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {exam?.icon} {exam?.shortTitle}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {question.subject}
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              bookmarked ? "저장 문제에서 제거" : "다시 볼 문제로 저장"
            }
            accessibilityState={{ selected: bookmarked }}
            onPress={onToggleBookmark}
            hitSlop={Spacing.two}
            style={({ pressed }) => [
              styles.bookmarkButton,
              {
                backgroundColor: bookmarked
                  ? theme.warningSoft
                  : theme.backgroundSelected,
              },
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              tintColor={bookmarked ? theme.warning : theme.textSecondary}
              name={{
                ios: bookmarked ? "bookmark.fill" : "bookmark",
                android: bookmarked ? "bookmark" : "bookmark_border",
                web: bookmarked ? "bookmark" : "bookmark_border",
              }}
              size={19}
            />
          </Pressable>
        </View>

        <ThemedText style={styles.questionPrompt}>{question.prompt}</ThemedText>

        {expanded && (
          <View style={styles.answerBlock}>
            <View style={styles.choiceList}>
              {question.choices.map((choice, choiceIndex) => {
                const isAnswer = choiceIndex === question.answerIndex;
                return (
                  <View
                    key={choice}
                    style={[
                      styles.choiceRow,
                      {
                        backgroundColor: isAnswer
                          ? theme.successSoft
                          : theme.backgroundSelected,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.choiceIndex,
                        {
                          backgroundColor: isAnswer
                            ? theme.success
                            : theme.backgroundElement,
                        },
                      ]}
                    >
                      <ThemedText
                        type="smallBold"
                        style={{
                          color: isAnswer ? "#FFFFFF" : theme.textSecondary,
                        }}
                      >
                        {choiceIndex + 1}
                      </ThemedText>
                    </View>
                    <ThemedText
                      type="small"
                      style={[
                        styles.choiceText,
                        isAnswer && {
                          color: theme.success,
                          fontWeight: 700,
                        },
                      ]}
                    >
                      {choice}
                    </ThemedText>
                    {isAnswer && (
                      <SymbolView
                        tintColor={theme.success}
                        name={{
                          ios: "checkmark.circle.fill",
                          android: "check_circle",
                          web: "check_circle",
                        }}
                        size={18}
                      />
                    )}
                  </View>
                );
              })}
            </View>
            <View
              style={[
                styles.explanation,
                { backgroundColor: theme.primarySoft },
              ]}
            >
              <View style={styles.explanationTitle}>
                <SymbolView
                  tintColor={theme.primary}
                  name={{
                    ios: "lightbulb.fill",
                    android: "lightbulb",
                    web: "lightbulb",
                  }}
                  size={17}
                />
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  핵심 해설
                </ThemedText>
              </View>
              <ThemedText type="small">{question.explanation}</ThemedText>
            </View>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={onToggleExpanded}
          style={({ pressed }) => [
            styles.expandButton,
            { borderTopColor: theme.border },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            {expanded ? "정답·해설 접기" : "정답·해설 보기"}
          </ThemedText>
          <SymbolView
            tintColor={theme.primary}
            name={{
              ios: expanded ? "chevron.up" : "chevron.down",
              android: expanded ? "expand_less" : "expand_more",
              web: expanded ? "expand_less" : "expand_more",
            }}
            size={18}
          />
        </Pressable>
      </ThemedView>
    </Animated.View>
  );
}

// 검색·필터 기반 문제은행 화면
export default function LibraryScreen() {
  const [searchText, setSearchText] = useState("");
  const [examFilter, setExamFilter] = useState<ExamFilter>("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [sessionMode, setSessionMode] = useState<SessionMode>("learn");
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null,
  );
  const { bookmarkedQuestionIds, toggleBookmark } = useBookmarks();
  const { exams, questions, findExam } = useExamCatalog();
  const { settings } = useSettings();
  const theme = useTheme();

  const availableSubjects = useMemo(
    () => [
      ...new Set(
        questions
          .filter(
            (question) =>
              examFilter === "all" || question.examId === examFilter,
          )
          .map((question) => question.subject),
      ),
    ],
    [examFilter, questions],
  );
  const searchQuery = searchText.trim().toLocaleLowerCase("ko-KR");
  const filteredQuestions = useMemo(
    () =>
      questions.filter(
        (question) =>
          (examFilter === "all" || question.examId === examFilter) &&
          (subjectFilter === "all" || question.subject === subjectFilter) &&
          matchesSearch(question, searchQuery, findExam(question.examId)),
      ),
    [examFilter, findExam, questions, searchQuery, subjectFilter],
  );
  const filteredBookmarkCount = filteredQuestions.filter((question) =>
    bookmarkedQuestionIds.includes(question.id),
  ).length;
  const sessionQuestionCount = Math.min(
    filteredQuestions.length,
    settings.sessionSize,
  );
  const hasActiveFilter =
    searchText.length > 0 || examFilter !== "all" || subjectFilter !== "all";

  // 시험 필터 변경
  const selectExamFilter = (nextExamFilter: ExamFilter) => {
    setExamFilter(nextExamFilter);
    setSubjectFilter("all");
    setExpandedQuestionId(null);
  };

  // 문제 필터 초기화
  const resetFilters = () => {
    setSearchText("");
    setExamFilter("all");
    setSubjectFilter("all");
    setExpandedQuestionId(null);
  };

  return (
    <ThemedView style={styles.container}>
      <PageHead
        title="문제집"
        description="북마크한 문제와 시험별 문제집을 모아 보고 바로 풀이 시작."
      />
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          <View style={styles.header}>
            <ThemedText type="subtitle">문제은행</ThemedText>
            <ThemedText themeColor="textSecondary">
              필요한 문제를 찾고 원하는 범위만 골라 학습해 보세요.
            </ThemedText>
          </View>

          <View
            style={[
              styles.searchBox,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
              },
            ]}
          >
            <SymbolView
              tintColor={theme.textSecondary}
              name={{
                ios: "magnifyingglass",
                android: "search",
                web: "search",
              }}
              size={20}
            />
            <TextInput
              accessibilityLabel="문제 검색"
              value={searchText}
              onChangeText={setSearchText}
              placeholder="문제, 과목, 보기, 해설 검색"
              placeholderTextColor={theme.textSecondary}
              selectionColor={theme.primary}
              returnKeyType="search"
              style={[styles.searchInput, { color: theme.text }]}
            />
            {searchText.length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="검색어 지우기"
                onPress={() => setSearchText("")}
                hitSlop={Spacing.two}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <SymbolView
                  tintColor={theme.textSecondary}
                  name={{
                    ios: "xmark.circle.fill",
                    android: "cancel",
                    web: "cancel",
                  }}
                  size={20}
                />
              </Pressable>
            )}
          </View>

          <Animated.View entering={FadeInDown.duration(320)}>
            <View
              style={[styles.sessionCard, { backgroundColor: theme.primary }]}
            >
              <View
                style={[
                  styles.sessionOrb,
                  { backgroundColor: theme.onPrimary },
                ]}
              />
              <View style={styles.sessionHeader}>
                <View style={styles.sessionCopy}>
                  <ThemedText type="smallBold" style={styles.onPrimaryMuted}>
                    현재 학습 범위
                  </ThemedText>
                  <View style={styles.sessionTitleRow}>
                    <AnimatedCounter
                      style={styles.sessionTitle}
                      value={filteredQuestions.length}
                    />
                    <ThemedText style={styles.sessionTitle}>
                      문제 발견
                    </ThemedText>
                  </View>
                  <ThemedText type="small" style={styles.onPrimaryMuted}>
                    {sessionMode === "mock"
                      ? `제한 ${settings.mockDurationMinutes}분 · 종료 후 정답 공개`
                      : `저장 ${filteredBookmarkCount} · 한 세션 최대 ${settings.sessionSize}문제`}
                  </ThemedText>
                </View>
                <View style={styles.sessionIcon}>
                  <SymbolView
                    tintColor={theme.onPrimary}
                    name={{
                      ios: "text.book.closed.fill",
                      android: "menu_book",
                      web: "menu_book",
                    }}
                    size={31}
                  />
                </View>
              </View>
              <View style={styles.modeGroup}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityLabel="바로 학습 모드"
                  accessibilityState={{ checked: sessionMode === "learn" }}
                  aria-checked={sessionMode === "learn"}
                  onPress={() => setSessionMode("learn")}
                  style={({ pressed }) => [
                    styles.modeOption,
                    sessionMode === "learn" && styles.modeOptionSelected,
                    pressed && styles.modePressed,
                  ]}
                >
                  <SymbolView
                    tintColor={
                      sessionMode === "learn"
                        ? theme.primary
                        : "rgba(255, 255, 255, 0.78)"
                    }
                    name={{
                      ios: "bolt.fill",
                      android: "bolt",
                      web: "bolt",
                    }}
                    size={17}
                  />
                  <ThemedText
                    type="smallBold"
                    style={
                      sessionMode === "learn"
                        ? { color: theme.primary }
                        : styles.onPrimaryMuted
                    }
                  >
                    바로 학습
                  </ThemedText>
                </Pressable>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityLabel="모의고사 모드"
                  accessibilityState={{ checked: sessionMode === "mock" }}
                  aria-checked={sessionMode === "mock"}
                  onPress={() => setSessionMode("mock")}
                  style={({ pressed }) => [
                    styles.modeOption,
                    sessionMode === "mock" && styles.modeOptionSelected,
                    pressed && styles.modePressed,
                  ]}
                >
                  <SymbolView
                    tintColor={
                      sessionMode === "mock"
                        ? theme.primary
                        : "rgba(255, 255, 255, 0.78)"
                    }
                    name={{
                      ios: "timer",
                      android: "timer",
                      web: "timer",
                    }}
                    size={17}
                  />
                  <ThemedText
                    type="smallBold"
                    style={
                      sessionMode === "mock"
                        ? { color: theme.primary }
                        : styles.onPrimaryMuted
                    }
                  >
                    모의고사
                  </ThemedText>
                </Pressable>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{
                  disabled: filteredQuestions.length === 0,
                }}
                disabled={filteredQuestions.length === 0}
                onPress={() =>
                  startCustomSession(
                    filteredQuestions.map((question) => question.id),
                    sessionMode,
                  )
                }
                style={({ pressed }) => [
                  styles.startButton,
                  filteredQuestions.length === 0 && styles.disabled,
                  pressed && styles.startButtonPressed,
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {sessionQuestionCount > 0
                    ? `${sessionQuestionCount}문제 ${
                        sessionMode === "mock" ? "모의고사 시작" : "맞춤 학습"
                      }`
                    : "조건에 맞는 문제 없음"}
                </ThemedText>
                {sessionQuestionCount > 0 && (
                  <SymbolView
                    tintColor={theme.primary}
                    name={{
                      ios: "arrow.right",
                      android: "arrow_forward",
                      web: "arrow_forward",
                    }}
                    size={18}
                  />
                )}
              </Pressable>
            </View>
          </Animated.View>

          <View style={styles.filterSection}>
            <ThemedText type="smallBold">시험</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              <FilterChip
                label="전체"
                selected={examFilter === "all"}
                onPress={() => selectExamFilter("all")}
              />
              {exams.map((exam) => (
                <FilterChip
                  key={exam.id}
                  label={exam.shortTitle}
                  selected={examFilter === exam.id}
                  onPress={() => selectExamFilter(exam.id)}
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.filterSection}>
            <ThemedText type="smallBold">과목</ThemedText>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
            >
              <FilterChip
                label="전체"
                selected={subjectFilter === "all"}
                onPress={() => setSubjectFilter("all")}
              />
              {availableSubjects.map((subject) => (
                <FilterChip
                  key={subject}
                  label={subject}
                  selected={subjectFilter === subject}
                  onPress={() => setSubjectFilter(subject)}
                />
              ))}
            </ScrollView>
          </View>

          <View style={styles.resultHeader}>
            <View>
              <ThemedText style={styles.resultTitle}>문제 목록</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {filteredQuestions.length}개 결과 · 눌러서 정답과 해설 확인
              </ThemedText>
            </View>
            {hasActiveFilter && (
              <Pressable
                accessibilityRole="button"
                onPress={resetFilters}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  초기화
                </ThemedText>
              </Pressable>
            )}
          </View>

          {filteredQuestions.length > 0 ? (
            <View style={styles.questionList}>
              {filteredQuestions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  exam={findExam(question.examId)}
                  index={index}
                  expanded={expandedQuestionId === question.id}
                  bookmarked={bookmarkedQuestionIds.includes(question.id)}
                  onToggleBookmark={() => toggleBookmark(question.id)}
                  onToggleExpanded={() =>
                    setExpandedQuestionId((current) =>
                      current === question.id ? null : question.id,
                    )
                  }
                />
              ))}
            </View>
          ) : (
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
                    ios: "magnifyingglass",
                    android: "search_off",
                    web: "search_off",
                  }}
                  size={27}
                />
              </View>
              <ThemedText type="smallBold">검색 결과가 없어요</ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.emptyText}
              >
                검색어를 줄이거나 시험·과목 필터를 바꿔 보세요.
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={resetFilters}
                style={({ pressed }) => [
                  styles.emptyButton,
                  { backgroundColor: theme.primarySoft },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  전체 문제 보기
                </ThemedText>
              </Pressable>
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
  searchBox: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    paddingVertical: Spacing.two,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: 500,
  },
  sessionCard: {
    position: "relative",
    overflow: "hidden",
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  sessionOrb: {
    position: "absolute",
    width: 160,
    height: 160,
    top: -82,
    right: -42,
    opacity: 0.09,
    borderRadius: Radius.pill,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  sessionCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  sessionTitleRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  sessionTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    lineHeight: 36,
    fontWeight: 800,
  },
  onPrimaryMuted: {
    color: "rgba(255, 255, 255, 0.78)",
  },
  sessionIcon: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.large,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.twoHalf,
    borderRadius: Radius.medium,
    backgroundColor: "#FFFFFF",
  },
  modeGroup: {
    flexDirection: "row",
    gap: Spacing.one,
    padding: Spacing.one,
    borderRadius: Radius.medium,
    backgroundColor: "rgba(255, 255, 255, 0.13)",
  },
  modeOption: {
    flex: 1,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderRadius: Radius.small,
  },
  modeOptionSelected: {
    backgroundColor: "#FFFFFF",
  },
  modePressed: {
    opacity: 0.76,
  },
  startButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.62,
  },
  filterSection: {
    gap: Spacing.two,
  },
  filterRow: {
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  filterChip: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.pill,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  resultTitle: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: 800,
  },
  questionList: {
    gap: Spacing.three,
  },
  questionCard: {
    overflow: "hidden",
    gap: Spacing.three,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  questionTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  questionMeta: {
    flex: 1,
    alignItems: "flex-start",
    gap: Spacing.one,
  },
  examBadge: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  bookmarkButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  questionPrompt: {
    fontSize: 16,
    lineHeight: 25,
    fontWeight: 700,
  },
  answerBlock: {
    gap: Spacing.three,
  },
  choiceList: {
    gap: Spacing.two,
  },
  choiceRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.small,
  },
  choiceIndex: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.pill,
  },
  choiceText: {
    flex: 1,
  },
  explanation: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  explanationTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  expandButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
  },
  emptyCard: {
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.five,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  emptyIcon: {
    width: 58,
    height: 58,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.one,
    borderRadius: Radius.large,
  },
  emptyText: {
    textAlign: "center",
  },
  emptyButton: {
    marginTop: Spacing.two,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  pressed: {
    opacity: 0.7,
  },
});
