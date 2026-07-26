import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { AnimatedProgressBar } from "@/components/motion/animated-progress-bar";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { ExamReadiness } from "@/learning/exam-readiness";
import type { Exam } from "@/types/exam";

export interface ExamReadinessItem {
  exam: Exam;
  readiness: ExamReadiness;
}

interface ExamReadinessCardProps {
  items: ExamReadinessItem[];
  onStartRecommendation: (item: ExamReadinessItem) => void;
}

// 시험별 학습 준비도 카드
export function ExamReadinessCard({
  items,
  onStartRecommendation,
}: ExamReadinessCardProps) {
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const theme = useTheme();
  const selectedItem =
    items.find((item) => item.exam.id === selectedExamId) ?? items[0];

  if (selectedItem == null) return null;

  const scoreColor =
    selectedItem.readiness.score >= 80
      ? theme.success
      : selectedItem.readiness.score >= 60
        ? theme.primary
        : selectedItem.readiness.score >= 35
          ? theme.warning
          : theme.danger;
  const scoreBackground =
    selectedItem.readiness.score >= 80
      ? theme.successSoft
      : selectedItem.readiness.score >= 60
        ? theme.primarySoft
        : selectedItem.readiness.score >= 35
          ? theme.warningSoft
          : theme.dangerSoft;

  return (
    <View style={styles.section}>
      <View>
        <ThemedText style={styles.sectionTitle}>시험 준비도</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          합격 확률이 아닌 현재 학습 기록 기반 추정치
        </ThemedText>
      </View>

      {items.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.examSelector}
        >
          {items.map((item) => {
            const selected = item.exam.id === selectedItem.exam.id;
            return (
              <Pressable
                key={item.exam.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${item.exam.shortTitle} 준비도 선택`}
                onPress={() => setSelectedExamId(item.exam.id)}
                style={({ pressed }) => [
                  styles.examChip,
                  {
                    backgroundColor: selected
                      ? theme.primary
                      : theme.backgroundElement,
                    borderColor: selected ? theme.primary : theme.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="small">{item.exam.icon}</ThemedText>
                <ThemedText
                  type="smallBold"
                  style={{
                    color: selected ? theme.onPrimary : theme.text,
                  }}
                >
                  {item.exam.shortTitle}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.summary}>
          <View
            style={[
              styles.scoreCircle,
              { backgroundColor: scoreBackground, borderColor: scoreColor },
            ]}
          >
            <ThemedText style={[styles.score, { color: scoreColor }]}>
              {selectedItem.readiness.score}
            </ThemedText>
            <ThemedText
              type="smallBold"
              style={[styles.scoreUnit, { color: scoreColor }]}
            >
              / 100
            </ThemedText>
          </View>
          <View style={styles.summaryCopy}>
            <View style={styles.examTitleRow}>
              <ThemedText style={styles.examEmoji}>
                {selectedItem.exam.icon}
              </ThemedText>
              <ThemedText type="smallBold">
                {selectedItem.exam.shortTitle}
              </ThemedText>
            </View>
            <ThemedText style={[styles.readinessLabel, { color: scoreColor }]}>
              {selectedItem.readiness.label}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              다섯 학습 지표를 가중 합산한 참고 점수예요.
            </ThemedText>
          </View>
        </View>

        <View style={styles.factorList}>
          {selectedItem.readiness.factors.map((factor) => {
            const factorColor =
              factor.score >= 75
                ? theme.success
                : factor.score >= 50
                  ? theme.primary
                  : factor.score >= 25
                    ? theme.warning
                    : theme.danger;
            return (
              <View key={factor.id} style={styles.factor}>
                <View style={styles.factorHeader}>
                  <View style={styles.factorCopy}>
                    <ThemedText type="smallBold">{factor.label}</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {factor.description}
                    </ThemedText>
                  </View>
                  <ThemedText type="smallBold" style={{ color: factorColor }}>
                    {factor.score}
                  </ThemedText>
                </View>
                <AnimatedProgressBar
                  progress={(factor.score) / 100}
                  height={7}
                  color={factorColor}
                  trackColor={theme.backgroundSelected}
                />
              </View>
            );
          })}
        </View>

        <View
          style={[
            styles.recommendation,
            { backgroundColor: theme.primarySoft },
          ]}
        >
          <View style={styles.recommendationHeader}>
            <SymbolView
              tintColor={theme.primary}
              name={{
                ios: "scope",
                android: "center_focus_strong",
                web: "center_focus_strong",
              }}
              size={19}
            />
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              가장 먼저 보완할 영역
            </ThemedText>
          </View>
          <ThemedText type="smallBold">
            {selectedItem.readiness.recommendationTitle}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {selectedItem.readiness.recommendationDescription}
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${selectedItem.exam.shortTitle} 준비도 추천 학습 시작`}
            onPress={() => onStartRecommendation(selectedItem)}
            style={({ pressed }) => [
              styles.actionButton,
              { backgroundColor: theme.primary },
              pressed && styles.actionPressed,
            ]}
          >
            <ThemedText type="smallBold" style={styles.actionText}>
              추천 학습 바로 시작
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
        </View>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: 800,
  },
  examSelector: {
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
  card: {
    gap: Spacing.four,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.four,
  },
  scoreCircle: {
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderRadius: 46,
  },
  score: {
    fontSize: 33,
    lineHeight: 38,
    fontWeight: 900,
  },
  scoreUnit: {
    fontSize: 10,
    lineHeight: 14,
  },
  summaryCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  examTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  examEmoji: {
    fontSize: 17,
    lineHeight: 23,
  },
  readinessLabel: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: 900,
  },
  factorList: {
    gap: Spacing.three,
  },
  factor: {
    gap: Spacing.one,
  },
  factorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  factorCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  recommendation: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  recommendationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  actionButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    marginTop: Spacing.one,
    borderRadius: Radius.medium,
  },
  actionText: {
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.72,
  },
  actionPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
