import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useDeferredValue, useMemo, useState } from "react";
import {
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  type ListRenderItemInfo,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { AnimatedChip } from "@/components/motion/animated-chip";
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
import { useExamEnrollment } from "@/hooks/use-exam-enrollment";
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
  expanded: boolean;
  bookmarked: boolean;
  onToggleBookmark: () => void;
  onToggleExpanded: () => void;
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
  expanded,
  bookmarked,
  onToggleBookmark,
  onToggleExpanded,
}: QuestionCardProps) {
  const theme = useTheme();

  return (
    <Animated.View
      entering={
        Platform.OS === "android" ? undefined : FadeInDown.duration(220)
      }
    >
      <ThemedView type="backgroundElement" style={styles.questionCard}>
        <View style={styles.questionTop}>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            numberOfLines={1}
            style={styles.questionMeta}
          >
            {exam?.icon} {exam?.shortTitle} · {question.subject}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              bookmarked ? "저장 문제에서 제거" : "다시 볼 문제로 저장"
            }
            aria-selected={bookmarked}
            onPress={onToggleBookmark}
            hitSlop={Spacing.two}
            style={({ pressed }) => [
              styles.bookmarkButton,
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
                          color: isAnswer
                            ? theme.onPrimary
                            : theme.textSecondary,
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
          aria-expanded={expanded}
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
  const [bookmarkOnly, setBookmarkOnly] = useState(false);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null,
  );
  const { bookmarkedQuestionIds, toggleBookmark } = useBookmarks();
  const { exams, questions } = useExamCatalog();
  const { examIds } = useExamEnrollment();
  const sortedExams = useMemo(
    () => [
      ...exams.filter((exam) => examIds.includes(exam.id)),
      ...exams.filter((exam) => !examIds.includes(exam.id)),
    ],
    [examIds, exams],
  );
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
  const examById = useMemo(
    () => new Map(exams.map((exam) => [exam.id, exam])),
    [exams],
  );
  const questionSearchIndex = useMemo(
    () =>
      new Map(
        questions.map((question) => [
          question.id,
          [
            question.prompt,
            question.subject,
            question.explanation,
            question.choices.join(" "),
            examById.get(question.examId)?.title ?? "",
          ]
            .join(" ")
            .toLocaleLowerCase("ko-KR"),
        ]),
      ),
    [examById, questions],
  );
  const bookmarkedQuestionIdSet = useMemo(
    () => new Set(bookmarkedQuestionIds),
    [bookmarkedQuestionIds],
  );
  const searchQuery = useDeferredValue(
    searchText.trim().toLocaleLowerCase("ko-KR"),
  );
  const filteredQuestions = useMemo(
    () =>
      questions.filter(
        (question) =>
          (examFilter === "all" || question.examId === examFilter) &&
          (subjectFilter === "all" || question.subject === subjectFilter) &&
          (!bookmarkOnly || bookmarkedQuestionIdSet.has(question.id)) &&
          (searchQuery.length === 0 ||
            questionSearchIndex.get(question.id)?.includes(searchQuery)),
      ),
    [
      bookmarkOnly,
      bookmarkedQuestionIdSet,
      examFilter,
      questionSearchIndex,
      questions,
      searchQuery,
      subjectFilter,
    ],
  );
  const hasNoQuestions = questions.length === 0;
  const sessionQuestionCount = Math.min(
    filteredQuestions.length,
    settings.sessionSize,
  );
  const hasActiveFilter =
    searchText.length > 0 ||
    examFilter !== "all" ||
    subjectFilter !== "all" ||
    bookmarkOnly;

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
    setBookmarkOnly(false);
    setExpandedQuestionId(null);
  };

  // 화면에 필요한 문제 카드만 렌더링
  const renderQuestion = useCallback(
    ({ item }: ListRenderItemInfo<Question>) => (
      <QuestionCard
        question={item}
        exam={examById.get(item.examId)}
        expanded={expandedQuestionId === item.id}
        bookmarked={bookmarkedQuestionIdSet.has(item.id)}
        onToggleBookmark={() => toggleBookmark(item.id)}
        onToggleExpanded={() =>
          setExpandedQuestionId((current) =>
            current === item.id ? null : item.id,
          )
        }
      />
    ),
    [bookmarkedQuestionIdSet, examById, expandedQuestionId, toggleBookmark],
  );

  return (
    <ThemedView style={styles.container}>
      <PageHead
        title="문제집"
        description="북마크한 문제와 시험별 문제집을 모아 보고 바로 풀이 시작."
      />
      <SafeAreaView style={styles.safeArea}>
        <FlatList
          data={filteredQuestions}
          renderItem={renderQuestion}
          keyExtractor={(question) => question.id}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={40}
          windowSize={5}
          removeClippedSubviews={Platform.OS === "android"}
          ItemSeparatorComponent={() => (
            <View style={styles.questionSeparator} />
          )}
          ListHeaderComponentStyle={styles.listHeader}
          ListHeaderComponent={
            <View style={styles.listHeaderContent}>
              <View style={styles.header}>
                <ThemedText type="subtitle">문제집</ThemedText>
                <ThemedText themeColor="textSecondary">
                  문제를 찾아보고 원하는 범위만 골라 풀어요.
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

              <View style={styles.filterGroup}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterRow}
                >
                  <FilterChip
                    label="전체 시험"
                    selected={examFilter === "all"}
                    onPress={() => selectExamFilter("all")}
                  />
                  {sortedExams.map((exam) => (
                    <FilterChip
                      key={exam.id}
                      label={exam.shortTitle}
                      selected={examFilter === exam.id}
                      onPress={() => selectExamFilter(exam.id)}
                    />
                  ))}
                </ScrollView>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterRow}
                >
                  <FilterChip
                    label={`저장한 문제 ${bookmarkedQuestionIds.length}`}
                    selected={bookmarkOnly}
                    onPress={() => setBookmarkOnly((current) => !current)}
                  />
                  <View
                    style={[
                      styles.filterDivider,
                      { backgroundColor: theme.border },
                    ]}
                  />
                  <FilterChip
                    label="전체 과목"
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

              <ThemedView type="backgroundElement" style={styles.sessionCard}>
                <View style={styles.sessionHeader}>
                  <ThemedText type="smallBold">
                    선택한 범위 {filteredQuestions.length}문제
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {sessionMode === "mock"
                      ? `제한 ${settings.mockDurationMinutes}분 · 종료 후 정답 공개`
                      : `한 번에 최대 ${settings.sessionSize}문제`}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.modeGroup,
                    { backgroundColor: theme.backgroundSelected },
                  ]}
                >
                  {(
                    [
                      { mode: "learn", label: "바로 학습" },
                      { mode: "mock", label: "모의고사" },
                    ] as const
                  ).map((option) => {
                    const isSelected = sessionMode === option.mode;
                    return (
                      <Pressable
                        key={option.mode}
                        accessibilityRole="radio"
                        accessibilityLabel={`${option.label} 모드`}
                        aria-checked={isSelected}
                        onPress={() => setSessionMode(option.mode)}
                        style={({ pressed }) => [
                          styles.modeOption,
                          isSelected && {
                            backgroundColor: theme.backgroundElement,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <SymbolView
                          tintColor={
                            isSelected ? theme.primary : theme.textSecondary
                          }
                          name={
                            option.mode === "learn"
                              ? {
                                  ios: "bolt.fill",
                                  android: "bolt",
                                  web: "bolt",
                                }
                              : { ios: "timer", android: "timer", web: "timer" }
                          }
                          size={16}
                        />
                        <ThemedText
                          type="smallBold"
                          style={{
                            color: isSelected
                              ? theme.primary
                              : theme.textSecondary,
                          }}
                        >
                          {option.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
                <Pressable
                  accessibilityRole="button"
                  aria-disabled={filteredQuestions.length === 0}
                  disabled={filteredQuestions.length === 0}
                  onPress={() =>
                    startCustomSession(
                      filteredQuestions.map((question) => question.id),
                      sessionMode,
                    )
                  }
                  style={({ pressed }) => [
                    styles.startButton,
                    { backgroundColor: theme.primary },
                    filteredQuestions.length === 0 && styles.disabled,
                    pressed && styles.startButtonPressed,
                  ]}
                >
                  <ThemedText
                    type="smallBold"
                    style={{ color: theme.onPrimary }}
                  >
                    {sessionQuestionCount > 0
                      ? `${sessionQuestionCount}문제 ${
                          sessionMode === "mock" ? "모의고사 시작" : "맞춤 학습"
                        }`
                      : "조건에 맞는 문제 없음"}
                  </ThemedText>
                  {sessionQuestionCount > 0 && (
                    <SymbolView
                      tintColor={theme.onPrimary}
                      name={{
                        ios: "arrow.right",
                        android: "arrow_forward",
                        web: "arrow_forward",
                      }}
                      size={18}
                    />
                  )}
                </Pressable>
              </ThemedView>

              <View style={styles.resultHeader}>
                <View>
                  <ThemedText style={styles.resultTitle}>문제 목록</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {filteredQuestions.length}개 · 펼쳐서 정답과 해설 확인
                  </ThemedText>
                </View>
                {hasActiveFilter && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={resetFilters}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{ color: theme.primary }}
                    >
                      초기화
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </View>
          }
          ListEmptyComponent={
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <SymbolView
                  tintColor={theme.primary}
                  name={
                    hasNoQuestions
                      ? {
                          ios: "books.vertical",
                          android: "menu_book",
                          web: "menu_book",
                        }
                      : {
                          ios: "magnifyingglass",
                          android: "search_off",
                          web: "search_off",
                        }
                  }
                  size={27}
                />
              </View>
              <ThemedText type="smallBold">
                {hasNoQuestions
                  ? "아직 볼 수 있는 문제가 없어요"
                  : "검색 결과가 없어요"}
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.emptyText}
              >
                {hasNoQuestions
                  ? "시험을 등록하면 문제가 여기에 모여요."
                  : "검색어를 줄이거나 시험·과목 필터를 바꿔 보세요."}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={
                  hasNoQuestions ? () => router.push("/catalog") : resetFilters
                }
                style={({ pressed }) => [
                  styles.emptyButton,
                  { backgroundColor: theme.primarySoft },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {hasNoQuestions ? "시험 둘러보기" : "전체 문제 보기"}
                </ThemedText>
              </Pressable>
            </ThemedView>
          }
        />
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
  },
  listHeader: {
    marginBottom: Spacing.four,
  },
  listHeaderContent: {
    gap: Spacing.four,
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
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  sessionHeader: {
    gap: Spacing.half,
  },
  startButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderRadius: Radius.medium,
  },
  modeGroup: {
    flexDirection: "row",
    gap: Spacing.one,
    padding: Spacing.one,
    borderRadius: Radius.medium,
  },
  modeOption: {
    flex: 1,
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderRadius: Radius.small,
  },
  startButtonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  disabled: {
    opacity: 0.62,
  },
  filterGroup: {
    gap: Spacing.two,
  },
  filterRow: {
    alignItems: "center",
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  filterDivider: {
    width: 1,
    height: 20,
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
    fontSize: 18,
    lineHeight: 26,
    fontWeight: 800,
  },
  questionSeparator: {
    height: Spacing.twoHalf,
  },
  questionCard: {
    overflow: "hidden",
    gap: Spacing.two,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  questionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  questionMeta: {
    flex: 1,
  },
  bookmarkButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  questionPrompt: {
    fontSize: 15,
    lineHeight: 23,
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
    minHeight: 44,
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
