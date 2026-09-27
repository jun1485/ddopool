import { StyleSheet, View } from "react-native";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionAccessibilityLabel?: string;
  onAction?: () => void;
}

// 화면 구획 제목과 보조 동작
export function SectionHeader({
  title,
  subtitle,
  actionLabel,
  actionAccessibilityLabel,
  onAction,
}: SectionHeaderProps) {
  const theme = useTheme();

  return (
    <View style={styles.header}>
      <View style={styles.copy}>
        <ThemedText style={styles.title}>{title}</ThemedText>
        {subtitle != null && (
          <ThemedText type="small" themeColor="textSecondary">
            {subtitle}
          </ThemedText>
        )}
      </View>
      {actionLabel != null && onAction != null && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={actionAccessibilityLabel ?? actionLabel}
          onPress={onAction}
          hitSlop={Spacing.two}
          style={({ pressed }) => [
            styles.action,
            { backgroundColor: theme.backgroundSelected },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold" themeColor="textSecondary">
            {actionLabel}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  copy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: 800,
  },
  action: {
    minHeight: 32,
    justifyContent: "center",
    paddingHorizontal: Spacing.twoHalf,
    borderRadius: Radius.pill,
  },
  pressed: {
    opacity: 0.68,
  },
});
