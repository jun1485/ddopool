import { router } from "expo-router";
import { ScrollView, View } from "react-native";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ModalOverlay } from "@/components/motion/modal-overlay";
import { ConfidenceRating } from "@/components/quiz/confidence-rating";
import { CtaButton } from "@/components/quiz/quiz-controls";
import { quizStyles as styles } from "@/components/quiz/quiz-styles";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/hooks/use-theme";
import type { AnswerConfidence } from "@/learning/answer-confidence";
import type { Question } from "@/types/exam";

interface AnswerFeedbackSheetProps {
  question: Question;
  isCorrect: boolean;
  willRequeue: boolean;
  isLastQuestion: boolean;
  showExplanation: boolean;
  showConfidenceRating: boolean;
  confidence: AnswerConfidence | null;
  onRateConfidence: (confidence: AnswerConfidence) => void;
  onNext: () => void;
}

// 채점 결과·해설·확신도 평가 시트
export function AnswerFeedbackSheet({
  question,
  isCorrect,
  willRequeue,
  isLastQuestion,
  showExplanation,
  showConfidenceRating,
  confidence,
  onRateConfidence,
  onNext,
}: AnswerFeedbackSheetProps) {
  const theme = useTheme();

  return (
    <ModalOverlay variant="sheet">
      <ThemedView
        type="backgroundElement"
        style={[
          styles.feedbackSheet,
          { borderColor: isCorrect ? theme.success : theme.danger },
        ]}
      >
        <View style={styles.feedbackHeader}>
          <View
            style={[
              styles.feedbackIcon,
              {
                backgroundColor: isCorrect
                  ? theme.successSoft
                  : theme.dangerSoft,
              },
            ]}
          >
            <ThemedText style={styles.feedbackEmoji}>
              {isCorrect ? "🙆" : "🙅"}
            </ThemedText>
          </View>
          <View
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            style={styles.feedbackHeaderText}
          >
            <ThemedText
              style={[
                styles.feedbackTitle,
                { color: isCorrect ? theme.success : theme.danger },
              ]}
            >
              {isCorrect ? "정답입니다!" : "오답입니다"}
            </ThemedText>
            {!isCorrect && (
              <ThemedText type="small" themeColor="textSecondary">
                {willRequeue
                  ? "이 문제는 오늘 세션 끝에 다시 나와요"
                  : `정답은 ${String.fromCharCode(65 + question.answerIndex)}번이에요`}
              </ThemedText>
            )}
          </View>
        </View>

        {showConfidenceRating && (
          <ConfidenceRating
            isCorrect={isCorrect}
            selected={confidence}
            onSelect={onRateConfidence}
          />
        )}

        {showExplanation && (
          <ScrollView
            style={styles.feedbackExplanationArea}
            contentContainerStyle={styles.feedbackExplanation}
            showsVerticalScrollIndicator={false}
          >
            <ThemedText type="small" themeColor="textSecondary">
              {question.explanation}
            </ThemedText>
          </ScrollView>
        )}

        <CtaButton
          label={isLastQuestion ? "결과 보기" : "다음 문제"}
          onPress={onNext}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="현재 문제 오류 신고"
          onPress={() =>
            router.push({
              pathname: "/question-report",
              params: { questionId: question.id },
            })
          }
          style={styles.feedbackReport}
        >
          <ThemedText type="small" themeColor="textSecondary">
            문제에 이상이 있나요?
          </ThemedText>
        </Pressable>
      </ThemedView>
    </ModalOverlay>
  );
}
