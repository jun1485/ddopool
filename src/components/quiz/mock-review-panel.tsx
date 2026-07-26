import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ModalOverlay } from "@/components/motion/modal-overlay";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { QuizAnswer } from "@/hooks/use-quiz-session";
import type { Question } from "@/types/exam";

interface MockReviewPanelProps {
  questions: Question[];
  answers: QuizAnswer[];
  currentIndex: number;
  flaggedQuestionIds: string[];
  onSelectQuestion: (questionIndex: number) => void;
  onSubmit: () => void;
  onClose: () => void;
}

// 모의고사 제출 전 문항 검토 패널
export function MockReviewPanel({
  questions,
  answers,
  currentIndex,
  flaggedQuestionIds,
  onSelectQuestion,
  onSubmit,
  onClose,
}: MockReviewPanelProps) {
  const [submitArmed, setSubmitArmed] = useState(false);
  const theme = useTheme();
  const answerMap = new Map(
    answers.map((answer) => [answer.questionId, answer]),
  );
  const answeredCount = questions.filter(
    (question) => answerMap.get(question.id)?.selectedIndex != null,
  ).length;
  const unansweredCount = questions.length - answeredCount;
  const flaggedCount = flaggedQuestionIds.length;
  const requiresConfirmation = unansweredCount > 0 || flaggedCount > 0;

  // 미응답·표시 문항 포함 제출 확인
  const handleSubmit = () => {
    if (requiresConfirmation && !submitArmed) {
      setSubmitArmed(true);
      return;
    }
    onSubmit();
  };

  return (
    <ModalOverlay
      variant="sheet"
      closeLabel="답안 검토 닫기"
      onRequestClose={onClose}
    >
      <ThemedView type="backgroundElement" style={styles.dialog}>
          <View style={styles.header}>
            <View>
              <ThemedText style={styles.title}>답안 검토</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                번호를 눌러 답을 다시 확인할 수 있어요.
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="답안 검토 닫기"
              onPress={onClose}
              hitSlop={Spacing.two}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                tintColor={theme.textSecondary}
                name={{ ios: "xmark", android: "close", web: "close" }}
                size={18}
              />
            </Pressable>
          </View>

          <View style={styles.summary}>
            <View style={styles.summaryItem}>
              <ThemedText
                style={[styles.summaryValue, { color: theme.success }]}
              >
                {answeredCount}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                응답
              </ThemedText>
            </View>
            <View
              style={[styles.summaryDivider, { backgroundColor: theme.border }]}
            />
            <View style={styles.summaryItem}>
              <ThemedText
                style={[styles.summaryValue, { color: theme.warning }]}
              >
                {unansweredCount}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                미응답
              </ThemedText>
            </View>
            <View
              style={[styles.summaryDivider, { backgroundColor: theme.border }]}
            />
            <View style={styles.summaryItem}>
              <ThemedText
                style={[styles.summaryValue, { color: theme.primary }]}
              >
                {flaggedCount}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                다시 보기
              </ThemedText>
            </View>
          </View>

          <ScrollView
            style={styles.gridScroll}
            contentContainerStyle={styles.grid}
            showsVerticalScrollIndicator={false}
          >
            {questions.map((question, index) => {
              const answered =
                answerMap.get(question.id)?.selectedIndex != null;
              const flagged = flaggedQuestionIds.includes(question.id);
              const current = index === currentIndex;
              const backgroundColor = current
                ? theme.primary
                : flagged
                  ? theme.warningSoft
                  : answered
                    ? theme.successSoft
                    : theme.backgroundSelected;
              const foregroundColor = current
                ? theme.onPrimary
                : flagged
                  ? theme.warning
                  : answered
                    ? theme.success
                    : theme.textSecondary;
              return (
                <Pressable
                  key={question.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${index + 1}번 문항, ${
                    answered ? "응답 완료" : "미응답"
                  }${flagged ? ", 다시 보기 표시" : ""}`}
                  accessibilityState={{ selected: current }}
                  onPress={() => onSelectQuestion(index)}
                  style={({ pressed }) => [
                    styles.questionButton,
                    {
                      backgroundColor,
                      borderColor: current ? theme.primary : theme.border,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText
                    type="smallBold"
                    style={{ color: foregroundColor }}
                  >
                    {index + 1}
                  </ThemedText>
                  {flagged && (
                    <View
                      style={[
                        styles.flagDot,
                        {
                          backgroundColor: current
                            ? theme.onPrimary
                            : theme.warning,
                        },
                      ]}
                    />
                  )}
                </Pressable>
              );
            })}
          </ScrollView>

          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: theme.successSoft },
                ]}
              />
              <ThemedText type="small" themeColor="textSecondary">
                응답
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: theme.backgroundSelected },
                ]}
              />
              <ThemedText type="small" themeColor="textSecondary">
                미응답
              </ThemedText>
            </View>
            <View style={styles.legendItem}>
              <View
                style={[styles.legendDot, { backgroundColor: theme.warning }]}
              />
              <ThemedText type="small" themeColor="textSecondary">
                다시 보기
              </ThemedText>
            </View>
          </View>

          {submitArmed && requiresConfirmation && (
            <View
              style={[styles.warning, { backgroundColor: theme.warningSoft }]}
            >
              <SymbolView
                tintColor={theme.warning}
                name={{
                  ios: "exclamationmark.triangle.fill",
                  android: "warning",
                  web: "warning",
                }}
                size={18}
              />
              <ThemedText
                type="small"
                style={[styles.warningText, { color: theme.warning }]}
              >
                {unansweredCount > 0
                  ? `미응답 ${unansweredCount}문제가 오답 처리돼요.`
                  : `다시 보기 ${flaggedCount}문제가 남아 있어요.`}
              </ThemedText>
            </View>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              submitArmed && requiresConfirmation
                ? "확인하고 모의고사 제출"
                : "모의고사 답안 제출"
            }
            onPress={handleSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              {
                backgroundColor:
                  submitArmed && requiresConfirmation
                    ? theme.warning
                    : theme.primary,
              },
              pressed && styles.submitPressed,
            ]}
          >
            <ThemedText type="smallBold" style={styles.submitText}>
              {submitArmed && requiresConfirmation
                ? "확인하고 제출"
                : "답안 제출"}
            </ThemedText>
          </Pressable>
      </ThemedView>
    </ModalOverlay>
  );
}

const styles = StyleSheet.create({
  dialog: {
    gap: Spacing.three,
    maxHeight: "88%",
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  title: {
    fontSize: 20,
    lineHeight: 29,
    fontWeight: 900,
  },
  closeButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.half,
  },
  summaryValue: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: 900,
  },
  summaryDivider: {
    width: 1,
    height: 34,
  },
  gridScroll: {
    maxHeight: 236,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  questionButton: {
    position: "relative",
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: Radius.small,
  },
  flagDot: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 6,
    height: 6,
    borderRadius: Radius.pill,
  },
  legend: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: Spacing.three,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: Spacing.one,
  },
  warning: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  warningText: {
    flex: 1,
  },
  submitButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  submitText: {
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.74,
  },
  submitPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
});
