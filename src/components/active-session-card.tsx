import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { AnimatedProgressBar } from "@/components/motion/animated-progress-bar";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Durations } from "@/constants/motion";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { ActiveQuizSession } from "@/storage/active-quiz-session-store";

interface ActiveSessionCardProps {
  session: ActiveQuizSession;
  title: string;
  onResume: () => void;
  onDiscard: () => void;
}

// 세션 모드 표시 문구 생성
function getSessionModeLabel(mode: ActiveQuizSession["mode"]): string {
  if (mode === "review") return "스마트 복습";
  if (mode === "bookmarks") return "저장 문제";
  return "맞춤 학습";
}

// 이어 풀기 세션 카드
export function ActiveSessionCard({
  session,
  title,
  onResume,
  onDiscard,
}: ActiveSessionCardProps) {
  const [discardConfirming, setDiscardConfirming] = useState(false);
  const theme = useTheme();
  const completedCount = session.answers.length;
  const progress = Math.min(completedCount / session.questions.length, 1);

  // 세션 폐기 확인 단계 전환
  const handleDiscard = () => {
    if (!discardConfirming) {
      setDiscardConfirming(true);
      return;
    }
    onDiscard();
    setDiscardConfirming(false);
  };

  return (
    <ThemedView
      type="backgroundElement"
      style={[styles.card, { borderColor: theme.primarySoft }]}
    >
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
          <SymbolView
            tintColor={theme.primary}
            name={{
              ios: "play.circle.fill",
              android: "play_circle",
              web: "play_circle",
            }}
            size={25}
          />
        </View>
        <View style={styles.headerCopy}>
          <View style={styles.eyebrow}>
            <View
              style={[styles.liveDot, { backgroundColor: theme.success }]}
            />
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              이어 풀 수 있어요
            </ThemedText>
          </View>
          <ThemedText type="smallBold" numberOfLines={1}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {getSessionModeLabel(session.mode)} · {completedCount}/
            {session.questions.length}문제 완료
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            discardConfirming
              ? "이어 풀기 기록 삭제 확인"
              : "이어 풀기 기록 삭제"
          }
          onPress={handleDiscard}
          hitSlop={Spacing.two}
          style={({ pressed }) => [
            styles.discardButton,
            discardConfirming && { backgroundColor: theme.dangerSoft },
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            tintColor={discardConfirming ? theme.danger : theme.textSecondary}
            name={{
              ios: discardConfirming ? "trash.fill" : "xmark",
              android: discardConfirming ? "delete" : "close",
              web: discardConfirming ? "delete" : "close",
            }}
            size={18}
          />
        </Pressable>
      </View>

      <AnimatedProgressBar
        progress={progress}
        height={7}
        color={theme.primary}
        trackColor={theme.backgroundSelected}
      />

      {discardConfirming ? (
        <Animated.View
          key="discard-confirm"
          entering={FadeIn.duration(Durations.fast)}
          exiting={FadeOut.duration(Durations.instant)}
          style={[styles.confirmRow, { backgroundColor: theme.dangerSoft }]}
        >
          <ThemedText
            type="small"
            style={[styles.confirmText, { color: theme.danger }]}
          >
            현재 위치만 삭제되고 이미 푼 기록은 유지돼요
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이어 풀기 삭제 취소"
            onPress={() => setDiscardConfirming(false)}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <ThemedText type="smallBold" style={{ color: theme.danger }}>
              취소
            </ThemedText>
          </Pressable>
        </Animated.View>
      ) : (
        <Animated.View
          key="resume-action"
          entering={FadeIn.duration(Durations.fast)}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${title} ${session.currentIndex + 1}문제부터 이어 풀기`}
            onPress={onResume}
            style={({ pressed }) => [
              styles.resumeButton,
              { backgroundColor: theme.primary },
              pressed && styles.primaryPressed,
            ]}
          >
            <ThemedText type="smallBold" style={styles.resumeText}>
              {session.currentIndex > 0
                ? `${session.currentIndex + 1}문제부터 이어 풀기`
                : "첫 문제부터 이어 풀기"}
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
        </Animated.View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
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
  eyebrow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: Radius.pill,
  },
  discardButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  resumeButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderRadius: Radius.medium,
  },
  resumeText: {
    color: "#FFFFFF",
  },
  confirmRow: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
  },
  confirmText: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
  primaryPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
