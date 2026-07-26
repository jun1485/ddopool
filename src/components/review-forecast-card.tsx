import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { ReviewForecast } from "@/learning/review-forecast";

interface ReviewForecastCardProps {
  forecast: ReviewForecast;
  examLabels: Record<string, string>;
  sessionSize: number;
  onStart: (questionIds: string[]) => void;
}

// 날짜별 복습량 예보 카드
export function ReviewForecastCard({
  forecast,
  examLabels,
  sessionSize,
  onStart,
}: ReviewForecastCardProps) {
  const theme = useTheme();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedDay = forecast.days[selectedIndex] ?? forecast.days[0];
  const maxCount = Math.max(...forecast.days.map((day) => day.count), 1);
  const selectedExamCounts = Object.entries(selectedDay.examCounts).sort(
    (left, right) => right[1] - left[1],
  );
  const startCount = Math.min(selectedDay.count, sessionSize);

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <ThemedText style={styles.sectionTitle}>7일 복습 예보</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            복습이 몰리는 날을 확인하고 미리 나눠 학습
          </ThemedText>
        </View>
        <View
          style={[styles.peakBadge, { backgroundColor: theme.warningSoft }]}
        >
          <SymbolView
            tintColor={theme.warning}
            name={{
              ios: "chart.bar.fill",
              android: "bar_chart",
              web: "bar_chart",
            }}
            size={15}
          />
          <ThemedText type="smallBold" style={{ color: theme.warning }}>
            최대 {forecast.peakDay.count}
          </ThemedText>
        </View>
      </View>

      <ThemedView type="backgroundElement" style={styles.card}>
        <View style={styles.chart}>
          {forecast.days.map((day, index) => {
            const isSelected = selectedIndex === index;
            const barHeight =
              day.count === 0 ? 4 : 12 + (day.count / maxCount) * 44;

            return (
              <Pressable
                key={day.dateKey}
                accessibilityRole="radio"
                accessibilityLabel={`${day.dayLabel} ${day.dateLabel}, 복습 ${day.count}문제`}
                accessibilityState={{ checked: isSelected }}
                onPress={() => setSelectedIndex(index)}
                style={({ pressed }) => [
                  styles.dayButton,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.dayContent,
                    {
                      backgroundColor: isSelected
                        ? theme.primarySoft
                        : "transparent",
                      borderColor: isSelected ? theme.primary : "transparent",
                    },
                  ]}
                >
                  <ThemedText
                    type="smallBold"
                    style={{
                      color: isSelected ? theme.primary : theme.textSecondary,
                    }}
                  >
                    {day.count}
                  </ThemedText>
                  <View style={styles.barArea}>
                    <View
                      style={[
                        styles.bar,
                        {
                          height: barHeight,
                          backgroundColor: isSelected
                            ? theme.primary
                            : day.count === 0
                              ? theme.border
                              : theme.primarySoft,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText
                    type="small"
                    style={[
                      styles.dayLabel,
                      {
                        color: isSelected
                          ? theme.primary
                          : theme.textSecondary,
                      },
                    ]}
                  >
                    {day.dayLabel}
                  </ThemedText>
                  <ThemedText
                    type="small"
                    style={[styles.dateLabel, { color: theme.textSecondary }]}
                  >
                    {day.dateLabel}
                  </ThemedText>
                </View>
              </Pressable>
            );
          })}
        </View>

        <View
          style={[styles.detailPanel, { backgroundColor: theme.primarySoft }]}
        >
          <View style={styles.detailTop}>
            <View style={styles.detailCopy}>
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                {selectedDay.dayLabel} 복습 일정
              </ThemedText>
              <ThemedText style={styles.detailCount}>
                {selectedDay.count}문제
              </ThemedText>
            </View>
            <View
              style={[
                styles.calendarIcon,
                { backgroundColor: theme.backgroundElement },
              ]}
            >
              <SymbolView
                tintColor={theme.primary}
                name={{
                  ios: "calendar.badge.clock",
                  android: "event_upcoming",
                  web: "event_upcoming",
                }}
                size={22}
              />
            </View>
          </View>

          {selectedExamCounts.length > 0 ? (
            <View style={styles.examChips}>
              {selectedExamCounts.slice(0, 3).map(([examId, count]) => (
                <View
                  key={examId}
                  style={[
                    styles.examChip,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <ThemedText type="small" themeColor="textSecondary">
                    {examLabels[examId] ?? examId}
                  </ThemedText>
                  <ThemedText type="smallBold">{count}</ThemedText>
                </View>
              ))}
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              예정된 복습이 없어 새로운 문제를 학습하기 좋은 날이에요.
            </ThemedText>
          )}

          {selectedDay.count > 0 && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${selectedDay.dayLabel} 복습 일정 ${startCount}문제 미리 학습`}
              onPress={() => onStart(selectedDay.questionIds)}
              style={({ pressed }) => [
                styles.startButton,
                { backgroundColor: theme.primary },
                pressed && styles.startPressed,
              ]}
            >
              <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                {selectedDay.isToday ? "오늘 일정 학습" : "미리 학습"} ·{" "}
                {startCount}문제
              </ThemedText>
              <SymbolView
                tintColor={theme.onPrimary}
                name={{
                  ios: "arrow.right",
                  android: "arrow_forward",
                  web: "arrow_forward",
                }}
                size={17}
              />
            </Pressable>
          )}
        </View>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  headerCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: 800,
  },
  peakBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  card: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.one,
  },
  dayButton: {
    minWidth: 0,
    flex: 1,
  },
  dayContent: {
    alignItems: "center",
    gap: Spacing.half,
    paddingHorizontal: Spacing.half,
    paddingVertical: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.small,
  },
  barArea: {
    height: 58,
    justifyContent: "flex-end",
  },
  bar: {
    width: 9,
    minHeight: 4,
    borderRadius: Radius.pill,
  },
  dayLabel: {
    lineHeight: 15,
    fontWeight: 700,
  },
  dateLabel: {
    fontSize: 10,
    lineHeight: 13,
  },
  detailPanel: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  detailTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  detailCopy: {
    gap: Spacing.half,
  },
  detailCount: {
    fontSize: 25,
    lineHeight: 32,
    fontWeight: 900,
  },
  calendarIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  examChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
  },
  examChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  startButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
  },
  pressed: {
    opacity: 0.72,
  },
  startPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
