import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { MotionPressable } from "@/components/motion-pressable";
import { RevealView } from "@/components/motion/reveal-view";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  loadDailyStats,
  subscribeStudyActivity,
  toDateKey,
} from "@/storage/stats-store";

// 미학습일 마감 임박 안내
export function StudyDeadlineCard() {
  const theme = useTheme();
  const [hoursLeft, setHoursLeft] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    // 오늘 풀이 여부와 마감 시간 갱신
    const refresh = async () => {
      const stats = await loadDailyStats();
      const now = new Date();
      if (active)
        setHoursLeft(
          now.getHours() >= 21 &&
            (stats[toDateKey(now.getTime())]?.answered ?? 0) === 0
            ? 24 - now.getHours()
            : null,
        );
    };
    void refresh();
    const unsubscribe = subscribeStudyActivity(() => void refresh());
    const interval = setInterval(() => void refresh(), 60_000);
    return () => {
      active = false;
      unsubscribe();
      clearInterval(interval);
    };
  }, []);
  if (hoursLeft == null) return null;
  return (
    <RevealView variant="fade" duration={180}>
      <View
        accessibilityRole="alert"
        style={[
          styles.card,
          {
            backgroundColor: theme.reminderUrgentSoft,
            borderColor: theme.reminderUrgent,
          },
        ]}
      >
        <ThemedText type="smallBold" style={{ color: theme.reminderUrgent }}>
          오늘 학습 마감까지 {hoursLeft}시간 이내
        </ThemedText>
        <ThemedText type="small">
          한 문제면 오늘의 학습 기록을 이어갈 수 있어요.
        </ThemedText>
        <MotionPressable
          accessibilityRole="button"
          accessibilityLabel="지금 풀 문제 찾기"
          onPress={() => router.push("/catalog")}
          style={styles.action}
        >
          <ThemedText type="smallBold" style={{ color: theme.reminderUrgent }}>
            지금 풀 문제 찾기 →
          </ThemedText>
        </MotionPressable>
      </View>
    </RevealView>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: Spacing.three,
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  action: { minHeight: 44, justifyContent: "center" },
});
