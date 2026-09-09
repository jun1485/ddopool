import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { quizStyles as styles } from "@/components/quiz/quiz-styles";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useSelectionTransition } from "@/hooks/use-selection-transition";
import { useTheme } from "@/hooks/use-theme";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import Animated from "react-native-reanimated";
interface CtaButtonProps {
  label: string;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  onPress: () => void;
}

// 하단 주요 동작 버튼
export function CtaButton({
  label,
  disabled = false,
  variant = "primary",
  onPress,
}: CtaButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === "primary";
  const foregroundColor =
    variant === "primary"
      ? theme.onPrimary
      : variant === "danger"
        ? theme.danger
        : theme.text;
  const backgroundColor =
    variant === "primary"
      ? theme.primary
      : variant === "danger"
        ? theme.dangerSoft
        : theme.backgroundSelected;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cta,
        {
          backgroundColor,
          borderColor: isPrimary ? theme.primary : theme.border,
        },
        disabled && styles.ctaDisabled,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText type="smallBold" style={{ color: foregroundColor }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

interface ToggleIconButtonProps {
  active: boolean;
  accessibilityLabel: string;
  activeColor: string;
  activeBackground: string;
  iconName: SymbolViewProps["name"];
  onPress: () => void;
}

// 상태 전환이 부드러운 아이콘 토글 버튼
export function ToggleIconButton({
  active,
  accessibilityLabel,
  activeColor,
  activeBackground,
  iconName,
  onPress,
}: ToggleIconButtonProps) {
  const theme = useTheme();
  const toggleStyle = useSelectionTransition(active, {
    background: [theme.backgroundElement, activeBackground],
    border: [theme.border, activeColor],
    scaleTo: 1.08,
  });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: active }}
      hitSlop={Spacing.two}
      onPress={onPress}
    >
      <Animated.View style={[styles.bookmarkButton, toggleStyle]}>
        <SymbolView
          tintColor={active ? activeColor : theme.textSecondary}
          name={iconName}
          size={19}
        />
      </Animated.View>
    </Pressable>
  );
}

interface ReviewFilterChipProps {
  label: string;
  selected: boolean;
  activeTextColor: string;
  onPress: () => void;
}

// 답안 리뷰 필터 세그먼트 버튼
export function ReviewFilterChip({
  label,
  selected,
  activeTextColor,
  onPress,
}: ReviewFilterChipProps) {
  const theme = useTheme();
  const chipStyle = useSelectionTransition(selected, {
    background: ["rgba(0, 0, 0, 0)", theme.backgroundElement],
  });

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={styles.reviewFilterSlot}
    >
      <Animated.View style={[styles.reviewFilterChip, chipStyle]}>
        <ThemedText
          type="smallBold"
          style={{ color: selected ? activeTextColor : theme.textSecondary }}
        >
          {label}
        </ThemedText>
      </Animated.View>
    </Pressable>
  );
}
