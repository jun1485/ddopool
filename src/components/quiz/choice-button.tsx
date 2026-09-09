import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ShakeOffsets, Springs, Timings } from "@/constants/motion";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

// 보기 렌더링 상태 (idle: 기본, selected: 선택됨, correct: 정답, wrong: 오답)
export type ChoiceState = "idle" | "selected" | "correct" | "wrong";

export interface ChoiceButtonProps {
  label: string;
  index: number;
  state: ChoiceState;
  disabled?: boolean;
  onPress: () => void;
}

// 퀴즈 보기 선택 버튼
export function ChoiceButton({
  label,
  index,
  state,
  disabled = false,
  onPress,
}: ChoiceButtonProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const stateProgress = useSharedValue(state === "idle" ? 0 : 1);
  const emphasisScale = useSharedValue(1);
  const shakeOffset = useSharedValue(0);

  // 채점 상태별 카드·배지 색상 매핑
  const palette = {
    idle: {
      card: theme.backgroundElement,
      border: theme.backgroundElement,
      badge: theme.backgroundSelected,
      badgeText: theme.textSecondary,
    },
    selected: {
      card: theme.backgroundSelected,
      border: theme.primary,
      badge: theme.primary,
      badgeText: theme.onPrimary,
    },
    correct: {
      card: theme.successSoft,
      border: theme.success,
      badge: theme.success,
      badgeText: theme.onPrimary,
    },
    wrong: {
      card: theme.dangerSoft,
      border: theme.danger,
      badge: theme.danger,
      badgeText: theme.onPrimary,
    },
  }[state];
  const badgeLabel =
    state === "correct"
      ? "✓"
      : state === "wrong"
        ? "✕"
        : String.fromCharCode(65 + index);

  // 상태 전환 시 색상 보간 진행값 갱신
  useEffect(() => {
    const target = state === "idle" ? 0 : 1;
    stateProgress.value = reduceMotion
      ? target
      : withTiming(target, Timings.fast);
  }, [reduceMotion, state, stateProgress]);

  // 정답은 팝, 오답은 좌우 흔들림으로 채점 결과 강조
  useEffect(() => {
    if (reduceMotion) return;
    if (state === "correct") {
      emphasisScale.value = withSequence(
        withSpring(1.035, Springs.pop),
        withSpring(1, Springs.pop),
      );
      return;
    }
    if (state === "wrong") {
      shakeOffset.value = withSequence(
        ...ShakeOffsets.map((offset) => withTiming(offset, { duration: 55 })),
      );
    }
  }, [emphasisScale, reduceMotion, shakeOffset, state]);

  const cardStyle = useAnimatedStyle(
    () => ({
      backgroundColor: interpolateColor(
        stateProgress.value,
        [0, 1],
        [theme.backgroundElement, palette.card],
      ),
      borderColor: interpolateColor(
        stateProgress.value,
        [0, 1],
        [theme.backgroundElement, palette.border],
      ),
      transform: [
        { translateX: shakeOffset.value },
        { scale: emphasisScale.value },
      ],
    }),
    [palette.border, palette.card, theme.backgroundElement],
  );

  return (
    <Animated.View style={[styles.card, cardStyle]}>
      <Pressable
        accessibilityRole="radio"
        accessibilityState={{ checked: state === "selected", disabled }}
        aria-checked={state === "selected"}
        accessibilityLabel={`${String.fromCharCode(65 + index)}. ${label}`}
        disabled={disabled}
        onPress={onPress}
      >
        <View style={styles.button}>
          <View style={[styles.badge, { backgroundColor: palette.badge }]}>
            <ThemedText type="smallBold" style={{ color: palette.badgeText }}>
              {badgeLabel}
            </ThemedText>
          </View>
          <ThemedText style={styles.label}>{label}</ThemedText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    overflow: "hidden",
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.twoHalf,
    minHeight: 52,
    paddingVertical: Spacing.twoHalf,
    paddingHorizontal: Spacing.twoHalf,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
  },
});
