import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AnimatedProgressBar } from "@/components/motion/animated-progress-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import {
  calculateStudyTimeInsights,
  StudyTimeRange,
} from "@/learning/study-time-insights";
import type { StudyTimeMode } from "@/learning/study-time-insights";
import type { LearningSessionResult } from "@/storage/learning-session-history-store";

interface StudyTimeInsightsCardProps {
  results: LearningSessionResult[];
  evaluatedAt: number;
  isLoading: boolean;
  onOpenActivity: () => void;
}

const MODE_LABELS: Record<StudyTimeMode, string> = {
  learn: "일반 학습",
  review: "복습",
  mock: "모의고사",
};

// 학습 시간 읽기 쉬운 단위 변환
function formatStudyTime(durationSeconds: number): string {
  if (durationSeconds < 60) return `${durationSeconds}초`;
  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  if (hours === 0) return `${minutes}분`;
  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
}

// 기간별 학습 시간 분석 카드
export function StudyTimeInsightsCard({
  results,
  evaluatedAt,
  isLoading,
  onOpenActivity,
}: StudyTimeInsightsCardProps) {
  const [range, setRange] = useState<StudyTimeRange>(7);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const theme = useTheme();
  const insights = calculateStudyTimeInsights(results, range, evaluatedAt);
  const selectedDay =
    insights.days.find((day) => day.dateKey === selectedDateKey) ??
    [...insights.days]
      .reverse()
      .find((day) => day.durationSeconds > 0) ??
    insights.days[insights.days.length - 1];
  const maxDuration = Math.max(
    ...insights.days.map((day) => day.durationSeconds),
    1,
  );
  const modeEntries = (
    Object.entries(insights.byMode) as [StudyTimeMode, number][]
  ).filter(([, duration]) => duration > 0);

  // 학습 시간 조회 기간 전환
  const selectRange = (nextRange: StudyTimeRange) => {
    setRange(nextRange);
    setSelectedDateKey(null);
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <ThemedText style={styles.sectionTitle}>학습 시간 인사이트</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            완료 세션 기준 실제 활성 학습 시간
          </ThemedText>
        </View>
        <View
          style={[
            styles.rangeSelector,
            { backgroundColor: theme.backgroundSelected },
          ]}
        >
          {([7, 30] as const).map((option) => {
            const selected = range === option;
            return (
              <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => selectRange(option)}
                style={({ pressed }) => [
                  styles.rangeButton,
                  selected && { backgroundColor: theme.backgroundElement },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={{
                    color: selected ? theme.primary : theme.textSecondary,
                  }}
                >
                  {option}일
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ThemedView type="backgroundElement" style={styles.card}>
        {isLoading ? (
          <View style={styles.emptyState}>
            <ThemedText type="small" themeColor="textSecondary">
              학습 시간을 분석하는 중이에요.
            </ThemedText>
          </View>
        ) : insights.sessionCount === 0 ? (
          <View style={styles.emptyState}>
            <View
              style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}
            >
              <SymbolView
                tintColor={theme.primary}
                name={{
                  ios: "clock.badge.questionmark",
                  android: "schedule",
                  web: "schedule",
                }}
                size={26}
              />
            </View>
            <ThemedText type="smallBold">아직 시간 기록이 없어요</ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.centerText}
            >
              학습 세션을 완료하면 집중 시간과 패턴을 분석해 드려요.
            </ThemedText>
          </View>
        ) : (
          <>
            <View style={[styles.hero, { backgroundColor: theme.primary }]}>
              <View>
                <ThemedText type="smallBold" style={styles.onPrimaryMuted}>
                  최근 {range}일 총 학습
                </ThemedText>
                <ThemedText style={styles.totalTime}>
                  {formatStudyTime(insights.totalSeconds)}
                </ThemedText>
              </View>
              <View style={styles.heroBadge}>
                <ThemedText type="smallBold" style={styles.onPrimary}>
                  {insights.activeDays}일 활동
                </ThemedText>
              </View>
            </View>

            <View style={styles.metrics}>
              <View style={styles.metric}>
                <ThemedText type="small" themeColor="textSecondary">
                  평균 세션
                </ThemedText>
                <ThemedText type="smallBold">
                  {formatStudyTime(insights.averageSessionSeconds)}
                </ThemedText>
              </View>
              <View
                style={[styles.metricDivider, { backgroundColor: theme.border }]}
              />
              <View style={styles.metric}>
                <ThemedText type="small" themeColor="textSecondary">
                  최장 세션
                </ThemedText>
                <ThemedText type="smallBold">
                  {formatStudyTime(insights.longestSessionSeconds)}
                </ThemedText>
              </View>
              <View
                style={[styles.metricDivider, { backgroundColor: theme.border }]}
              />
              <View style={styles.metric}>
                <ThemedText type="small" themeColor="textSecondary">
                  가장 집중한 날
                </ThemedText>
                <ThemedText type="smallBold">
                  {insights.bestDay?.displayLabel ?? "–"}
                </ThemedText>
              </View>
            </View>

            <ScrollView
              horizontal={range === 30}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[
                styles.chart,
                range === 30 && styles.longChart,
              ]}
            >
              {insights.days.map((day, index) => {
                const selected = day.dateKey === selectedDay?.dateKey;
                return (
                  <Pressable
                    key={day.dateKey}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${day.displayLabel}, ${formatStudyTime(day.durationSeconds)}, ${day.sessionCount}세션`}
                    onPress={() => setSelectedDateKey(day.dateKey)}
                    style={[
                      styles.dayColumn,
                      range === 30 && styles.compactDayColumn,
                    ]}
                  >
                    <View style={styles.barArea}>
                      <View
                        style={[
                          styles.timeBar,
                          {
                            height:
                              day.durationSeconds === 0
                                ? Spacing.one
                                : 8 +
                                  (day.durationSeconds / maxDuration) * 48,
                            backgroundColor: selected
                              ? theme.primary
                              : day.durationSeconds > 0
                                ? theme.primarySoft
                                : theme.backgroundSelected,
                          },
                        ]}
                      />
                    </View>
                    <ThemedText
                      type="small"
                      style={[
                        styles.dayLabel,
                        {
                          color: selected
                            ? theme.primary
                            : theme.textSecondary,
                        },
                      ]}
                    >
                      {range === 7 || index % 5 === 0 || day.isToday
                        ? day.label
                        : "·"}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </ScrollView>

            {selectedDay != null && (
              <View
                style={[
                  styles.dayDetail,
                  { backgroundColor: theme.backgroundSelected },
                ]}
              >
                <View>
                  <ThemedText type="smallBold">
                    {selectedDay.displayLabel}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {selectedDay.sessionCount}세션
                  </ThemedText>
                </View>
                <ThemedText
                  style={[styles.dayDuration, { color: theme.primary }]}
                >
                  {formatStudyTime(selectedDay.durationSeconds)}
                </ThemedText>
              </View>
            )}

            <View style={styles.modeList}>
              {modeEntries.map(([mode, duration]) => {
                const ratio =
                  insights.totalSeconds === 0
                    ? 0
                    : duration / insights.totalSeconds;
                const accent =
                  mode === "mock"
                    ? theme.warning
                    : mode === "review"
                      ? theme.success
                      : theme.primary;
                return (
                  <View key={mode} style={styles.mode}>
                    <View style={styles.modeHeader}>
                      <ThemedText type="small">
                        {MODE_LABELS[mode]}
                      </ThemedText>
                      <ThemedText type="smallBold">
                        {formatStudyTime(duration)} · {Math.round(ratio * 100)}%
                      </ThemedText>
                    </View>
                    <AnimatedProgressBar
                      progress={ratio}
                      height={6}
                      color={accent}
                      trackColor={theme.backgroundSelected}
                    />
                  </View>
                );
              })}
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="전체 학습 활동 기록 열기"
              onPress={onOpenActivity}
              style={({ pressed }) => [
                styles.activityButton,
                { borderColor: theme.primary },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                전체 학습 활동 보기
              </ThemedText>
              <SymbolView
                tintColor={theme.primary}
                name={{
                  ios: "arrow.right",
                  android: "arrow_forward",
                  web: "arrow_forward",
                }}
                size={17}
              />
            </Pressable>
          </>
        )}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: 800,
  },
  rangeSelector: {
    flexDirection: "row",
    gap: Spacing.half,
    padding: Spacing.half,
    borderRadius: Radius.medium,
  },
  rangeButton: {
    minWidth: 48,
    alignItems: "center",
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.small,
  },
  card: {
    gap: Spacing.four,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  emptyState: {
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  centerText: {
    maxWidth: 340,
    textAlign: "center",
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  totalTime: {
    color: "#FFFFFF",
    fontSize: 27,
    lineHeight: 35,
    fontWeight: 900,
  },
  onPrimary: {
    color: "#FFFFFF",
  },
  onPrimaryMuted: {
    color: "rgba(255, 255, 255, 0.76)",
  },
  heroBadge: {
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
  },
  metrics: {
    flexDirection: "row",
    alignItems: "center",
  },
  metric: {
    minWidth: 0,
    flex: 1,
    alignItems: "center",
    gap: Spacing.half,
  },
  metricDivider: {
    width: 1,
    height: 36,
  },
  chart: {
    flexGrow: 1,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  longChart: {
    minWidth: 620,
  },
  dayColumn: {
    minWidth: 0,
    flex: 1,
    alignItems: "center",
    gap: Spacing.one,
  },
  compactDayColumn: {
    width: 20,
    flex: 0,
  },
  barArea: {
    height: 60,
    justifyContent: "flex-end",
  },
  timeBar: {
    width: 14,
    minHeight: Spacing.one,
    borderRadius: Radius.pill,
  },
  dayLabel: {
    fontSize: 10,
    lineHeight: 15,
  },
  dayDetail: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  dayDuration: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: 900,
  },
  modeList: {
    gap: Spacing.two,
  },
  mode: {
    gap: Spacing.one,
  },
  modeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  activityButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  pressed: {
    opacity: 0.76,
  },
});
