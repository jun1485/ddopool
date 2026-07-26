import { StyleSheet } from "react-native";
import Animated from "react-native-reanimated";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useSelectionTransition } from "@/hooks/use-selection-transition";
import { useTheme } from "@/hooks/use-theme";

export interface AnimatedChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
  activeColor?: string;
  idleTextColor?: string;
}

// 선택 상태가 부드럽게 전환되는 필터 칩
export function AnimatedChip({
  label,
  selected,
  onPress,
  accessibilityLabel,
  activeColor,
  idleTextColor,
}: AnimatedChipProps) {
  const theme = useTheme();
  const accent = activeColor ?? theme.primary;
  const chipStyle = useSelectionTransition(selected, {
    background: [theme.backgroundElement, accent],
    border: [theme.border, accent],
    scaleTo: 1.03,
  });

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
    >
      <Animated.View style={[styles.chip, chipStyle]}>
        <ThemedText
          type="smallBold"
          style={{
            color: selected ? theme.onPrimary : (idleTextColor ?? theme.text),
          }}
        >
          {label}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: 36,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.pill,
  },
});
