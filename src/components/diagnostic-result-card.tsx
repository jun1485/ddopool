import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { DiagnosticAssessment } from "@/learning/diagnostic-assessment";

interface DiagnosticResultCardProps {
  assessment: DiagnosticAssessment;
  onStartPlan: () => void;
}

const LEVELS: DiagnosticAssessment["level"][] = ["starter", "growing", "ready"];

// 빠른 진단 수준·권장 행동 카드
export function DiagnosticResultCard({
  assessment,
  onStartPlan,
}: DiagnosticResultCardProps) {
  const theme = useTheme();
  const levelIndex = LEVELS.indexOf(assessment.level);
  const accent =
    assessment.level === "ready"
      ? theme.success
      : assessment.level === "growing"
        ? theme.primary
        : theme.warning;
  const softAccent =
    assessment.level === "ready"
      ? theme.successSoft
      : assessment.level === "growing"
        ? theme.primarySoft
        : theme.warningSoft;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: softAccent }]}>
          <SymbolView
            tintColor={accent}
            name={{
              ios: "gauge.with.dots.needle.67percent",
              android: "speed",
              web: "speed",
            }}
            size={24}
          />
        </View>
        <View style={styles.headerCopy}>
          <ThemedText type="small" themeColor="textSecondary">
            현재 시작점
          </ThemedText>
          <ThemedText style={[styles.levelLabel, { color: accent }]}>
            {assessment.label}
          </ThemedText>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: softAccent }]}>
          <ThemedText type="smallBold" style={{ color: accent }}>
            {assessment.score}점
          </ThemedText>
        </View>
      </View>

      <View style={styles.levelTrack}>
        {LEVELS.map((level, index) => (
          <View key={level} style={styles.levelSegment}>
            <View
              style={[
                styles.levelDot,
                {
                  backgroundColor:
                    index <= levelIndex ? accent : theme.backgroundSelected,
                  borderColor: index <= levelIndex ? accent : theme.border,
                },
              ]}
            >
              {index === levelIndex && (
                <SymbolView
                  tintColor={theme.onPrimary}
                  name={{
                    ios: "checkmark",
                    android: "check",
                    web: "check",
                  }}
                  size={12}
                />
              )}
            </View>
            {index < LEVELS.length - 1 && (
              <View
                style={[
                  styles.levelLine,
                  {
                    backgroundColor: index < levelIndex ? accent : theme.border,
                  },
                ]}
              />
            )}
          </View>
        ))}
      </View>
      <View style={styles.levelLabels}>
        <ThemedText type="small" themeColor="textSecondary">
          기초
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          보완
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          실전
        </ThemedText>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {assessment.description}
      </ThemedText>

      <View style={[styles.recommendation, { backgroundColor: softAccent }]}>
        <View style={styles.recommendationHeader}>
          <SymbolView
            tintColor={accent}
            name={{
              ios: "sparkles",
              android: "auto_awesome",
              web: "auto_awesome",
            }}
            size={17}
          />
          <ThemedText type="smallBold" style={{ color: accent }}>
            다음 추천
          </ThemedText>
        </View>
        <ThemedText type="smallBold">
          {assessment.focusSubject ?? "기초 문제"}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {assessment.recommendation}
        </ThemedText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="진단 결과 기반 맞춤 학습 만들기"
        onPress={onStartPlan}
        style={({ pressed }) => [
          styles.action,
          { backgroundColor: accent },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText type="smallBold" style={styles.actionText}>
          맞춤 학습 만들기
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
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  icon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  headerCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  levelLabel: {
    fontSize: 19,
    lineHeight: 27,
    fontWeight: 900,
  },
  scoreBadge: {
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  levelTrack: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.two,
  },
  levelSegment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  levelDot: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: Radius.pill,
  },
  levelLine: {
    flex: 1,
    height: 3,
  },
  levelLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: -Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  recommendation: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  recommendationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  action: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderRadius: Radius.medium,
  },
  actionText: {
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
});
