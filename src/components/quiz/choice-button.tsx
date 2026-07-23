import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
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

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: state === "selected", disabled }}
      aria-checked={state === "selected"}
      accessibilityLabel={`${String.fromCharCode(65 + index)}. ${label}`}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.card, borderColor: palette.border },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.badge, { backgroundColor: palette.badge }]}>
        <ThemedText type="smallBold" style={{ color: palette.badgeText }}>
          {String.fromCharCode(65 + index)}
        </ThemedText>
      </View>
      <ThemedText style={styles.label}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    minHeight: 62,
    borderWidth: 1.5,
    borderRadius: Radius.medium,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: Radius.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
});
