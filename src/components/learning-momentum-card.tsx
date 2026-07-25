import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  calculateLearningProgression,
  createDailyQuests,
} from "@/learning/progression";
import type { AccuracyStat, DailyStat } from "@/storage/stats-store";

interface LearningMomentumCardProps {
  lifetime: AccuracyStat;
  today: DailyStat;
  dailyGoal: number;
  unlockedAchievementCount: number;
  onOpenProgress: () => void;
}

// 학습 레벨·일일 퀘스트 카드
export function LearningMomentumCard({
  lifetime,
  today,
  dailyGoal,
  unlockedAchievementCount,
  onOpenProgress,
}: LearningMomentumCardProps) {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();
  const progression = calculateLearningProgression(lifetime);
  const quests = createDailyQuests(today, dailyGoal);
  const completedCount = quests.filter((quest) => quest.completed).length;
  const nextQuest = quests.find((quest) => !quest.completed);

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`레벨 ${progression.level}, 오늘의 퀘스트 ${completedCount}개 완료`}
        onPress={() => setExpanded((current) => !current)}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <View style={styles.header}>
          <View style={[styles.levelBadge, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.levelText}>
              LV.{progression.level}
            </ThemedText>
          </View>
          <View style={styles.headerCopy}>
            <View style={styles.titleRow}>
              <ThemedText type="smallBold">학습 레벨</ThemedText>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {progression.totalXp} XP
              </ThemedText>
            </View>
            <View
              style={[
                styles.levelTrack,
                { backgroundColor: theme.primarySoft },
              ]}
            >
              <View
                style={[
                  styles.levelFill,
                  {
                    width: `${progression.levelProgress * 100}%`,
                    backgroundColor: theme.primary,
                  },
                ]}
              />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              다음 레벨까지{" "}
              {Math.max(progression.nextLevelXp - progression.totalXp, 0)} XP
            </ThemedText>
          </View>
          <SymbolView
            tintColor={theme.textSecondary}
            name={{
              ios: expanded ? "chevron.up" : "chevron.down",
              android: expanded ? "expand_less" : "expand_more",
              web: expanded ? "expand_less" : "expand_more",
            }}
            size={19}
          />
        </View>
      </Pressable>

      <View style={[styles.separator, { backgroundColor: theme.border }]} />

      <View style={styles.questSummary}>
        <View>
          <ThemedText type="smallBold">오늘의 퀘스트</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {nextQuest == null
              ? "오늘 퀘스트를 모두 완료했어요"
              : `${nextQuest.icon} ${nextQuest.description}`}
          </ThemedText>
        </View>
        <View
          style={[
            styles.questCount,
            {
              backgroundColor:
                completedCount === quests.length
                  ? theme.successSoft
                  : theme.warningSoft,
            },
          ]}
        >
          <ThemedText
            type="smallBold"
            style={{
              color:
                completedCount === quests.length
                  ? theme.success
                  : theme.warning,
            }}
          >
            {completedCount}/{quests.length}
          </ThemedText>
        </View>
      </View>

      {expanded && (
        <View style={styles.questList}>
          {quests.map((quest) => (
            <View key={quest.id} style={styles.questRow}>
              <View
                style={[
                  styles.questIcon,
                  {
                    backgroundColor: quest.completed
                      ? theme.successSoft
                      : theme.backgroundSelected,
                  },
                ]}
              >
                <ThemedText>{quest.completed ? "✓" : quest.icon}</ThemedText>
              </View>
              <View style={styles.questBody}>
                <View style={styles.titleRow}>
                  <ThemedText type="smallBold">{quest.label}</ThemedText>
                  <ThemedText
                    type="smallBold"
                    style={{
                      color: quest.completed
                        ? theme.success
                        : theme.textSecondary,
                    }}
                  >
                    {quest.progress}/{quest.target}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.questTrack,
                    { backgroundColor: theme.backgroundSelected },
                  ]}
                >
                  <View
                    style={[
                      styles.questFill,
                      {
                        width: `${(quest.progress / quest.target) * 100}%`,
                        backgroundColor: quest.completed
                          ? theme.success
                          : theme.warning,
                      },
                    ]}
                  />
                </View>
              </View>
            </View>
          ))}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="전체 레벨과 업적 보기"
            onPress={onOpenProgress}
            style={({ pressed }) => [
              styles.progressButton,
              { backgroundColor: theme.primarySoft },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              업적 {unlockedAchievementCount}개 해제 · 전체 보기
            </ThemedText>
            <SymbolView
              tintColor={theme.primary}
              name={{
                ios: "chevron.right",
                android: "chevron_right",
                web: "chevron_right",
              }}
              size={18}
            />
          </Pressable>
        </View>
      )}
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
  levelBadge: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  levelText: {
    color: "#FFFFFF",
    fontSize: 15,
    lineHeight: 20,
    fontWeight: 800,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  levelTrack: {
    height: 7,
    overflow: "hidden",
    borderRadius: Radius.pill,
  },
  levelFill: {
    height: "100%",
    borderRadius: Radius.pill,
  },
  separator: {
    height: 1,
  },
  questSummary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  questCount: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  questList: {
    gap: Spacing.three,
  },
  questRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  questIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  questBody: {
    flex: 1,
    gap: Spacing.one,
  },
  questTrack: {
    height: 5,
    overflow: "hidden",
    borderRadius: Radius.pill,
  },
  questFill: {
    height: "100%",
    borderRadius: Radius.pill,
  },
  progressButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
    borderRadius: Radius.medium,
  },
  pressed: {
    opacity: 0.76,
  },
});
