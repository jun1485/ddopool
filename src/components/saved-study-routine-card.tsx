import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { CustomSessionPreset } from "@/storage/custom-session-preset-store";
import type { Exam } from "@/types/exam";

interface SavedStudyRoutineCardProps {
  preset: CustomSessionPreset;
  exam: Exam;
  onStart: () => void;
  onEdit: () => void;
}

// 저장 루틴 출제 전략 표시
function getStrategyLabel(strategy: CustomSessionPreset["strategy"]): string {
  if (strategy === "weakness") return "취약 우선";
  if (strategy === "random") return "랜덤";
  return "과목 균형";
}

// 홈 저장 학습 루틴 빠른 시작 카드
export function SavedStudyRoutineCard({
  preset,
  exam,
  onStart,
  onEdit,
}: SavedStudyRoutineCardProps) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: theme.successSoft }]}>
          <SymbolView
            tintColor={theme.success}
            name={{
              ios: "bolt.fill",
              android: "bolt",
              web: "bolt",
            }}
            size={22}
          />
        </View>
        <View style={styles.headerCopy}>
          <ThemedText type="small" themeColor="textSecondary">
            저장한 학습 루틴
          </ThemedText>
          <ThemedText type="smallBold">
            {exam.icon} {exam.shortTitle}
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${exam.shortTitle} 학습 루틴 편집`}
          onPress={onEdit}
          hitSlop={Spacing.two}
          style={({ pressed }) => [
            styles.editButton,
            { backgroundColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            tintColor={theme.textSecondary}
            name={{
              ios: "slider.horizontal.3",
              android: "tune",
              web: "tune",
            }}
            size={18}
          />
        </Pressable>
      </View>

      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <ThemedText style={styles.summaryValue}>
            {preset.questionCount}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            문제
          </ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.summaryItem}>
          <ThemedText style={styles.summaryValue}>
            {preset.selectedSubjects.length}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            과목
          </ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.summaryItem}>
          <ThemedText type="smallBold">
            {preset.mode === "mock" ? "모의고사" : "바로 학습"}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {getStrategyLabel(preset.strategy)}
          </ThemedText>
        </View>
      </View>

      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {preset.selectedSubjects.join(" · ")}
      </ThemedText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${exam.shortTitle} 저장 루틴 바로 시작`}
        onPress={onStart}
        style={({ pressed }) => [
          styles.startButton,
          { backgroundColor: theme.success },
          pressed && styles.startPressed,
        ]}
      >
        <SymbolView
          tintColor={theme.onPrimary}
          name={{
            ios: "play.fill",
            android: "play_arrow",
            web: "play_arrow",
          }}
          size={18}
        />
        <ThemedText type="smallBold" style={styles.startText}>
          저장 루틴 바로 시작
        </ThemedText>
      </Pressable>
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
    gap: Spacing.three,
  },
  icon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  headerCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  editButton: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.small,
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
    fontSize: 20,
    lineHeight: 27,
    fontWeight: 900,
  },
  divider: {
    width: 1,
    height: 34,
  },
  startButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderRadius: Radius.medium,
  },
  startText: {
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
