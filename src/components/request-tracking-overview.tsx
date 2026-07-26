import { StyleSheet, View } from "react-native";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type {
  RequestTrackingFilter,
  RequestTrackingSummary,
} from "@/learning/exam-request-tracking";

interface RequestTrackingOverviewProps {
  summary: RequestTrackingSummary;
  selectedFilter: RequestTrackingFilter;
  onSelectFilter: (filter: RequestTrackingFilter) => void;
}

const FILTERS: {
  value: RequestTrackingFilter;
  label: string;
  icon: string;
}[] = [
  { value: "all", label: "전체", icon: "📬" },
  { value: "active", label: "진행 중", icon: "🛠️" },
  { value: "published", label: "학습 가능", icon: "✅" },
  { value: "closed", label: "종료", icon: "📁" },
];

// 내 요청 상태 요약·필터
export function RequestTrackingOverview({
  summary,
  selectedFilter,
  onSelectFilter,
}: RequestTrackingOverviewProps) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View>
        <ThemedText type="smallBold">내 요청 현황</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          작성한 요청과 공감한 공개 요청의 제작 상태를 확인해요
        </ThemedText>
      </View>
      <View style={styles.filterRow}>
        {FILTERS.map((filter) => {
          const selected = selectedFilter === filter.value;
          return (
            <Pressable
              key={filter.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${filter.label} 요청 ${summary[filter.value]}개`}
              onPress={() => onSelectFilter(filter.value)}
              style={({ pressed }) => [
                styles.filter,
                {
                  backgroundColor: selected
                    ? theme.primarySoft
                    : theme.backgroundSelected,
                  borderColor: selected ? theme.primary : "transparent",
                },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText style={styles.filterIcon}>{filter.icon}</ThemedText>
              <ThemedText
                style={[
                  styles.filterCount,
                  { color: selected ? theme.primary : theme.text },
                ]}
              >
                {summary[filter.value]}
              </ThemedText>
              <ThemedText
                style={[
                  styles.filterLabel,
                  {
                    color: selected ? theme.primary : theme.textSecondary,
                  },
                ]}
              >
                {filter.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  filterRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  filter: {
    minWidth: 0,
    flex: 1,
    alignItems: "center",
    gap: Spacing.half,
    paddingHorizontal: Spacing.half,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  filterIcon: {
    fontSize: 17,
    lineHeight: 23,
  },
  filterCount: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: 900,
  },
  filterLabel: {
    fontSize: 10,
    lineHeight: 14,
    fontWeight: 700,
  },
  pressed: {
    opacity: 0.72,
    transform: [{ scale: 0.98 }],
  },
});
