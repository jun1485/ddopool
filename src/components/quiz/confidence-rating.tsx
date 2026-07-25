import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { AnswerConfidence } from "@/learning/answer-confidence";

interface ConfidenceRatingProps {
  isCorrect: boolean;
  selected: AnswerConfidence | null;
  onSelect: (confidence: AnswerConfidence) => void;
}

interface ConfidenceOption {
  value: AnswerConfidence;
  icon: string;
  label: string;
  description: string;
}

// 정오답별 확신도 선택지 구성
function getConfidenceOptions(isCorrect: boolean): ConfidenceOption[] {
  return [
    {
      value: "confident",
      icon: isCorrect ? "💡" : "🫢",
      label: isCorrect ? "확실했어요" : "실수였어요",
      description: isCorrect ? "간격 넓히기" : "빠르게 재확인",
    },
    {
      value: "unsure",
      icon: "🤔",
      label: "헷갈렸어요",
      description: "짧게 다시 보기",
    },
    {
      value: "forgot",
      icon: isCorrect ? "🎲" : "🫥",
      label: isCorrect ? "찍었어요" : "몰랐어요",
      description: "즉시 복습 유지",
    },
  ];
}

// 답변 확신도 선택 카드
export function ConfidenceRating({
  isCorrect,
  selected,
  onSelect,
}: ConfidenceRatingProps) {
  const theme = useTheme();
  const options = getConfidenceOptions(isCorrect);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <View
          style={[styles.headerIcon, { backgroundColor: theme.primarySoft }]}
        >
          <SymbolView
            tintColor={theme.primary}
            name={{
              ios: "brain.head.profile",
              android: "psychology",
              web: "psychology",
            }}
            size={19}
          />
        </View>
        <View style={styles.headerCopy}>
          <ThemedText type="smallBold">이 문제, 얼마나 확실했나요?</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            기억 상태에 맞춰 다음 복습 시점을 조정해요
          </ThemedText>
        </View>
      </View>

      <View style={styles.optionRow}>
        {options.map((option) => {
          const isSelected = selected === option.value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{
                checked: isSelected,
                disabled: selected != null,
              }}
              disabled={selected != null}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: isSelected
                    ? theme.primarySoft
                    : theme.backgroundSelected,
                  borderColor: isSelected ? theme.primary : "transparent",
                },
                selected != null && !isSelected && styles.unselected,
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.optionIcon}>{option.icon}</ThemedText>
              <ThemedText
                type="smallBold"
                style={{
                  color: isSelected ? theme.primary : theme.text,
                }}
              >
                {option.label}
              </ThemedText>
              <ThemedText
                style={[
                  styles.optionDescription,
                  {
                    color: isSelected ? theme.primary : theme.textSecondary,
                  },
                ]}
              >
                {option.description}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      {selected != null && (
        <View style={[styles.savedRow, { backgroundColor: theme.successSoft }]}>
          <SymbolView
            tintColor={theme.success}
            name={{
              ios: "checkmark.circle.fill",
              android: "check_circle",
              web: "check_circle",
            }}
            size={17}
          />
          <ThemedText type="smallBold" style={{ color: theme.success }}>
            복습 일정에 반영됐어요
          </ThemedText>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  headerIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.small,
  },
  headerCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  optionRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  option: {
    minWidth: 0,
    flex: 1,
    alignItems: "center",
    gap: Spacing.half,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  optionIcon: {
    fontSize: 21,
    lineHeight: 27,
  },
  optionDescription: {
    fontSize: 10,
    lineHeight: 14,
    textAlign: "center",
  },
  savedRow: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
    borderRadius: Radius.small,
  },
  unselected: {
    opacity: 0.48,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
});
