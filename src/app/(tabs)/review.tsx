import { router } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { PageHead } from "@/components/page-head";
import { PullRefreshControl } from "@/components/pull-refresh-control";
import { SectionHeader } from "@/components/section-header";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  BottomTabInset,
  MaxContentWidth,
  Radius,
  Spacing,
  TabScreenEdges,
} from "@/constants/theme";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useExamCatalog } from "@/hooks/use-exam-catalog";
import { useSrsSummary } from "@/hooks/use-srs-summary";
import { useTheme } from "@/hooks/use-theme";
import { useWrongAnswerNotes } from "@/hooks/use-wrong-answer-notes";
import { Exam } from "@/types/exam";

interface ReviewRowProps {
  icon: SymbolViewProps["name"];
  title: string;
  count: number;
  emptyText: string;
  onPress: () => void;
}

// 복습 세션 진입
function startReviewSession(exam: Exam) {
  router.push({
    pathname: "/quiz/[examId]",
    params: { examId: exam.id, mode: "review" },
  });
}

// 전체 시험 복습 세션 진입
function startAllReviewSession() {
  router.push({
    pathname: "/quiz/[examId]",
    params: { examId: "all", mode: "review" },
  });
}

// 복습 보관함 필터 화면 진입
function openReviewLibrary(filter: "wrong" | "bookmarked") {
  router.push({
    pathname: "/review-library",
    params: { filter },
  });
}

// 다시 볼 문제 묶음 행
function ReviewRow({ icon, title, count, emptyText, onPress }: ReviewRowProps) {
  const theme = useTheme();
  const hasItems = count > 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hasItems ? `${title} ${count}문제 보기` : emptyText}
      aria-disabled={!hasItems}
      disabled={!hasItems}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <SymbolView
        tintColor={hasItems ? theme.primary : theme.textSecondary}
        name={icon}
        size={22}
      />
      <View style={styles.rowCopy}>
        <ThemedText type="smallBold">{title}</ThemedText>
        {!hasItems && (
          <ThemedText type="small" themeColor="textSecondary">
            {emptyText}
          </ThemedText>
        )}
      </View>
      {hasItems && (
        <>
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            {count}
          </ThemedText>
          <SymbolView
            tintColor={theme.textSecondary}
            name={{
              ios: "chevron.right",
              android: "chevron_right",
              web: "chevron_right",
            }}
            size={18}
          />
        </>
      )}
    </Pressable>
  );
}

// 복습할 문제·다시 볼 문제 화면
export default function ReviewScreen() {
  const { dueCounts, studiedCounts, totalDue, totalStudied } = useSrsSummary();
  const { exams, questions } = useExamCatalog();
  const { bookmarkedQuestionIds } = useBookmarks();
  const { unresolvedNotes } = useWrongAnswerNotes();
  const theme = useTheme();
  const studiedExams = exams.filter(
    (exam) => (studiedCounts[exam.id] ?? 0) > 0,
  );
  const wrongCount = unresolvedNotes.filter((note) =>
    questions.some((question) => question.id === note.questionId),
  ).length;

  return (
    <ThemedView style={styles.container}>
      <PageHead
        title="복습"
        description="틀린 문제를 간격 반복 일정에 맞춰 다시 푸는 복습 화면."
      />
      <SafeAreaView edges={TabScreenEdges} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<PullRefreshControl />}
        >
          <ThemedText type="subtitle">복습</ThemedText>

          <ThemedView type="backgroundElement" style={styles.dueCard}>
            <ThemedText type="smallBold" themeColor="textSecondary">
              지금 복습할 문제
            </ThemedText>
            <ThemedText style={styles.dueCount}>{totalDue}</ThemedText>
            {totalDue > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`${totalDue}문제 전체 복습 시작`}
                onPress={startAllReviewSession}
                style={({ pressed }) => [
                  styles.reviewAllButton,
                  { backgroundColor: theme.primary },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                  전체 복습 시작
                </ThemedText>
              </Pressable>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                {totalStudied > 0
                  ? "오늘 예정된 복습을 모두 마쳤어요"
                  : "문제를 풀면 복습 일정이 자동으로 만들어져요"}
              </ThemedText>
            )}
          </ThemedView>

          <View style={styles.section}>
            <SectionHeader title="다시 볼 문제" />
            <ThemedView type="backgroundElement" style={styles.listCard}>
              <ReviewRow
                icon={{ ios: "xmark.circle", android: "cancel", web: "cancel" }}
                title="틀린 문제"
                count={wrongCount}
                emptyText="틀린 문제가 여기에 모여요"
                onPress={() => openReviewLibrary("wrong")}
              />
              <View
                style={[styles.rowDivider, { backgroundColor: theme.border }]}
              />
              <ReviewRow
                icon={{
                  ios: "bookmark",
                  android: "bookmark_border",
                  web: "bookmark_border",
                }}
                title="저장한 문제"
                count={bookmarkedQuestionIds.length}
                emptyText="풀이 중 북마크를 누르면 여기에 모여요"
                onPress={() => openReviewLibrary("bookmarked")}
              />
            </ThemedView>
          </View>

          {studiedExams.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="시험별 복습" />
              <ThemedView type="backgroundElement" style={styles.listCard}>
                {studiedExams.map((exam, listIndex) => {
                  const dueCount = dueCounts[exam.id] ?? 0;
                  const hasDue = dueCount > 0;

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
                      <Pressable
                        accessibilityRole="button"
                        aria-disabled={!hasDue}
                        accessibilityLabel={
                          hasDue
                            ? `${exam.shortTitle} ${dueCount}문제 복습 시작`
                            : `${exam.shortTitle} 복습할 문제 없음`
                        }
                        disabled={!hasDue}
                        onPress={() => startReviewSession(exam)}
                        style={({ pressed }) => [
                          styles.row,
                          pressed && styles.pressed,
                        ]}
                      >
                        <ThemedText style={styles.examIconText}>
                          {exam.icon}
                        </ThemedText>
                        <View style={styles.rowCopy}>
                          <ThemedText type="smallBold">
                            {exam.shortTitle}
                          </ThemedText>
                          <ThemedText type="small" themeColor="textSecondary">
                            {studiedCounts[exam.id] ?? 0}문제 학습
                          </ThemedText>
                        </View>
                        <ThemedText
                          type="smallBold"
                          style={{
                            color: hasDue ? theme.primary : theme.textSecondary,
                          }}
                        >
                          {hasDue ? `복습 ${dueCount}` : "완료"}
                        </ThemedText>
                      </Pressable>
                    </View>
                  );
                })}
              </ThemedView>
            </View>
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
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  dueCard: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.large,
  },
  dueCount: {
    fontSize: 34,
    lineHeight: 42,
    fontWeight: 800,
  },
  reviewAllButton: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.two,
    borderRadius: Radius.medium,
  },
  section: {
    gap: Spacing.two,
  },
  listCard: {
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.large,
  },
  rowDivider: {
    height: 1,
  },
  row: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.twoHalf,
    paddingVertical: Spacing.twoHalf,
  },
  rowCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  examIconText: {
    fontSize: 20,
    lineHeight: 27,
  },
  pressed: {
    opacity: 0.72,
  },
});
