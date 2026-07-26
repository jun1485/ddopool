import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInUp, FadeOut } from "react-native-reanimated";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Durations } from "@/constants/motion";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import type { QuizAnswer } from "@/hooks/use-quiz-session";
import { useTheme } from "@/hooks/use-theme";
import type { AnswerConfidence } from "@/learning/answer-confidence";
import type { Question } from "@/types/exam";

interface AnswerReviewCardProps {
  answer: QuizAnswer;
  question: Question;
  index: number;
  expanded: boolean;
  bookmarked: boolean;
  onToggleExpanded: () => void;
  onToggleBookmark: () => void;
  onReport: () => void;
  noteEditor?: ReactNode;
}

const CONFIDENCE_LABELS: Record<AnswerConfidence, string> = {
  confident: "확실",
  unsure: "헷갈림",
  forgot: "모름",
};

// 답안 상태별 표시 문구 산출
function getAnswerStatus(answer: QuizAnswer): "correct" | "wrong" | "empty" {
  if (answer.selectedIndex == null) return "empty";
  return answer.isCorrect ? "correct" : "wrong";
}

// 선택지 번호·내용 표시
function getChoiceLabel(question: Question, choiceIndex: number): string {
  return `${String.fromCharCode(65 + choiceIndex)}. ${
    question.choices[choiceIndex]
  }`;
}

// 문제별 선택 답안·정답 리뷰 카드
export function AnswerReviewCard({
  answer,
  question,
  index,
  expanded,
  bookmarked,
  onToggleExpanded,
  onToggleBookmark,
  onReport,
  noteEditor,
}: AnswerReviewCardProps) {
  const theme = useTheme();
  const status = getAnswerStatus(answer);
  const statusLabel =
    status === "correct" ? "정답" : status === "wrong" ? "오답" : "미응답";
  const statusColor =
    status === "correct"
      ? theme.success
      : status === "wrong"
        ? theme.danger
        : theme.warning;
  const statusBackground =
    status === "correct"
      ? theme.successSoft
      : status === "wrong"
        ? theme.dangerSoft
        : theme.warningSoft;
  const confidenceColor =
    answer.confidence === "confident"
      ? theme.success
      : answer.confidence === "unsure"
        ? theme.warning
        : theme.danger;
  const confidenceBackground =
    answer.confidence === "confident"
      ? theme.successSoft
      : answer.confidence === "unsure"
        ? theme.warningSoft
        : theme.dangerSoft;
  const hasLearningNote =
    status !== "correct" ||
    answer.confidence === "unsure" ||
    answer.confidence === "forgot";

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.meta}>
          <View
            style={[
              styles.numberBadge,
              { backgroundColor: theme.backgroundSelected },
            ]}
          >
            <ThemedText type="smallBold" themeColor="textSecondary">
              {String(index + 1).padStart(2, "0")}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {question.subject}
          </ThemedText>
        </View>
        <View style={styles.badgeRow}>
          {answer.confidence != null && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: confidenceBackground },
              ]}
            >
              <ThemedText type="smallBold" style={{ color: confidenceColor }}>
                {CONFIDENCE_LABELS[answer.confidence]}
              </ThemedText>
            </View>
          )}
          <View
            style={[styles.statusBadge, { backgroundColor: statusBackground }]}
          >
            <ThemedText type="smallBold" style={{ color: statusColor }}>
              {statusLabel}
            </ThemedText>
          </View>
        </View>
      </View>

      <ThemedText style={styles.prompt}>{question.prompt}</ThemedText>

      <View style={styles.answerList}>
        <View
          style={[
            styles.answerRow,
            { backgroundColor: theme.backgroundSelected },
          ]}
        >
          <ThemedText
            type="smallBold"
            themeColor="textSecondary"
            style={styles.answerLabel}
          >
            내 답
          </ThemedText>
          <ThemedText
            type="small"
            style={[
              styles.answerText,
              {
                color:
                  answer.selectedIndex == null ? theme.warning : theme.text,
              },
            ]}
          >
            {answer.selectedIndex == null
              ? "선택하지 않음"
              : getChoiceLabel(question, answer.selectedIndex)}
          </ThemedText>
        </View>
        <View
          style={[styles.answerRow, { backgroundColor: theme.successSoft }]}
        >
          <ThemedText
            type="smallBold"
            style={[styles.answerLabel, { color: theme.success }]}
          >
            정답
          </ThemedText>
          <ThemedText
            type="small"
            style={[
              styles.answerText,
              { color: theme.success, fontWeight: 700 },
            ]}
          >
            {getChoiceLabel(question, question.answerIndex)}
          </ThemedText>
        </View>
      </View>

      {expanded && (
        <Animated.View
          entering={FadeInUp.duration(Durations.fast)}
          exiting={FadeOut.duration(Durations.instant)}
          style={styles.expandedArea}
        >
          <View
            style={[styles.explanation, { backgroundColor: theme.primarySoft }]}
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
          {hasLearningNote && noteEditor}
        </Animated.View>
      )}

      <View style={[styles.actions, { borderTopColor: theme.border }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={onToggleExpanded}
          style={({ pressed }) => [
            styles.actionButton,
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            {expanded
              ? "해설 접기"
              : !hasLearningNote
                ? "해설 보기"
                : "해설·학습 노트"}
          </ThemedText>
          <SymbolView
            tintColor={theme.primary}
            name={{
              ios: expanded ? "chevron.up" : "chevron.down",
              android: expanded ? "expand_less" : "expand_more",
              web: expanded ? "expand_less" : "expand_more",
            }}
            size={17}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="문제 오류 신고"
          onPress={onReport}
          style={({ pressed }) => [
            styles.reportButton,
            { backgroundColor: theme.dangerSoft },
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            tintColor={theme.danger}
            name={{
              ios: "exclamationmark.bubble",
              android: "report_problem",
              web: "report_problem",
            }}
            size={17}
          />
          <ThemedText type="smallBold" style={{ color: theme.danger }}>
            신고
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            bookmarked ? "저장 문제에서 제거" : "다시 볼 문제로 저장"
          }
          accessibilityState={{ selected: bookmarked }}
          onPress={onToggleBookmark}
          style={({ pressed }) => [
            styles.saveButton,
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
            size={17}
          />
          <ThemedText
            type="smallBold"
            style={{ color: bookmarked ? theme.warning : theme.textSecondary }}
          >
            {bookmarked ? "저장됨" : "저장"}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  expandedArea: {
    gap: Spacing.three,
  },
  card: {
    overflow: "hidden",
    gap: Spacing.three,
    paddingTop: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  numberBadge: {
    minWidth: 34,
    alignItems: "center",
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  statusBadge: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  prompt: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: 700,
  },
  answerList: {
    gap: Spacing.two,
  },
  answerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.small,
  },
  answerLabel: {
    width: 38,
  },
  answerText: {
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
  actions: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingVertical: Spacing.two,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  reportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  pressed: {
    opacity: 0.72,
  },
});
