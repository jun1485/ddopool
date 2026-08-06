import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { AnimatedChip } from "@/components/motion/animated-chip";
import { RevealView } from "@/components/motion/reveal-view";
import { PageHead } from "@/components/page-head";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { stagger } from "@/constants/motion";
import { MaxContentWidth, Radius, Shadows, Spacing } from "@/constants/theme";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useExamCatalog } from "@/hooks/use-exam-catalog";
import { useTheme } from "@/hooks/use-theme";
import { useWrongAnswerNotes } from "@/hooks/use-wrong-answer-notes";
import {
  createReviewLibraryItems,
  filterReviewLibraryItems,
  ReviewLibraryFilter,
} from "@/learning/review-library";
import type { ReviewLibraryItem } from "@/learning/review-library";

const FILTER_OPTIONS: {
  id: ReviewLibraryFilter;
  label: string;
}[] = [
  { id: "all", label: "전체" },
  { id: "wrong", label: "미해결 오답" },
  { id: "bookmarked", label: "북마크" },
  { id: "resolved", label: "해결 완료" },
];

interface ReviewQuestionCardProps {
  item: ReviewLibraryItem;
  examTitle: string;
  selected: boolean;
  onSelect: () => void;
  onToggleBookmark: () => void;
}

// 오답 기록 시각 표시
function formatLastWrongAt(lastWrongAt: number): string {
  const date = new Date(lastWrongAt);
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

// 복습 보관함 문제 선택 카드
function ReviewQuestionCard({
  item,
  examTitle,
  selected,
  onSelect,
  onToggleBookmark,
}: ReviewQuestionCardProps) {
  const theme = useTheme();
  const unresolved = item.note != null && item.note.resolvedAt == null;

  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.questionCard,
        {
          borderColor: selected ? theme.primary : theme.border,
          backgroundColor: selected
            ? theme.primarySoft
            : theme.backgroundElement,
        },
      ]}
    >
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: selected }}
        accessibilityLabel={`${item.question.prompt} 선택`}
        onPress={onSelect}
        style={({ pressed }) => [
          styles.questionMain,
          pressed && styles.pressed,
        ]}
      >
        <View
          style={[
            styles.checkBox,
            {
              backgroundColor: selected ? theme.primary : "transparent",
              borderColor: selected ? theme.primary : theme.border,
            },
          ]}
        >
          {selected && (
            <SymbolView
              tintColor={theme.onPrimary}
              name={{ ios: "checkmark", android: "check", web: "check" }}
              size={13}
            />
          )}
        </View>
        <View style={styles.questionCopy}>
          <View style={styles.metaRow}>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              {examTitle}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {item.question.subject}
            </ThemedText>
          </View>
          <ThemedText type="smallBold" numberOfLines={3}>
            {item.question.prompt}
          </ThemedText>
          <View style={styles.badgeRow}>
            {unresolved && (
              <View
                style={[styles.badge, { backgroundColor: theme.dangerSoft }]}
              >
                <ThemedText type="smallBold" style={{ color: theme.danger }}>
                  오답 {item.note?.wrongCount}회
                </ThemedText>
              </View>
            )}
            {item.note?.resolvedAt != null && (
              <View
                style={[styles.badge, { backgroundColor: theme.successSoft }]}
              >
                <ThemedText type="smallBold" style={{ color: theme.success }}>
                  해결 완료
                </ThemedText>
              </View>
            )}
            {item.note != null && (
              <ThemedText type="small" themeColor="textSecondary">
                최근 오답 {formatLastWrongAt(item.note.lastWrongAt)}
              </ThemedText>
            )}
          </View>
          {item.note?.memo.trim() && (
            <View
              style={[
                styles.memo,
                { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <ThemedText
                type="small"
                themeColor="textSecondary"
                numberOfLines={2}
              >
                {item.note.memo}
              </ThemedText>
            </View>
          )}
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          item.bookmarked ? "문제 북마크 해제" : "문제 북마크 추가"
        }
        onPress={onToggleBookmark}
        hitSlop={Spacing.two}
        style={({ pressed }) => [
          styles.bookmarkButton,
          {
            backgroundColor: item.bookmarked
              ? theme.warningSoft
              : theme.backgroundSelected,
          },
          pressed && styles.pressed,
        ]}
      >
        <SymbolView
          tintColor={item.bookmarked ? theme.warning : theme.textSecondary}
          name={{
            ios: item.bookmarked ? "bookmark.fill" : "bookmark",
            android: item.bookmarked ? "bookmark" : "bookmark_border",
            web: item.bookmarked ? "bookmark" : "bookmark_border",
          }}
          size={19}
        />
      </Pressable>
    </ThemedView>
  );
}

// 선택 문제 맞춤 학습 진입
function startSelectedReview(questionIds: string[]) {
  router.push({
    pathname: "/quiz/[examId]",
    params: {
      examId: "all",
      questionIds: questionIds.join(","),
    },
  });
}

// 오답·북마크 통합 복습 보관함 화면
export default function ReviewLibraryScreen() {
  const params = useLocalSearchParams<{ filter?: ReviewLibraryFilter }>();
  const { exams, questions, findExam } = useExamCatalog();
  const { notes } = useWrongAnswerNotes();
  const { bookmarkedQuestionIds, toggleBookmark } = useBookmarks();
  const theme = useTheme();
  const [selectedFilter, setSelectedFilter] =
    useState<ReviewLibraryFilter | null>(null);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([]);
  const activeFilter =
    selectedFilter ??
    (FILTER_OPTIONS.some((option) => option.id === params.filter)
      ? (params.filter ?? "all")
      : "all");
  const items = useMemo(
    () => createReviewLibraryItems(questions, notes, bookmarkedQuestionIds),
    [bookmarkedQuestionIds, notes, questions],
  );
  const filteredItems = useMemo(
    () =>
      filterReviewLibraryItems({
        items,
        filter: activeFilter,
        examId: selectedExamId,
        query,
      }),
    [activeFilter, items, query, selectedExamId],
  );
  const availableExams = exams.filter((exam) =>
    items.some((item) => item.question.examId === exam.id),
  );
  const unresolvedCount = items.filter(
    (item) => item.note != null && item.note.resolvedAt == null,
  ).length;
  const resolvedCount = items.filter(
    (item) => item.note?.resolvedAt != null,
  ).length;
  const visibleQuestionIds = filteredItems.map((item) => item.question.id);
  const allVisibleSelected =
    visibleQuestionIds.length > 0 &&
    visibleQuestionIds.every((questionId) =>
      selectedQuestionIds.includes(questionId),
    );

  // 문제 선택 상태 전환
  const toggleQuestion = (questionId: string) => {
    setSelectedQuestionIds((current) =>
      current.includes(questionId)
        ? current.filter((item) => item !== questionId)
        : [...current, questionId],
    );
  };

  // 현재 필터 문제 전체 선택 전환
  const toggleAllVisible = () => {
    setSelectedQuestionIds((current) =>
      allVisibleSelected
        ? current.filter(
            (questionId) => !visibleQuestionIds.includes(questionId),
          )
        : [...new Set([...current, ...visibleQuestionIds])],
    );
  };

  // 복습 보관함 필터 전환
  const selectFilter = (filter: ReviewLibraryFilter) => {
    setSelectedFilter(filter);
    setSelectedQuestionIds([]);
  };

  // 문제 북마크 상태 전환
  const toggleItemBookmark = (item: ReviewLibraryItem) => {
    if (item.bookmarked && activeFilter === "bookmarked")
      setSelectedQuestionIds((current) =>
        current.filter((questionId) => questionId !== item.question.id),
      );
    toggleBookmark(item.question.id);
  };

  return (
    <ThemedView style={styles.container}>
      <PageHead
        title="복습 목록"
        description="복습 예정 문제와 오답 노트 모아 보기."
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
            <ThemedText type="smallBold">복습 보관함</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              오답과 북마크를 골라서 학습
            </ThemedText>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <RevealView
            variant="zoom"
            duration={360}
            style={[styles.hero, { backgroundColor: theme.primary }]}
          >
            <View style={styles.heroMain}>
              <View>
                <ThemedText type="smallBold" style={styles.heroMuted}>
                  다시 볼 문제
                </ThemedText>
                <ThemedText style={styles.heroValue}>
                  {items.length}
                  <ThemedText style={styles.heroUnit}>문제</ThemedText>
                </ThemedText>
              </View>
              <View style={styles.heroIcon}>
                <SymbolView
                  tintColor={theme.onPrimary}
                  name={{
                    ios: "tray.full.fill",
                    android: "inventory_2",
                    web: "inventory_2",
                  }}
                  size={28}
                />
              </View>
            </View>
            <View style={styles.heroStats}>
              <ThemedText type="small" style={styles.heroMuted}>
                미해결 {unresolvedCount}
              </ThemedText>
              <View style={styles.heroDivider} />
              <ThemedText type="small" style={styles.heroMuted}>
                북마크 {bookmarkedQuestionIds.length}
              </ThemedText>
              <View style={styles.heroDivider} />
              <ThemedText type="small" style={styles.heroMuted}>
                해결 {resolvedCount}
              </ThemedText>
            </View>
          </RevealView>

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
              size={19}
            />
            <TextInput
              accessibilityLabel="복습 문제 검색"
              value={query}
              onChangeText={setQuery}
              placeholder="문제, 과목, 메모 검색"
              placeholderTextColor={theme.textSecondary}
              style={[styles.searchInput, { color: theme.text }]}
              returnKeyType="search"
            />
            {query.length > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="검색어 지우기"
                onPress={() => setQuery("")}
                hitSlop={Spacing.two}
              >
                <SymbolView
                  tintColor={theme.textSecondary}
                  name={{
                    ios: "xmark.circle.fill",
                    android: "cancel",
                    web: "cancel",
                  }}
                  size={18}
                />
              </Pressable>
            )}
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            {FILTER_OPTIONS.map((option) => (
              <AnimatedChip
                key={option.id}
                label={option.label}
                selected={activeFilter === option.id}
                onPress={() => selectFilter(option.id)}
              />
            ))}
          </ScrollView>

          {availableExams.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.examRow}
            >
              <Pressable
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedExamId == null }}
                onPress={() => setSelectedExamId(null)}
                style={({ pressed }) => [
                  styles.examChip,
                  {
                    backgroundColor:
                      selectedExamId == null
                        ? theme.primarySoft
                        : theme.backgroundElement,
                    borderColor:
                      selectedExamId == null ? theme.primary : theme.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={{
                    color: selectedExamId == null ? theme.primary : theme.text,
                  }}
                >
                  모든 시험
                </ThemedText>
              </Pressable>
              {availableExams.map((exam) => {
                const selected = selectedExamId === exam.id;
                return (
                  <Pressable
                    key={exam.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => setSelectedExamId(exam.id)}
                    style={({ pressed }) => [
                      styles.examChip,
                      {
                        backgroundColor: selected
                          ? theme.primarySoft
                          : theme.backgroundElement,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText type="small">{exam.icon}</ThemedText>
                    <ThemedText
                      type="smallBold"
                      style={{ color: selected ? theme.primary : theme.text }}
                    >
                      {exam.shortTitle}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.listHeader}>
            <View>
              <ThemedText style={styles.sectionTitle}>문제 목록</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                조건에 맞는 {filteredItems.length}문제
              </ThemedText>
            </View>
            {filteredItems.length > 0 && (
              <Pressable
                accessibilityRole="button"
                onPress={toggleAllVisible}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  {allVisibleSelected ? "전체 해제" : "전체 선택"}
                </ThemedText>
              </Pressable>
            )}
          </View>

          {filteredItems.length > 0 ? (
            <View style={styles.questionList}>
              {filteredItems.map((item, index) => (
                <RevealView
                  key={item.question.id}
                  delay={stagger(index, 35, 6)}
                >
                  <ReviewQuestionCard
                    item={item}
                    examTitle={
                      findExam(item.question.examId)?.shortTitle ?? "시험"
                    }
                    selected={selectedQuestionIds.includes(item.question.id)}
                    onSelect={() => toggleQuestion(item.question.id)}
                    onToggleBookmark={() => toggleItemBookmark(item)}
                  />
                </RevealView>
              ))}
            </View>
          ) : (
            <ThemedView type="backgroundElement" style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <SymbolView
                  tintColor={theme.primary}
                  name={{
                    ios: "checkmark.circle.fill",
                    android: "task_alt",
                    web: "task_alt",
                  }}
                  size={28}
                />
              </View>
              <ThemedText type="smallBold">
                조건에 맞는 문제가 없어요
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                필터나 검색어를 바꿔보세요.
              </ThemedText>
            </ThemedView>
          )}
        </ScrollView>

        {selectedQuestionIds.length > 0 && (
          <ThemedView
            type="backgroundElement"
            style={[styles.footer, { borderColor: theme.border }]}
          >
            <View>
              <ThemedText type="smallBold">
                {selectedQuestionIds.length}문제 선택
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                선택한 순서대로 학습
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`선택한 ${selectedQuestionIds.length}문제 학습 시작`}
              onPress={() => startSelectedReview(selectedQuestionIds)}
              style={({ pressed }) => [
                styles.startButton,
                { backgroundColor: theme.primary },
                pressed && styles.startPressed,
              ]}
            >
              <ThemedText type="smallBold" style={styles.startButtonText}>
                선택 학습
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
        )}
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
  hero: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  heroMain: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  heroValue: {
    color: "#FFFFFF",
    fontSize: 35,
    lineHeight: 43,
    fontWeight: 900,
  },
  heroUnit: {
    color: "rgba(255, 255, 255, 0.76)",
    fontSize: 14,
    lineHeight: 21,
    fontWeight: 700,
  },
  heroMuted: {
    color: "rgba(255, 255, 255, 0.76)",
  },
  heroIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  heroStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  heroDivider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(255, 255, 255, 0.24)",
  },
  searchBox: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  searchInput: {
    minWidth: 0,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  filterRow: {
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  filterChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.pill,
  },
  examRow: {
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  examChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.pill,
  },
  listHeader: {
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
  questionList: {
    gap: Spacing.three,
  },
  questionCard: {
    position: "relative",
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  questionMain: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
    padding: Spacing.three,
    paddingRight: Spacing.six,
  },
  checkBox: {
    width: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderRadius: 7,
  },
  questionCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.two,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  memo: {
    padding: Spacing.two,
    borderRadius: Radius.small,
  },
  bookmarkButton: {
    position: "absolute",
    top: Spacing.two,
    right: Spacing.two,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.small,
  },
  emptyState: {
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.five,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  emptyIcon: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Platform.OS === "ios" ? Spacing.four : Spacing.three,
    borderTopWidth: 1,
  },
  startButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.medium,
  },
  startButtonText: {
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.76,
  },
  startPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
});
