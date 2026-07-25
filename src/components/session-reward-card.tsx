import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { SessionRewards } from "@/hooks/use-session-rewards";

interface SessionRewardCardProps {
  earnedXp: number;
  rewards: SessionRewards | null;
  isLoading: boolean;
  onOpenProgress: () => void;
}

// 퀴즈 종료 보상 카드
export function SessionRewardCard({
  earnedXp,
  rewards,
  isLoading,
  onOpenProgress,
}: SessionRewardCardProps) {
  const theme = useTheme();

  if (isLoading || rewards == null)
    return (
      <ThemedView type="backgroundElement" style={styles.loadingCard}>
        <View
          style={[styles.loadingIcon, { backgroundColor: theme.warningSoft }]}
        >
          <ThemedText style={styles.loadingEmoji}>✨</ThemedText>
        </View>
        <View style={styles.loadingCopy}>
          <ThemedText type="smallBold">+{earnedXp} XP 획득</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            레벨과 새 업적을 정리하고 있어요
          </ThemedText>
        </View>
      </ThemedView>
    );

  const remainingXp = Math.max(
    rewards.progression.nextLevelXp - rewards.progression.totalXp,
    0,
  );

  return (
    <Animated.View entering={FadeInDown.duration(320)}>
      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.header}>
          <View style={[styles.levelBadge, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.levelText}>
              LV.{rewards.progression.level}
            </ThemedText>
          </View>
          <View style={styles.headerCopy}>
            <View style={styles.titleRow}>
              <ThemedText type="smallBold">
                {rewards.levelUp
                  ? `레벨 ${rewards.previousLevel} → ${rewards.progression.level}`
                  : "학습 경험치 누적"}
              </ThemedText>
              <ThemedText type="smallBold" style={{ color: theme.warning }}>
                +{rewards.earnedXp} XP
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
                    width: `${rewards.progression.levelProgress * 100}%`,
                    backgroundColor: theme.primary,
                  },
                ]}
              />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {rewards.levelUp
                ? "새 레벨을 달성했어요!"
                : `다음 레벨까지 ${remainingXp} XP`}
            </ThemedText>
          </View>
        </View>

        {(rewards.levelUp || rewards.dailyGoalReached) && (
          <View style={styles.milestoneRow}>
            {rewards.levelUp && (
              <View
                style={[
                  styles.milestoneBadge,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.primary }}>
                  🚀 레벨업
                </ThemedText>
              </View>
            )}
            {rewards.dailyGoalReached && (
              <View
                style={[
                  styles.milestoneBadge,
                  { backgroundColor: theme.successSoft },
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.success }}>
                  ✓ 오늘 목표 달성
                </ThemedText>
              </View>
            )}
          </View>
        )}

        <View style={styles.dailyGoal}>
          <View style={styles.titleRow}>
            <ThemedText type="small" themeColor="textSecondary">
              오늘 목표 진행률
            </ThemedText>
            <ThemedText
              type="smallBold"
              style={{
                color:
                  rewards.dailyGoalProgress >= 1
                    ? theme.success
                    : theme.primary,
              }}
            >
              {Math.round(rewards.dailyGoalProgress * 100)}%
            </ThemedText>
          </View>
          <View
            style={[
              styles.dailyGoalTrack,
              { backgroundColor: theme.backgroundSelected },
            ]}
          >
            <View
              style={[
                styles.dailyGoalFill,
                {
                  width: `${rewards.dailyGoalProgress * 100}%`,
                  backgroundColor:
                    rewards.dailyGoalProgress >= 1
                      ? theme.success
                      : theme.primary,
                },
              ]}
            />
          </View>
        </View>

        {rewards.newAchievements.length > 0 && (
          <View style={styles.achievementSection}>
            <View style={styles.sectionHeader}>
              <View>
                <ThemedText type="smallBold">새 업적 해제</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  이번 학습으로 새 배지를 얻었어요
                </ThemedText>
              </View>
              <View
                style={[
                  styles.countBadge,
                  { backgroundColor: theme.warningSoft },
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.warning }}>
                  +{rewards.newAchievements.length}
                </ThemedText>
              </View>
            </View>
            <View style={styles.achievementList}>
              {rewards.newAchievements.map((achievement, index) => (
                <Animated.View
                  key={achievement.id}
                  entering={ZoomIn.delay(index * 90).duration(300)}
                  style={[
                    styles.achievementCard,
                    { backgroundColor: theme.warningSoft },
                  ]}
                >
                  <ThemedText style={styles.achievementEmoji}>
                    {achievement.icon}
                  </ThemedText>
                  <View style={styles.achievementCopy}>
                    <ThemedText type="smallBold">
                      {achievement.title}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      numberOfLines={1}
                    >
                      {achievement.description}
                    </ThemedText>
                  </View>
                </Animated.View>
              ))}
            </View>
          </View>
        )}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="전체 성장 기록 보기"
          onPress={onOpenProgress}
          style={({ pressed }) => [
            styles.progressButton,
            { backgroundColor: theme.primarySoft },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            전체 성장 기록 보기
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
      </ThemedView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
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
    fontWeight: 900,
  },
  headerCopy: {
    minWidth: 0,
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
  milestoneRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  milestoneBadge: {
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  dailyGoal: {
    gap: Spacing.one,
  },
  dailyGoalTrack: {
    height: 6,
    overflow: "hidden",
    borderRadius: Radius.pill,
  },
  dailyGoalFill: {
    height: "100%",
    borderRadius: Radius.pill,
  },
  achievementSection: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  countBadge: {
    minWidth: 34,
    alignItems: "center",
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  achievementList: {
    gap: Spacing.two,
  },
  achievementCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Radius.medium,
  },
  achievementEmoji: {
    fontSize: 24,
    lineHeight: 30,
  },
  achievementCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  progressButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
    borderRadius: Radius.medium,
  },
  loadingCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  loadingIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  loadingEmoji: {
    fontSize: 23,
    lineHeight: 29,
  },
  loadingCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.72,
  },
});
