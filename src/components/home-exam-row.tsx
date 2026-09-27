import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { AnimatedProgressBar } from "@/components/motion/animated-progress-bar";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { Exam } from "@/types/exam";

interface HomeExamRowProps {
  exam: Exam;
  studied: number;
  total: number;
  dueCount: number;
  isRecent: boolean;
  accent: string;
  softAccent: string;
  onCustomize: () => void;
  onStart: () => void;
}

// 내 시험 진도와 바로 학습 행
export function HomeExamRow({
  exam,
  studied,
  total,
  dueCount,
  isRecent,
  accent,
  softAccent,
  onCustomize,
  onStart,
}: HomeExamRowProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${exam.title} 맞춤 학습 구성`}
        onPress={onCustomize}
        style={({ pressed }) => [styles.body, pressed && styles.pressed]}
      >
        <View style={[styles.icon, { backgroundColor: softAccent }]}>
          <ThemedText style={styles.iconText}>{exam.icon}</ThemedText>
        </View>
        <View style={styles.copy}>
          <View style={styles.titleRow}>
            <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
              {exam.shortTitle}
            </ThemedText>
            {isRecent && (
              <ThemedText type="small" themeColor="textSecondary">
                최근
              </ThemedText>
            )}
            {dueCount > 0 && (
              <View
                style={[styles.badge, { backgroundColor: theme.dangerSoft }]}
              >
                <ThemedText
                  type="smallBold"
                  style={[styles.badgeText, { color: theme.danger }]}
                >
                  복습 {dueCount}
                </ThemedText>
              </View>
            )}
          </View>
          <AnimatedProgressBar
            progress={total === 0 ? 0 : studied / total}
            height={5}
            color={accent}
            trackColor={softAccent}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {studied}/{total}문제 학습
          </ThemedText>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${exam.shortTitle} 학습 시작`}
        onPress={onStart}
        hitSlop={Spacing.one}
        style={({ pressed }) => [
          styles.play,
          { backgroundColor: softAccent },
          pressed && styles.pressed,
        ]}
      >
        <SymbolView
          tintColor={accent}
          name={{ ios: "play.fill", android: "play_arrow", web: "play_arrow" }}
          size={18}
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.twoHalf,
  },
  body: {
    minWidth: 0,
    flex: 1,
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
  iconText: {
    fontSize: 20,
    lineHeight: 27,
  },
  copy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.one,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  title: {
    flexShrink: 1,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  badgeText: {
    fontSize: 12,
    lineHeight: 16,
  },
  play: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.pill,
  },
  pressed: {
    opacity: 0.68,
  },
});
