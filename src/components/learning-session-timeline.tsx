import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { LearningSessionResult } from "@/storage/learning-session-history-store";
import type { Exam, QuizMode } from "@/types/exam";

type TimelineFilter = "all" | "learn" | "review" | "mock";

interface LearningSessionTimelineProps {
  results: LearningSessionResult[];
  exams: Exam[];
  isLoading: boolean;
  onRepeat: (result: LearningSessionResult) => void;
}

const FILTER_OPTIONS: { id: TimelineFilter; label: string }[] = [
  { id: "all", label: "전체" },
  { id: "learn", label: "학습" },
  { id: "review", label: "복습" },
  { id: "mock", label: "모의고사" },
];

// 완료 세션 모드 표시
function getModeLabel(mode: QuizMode): string {
  if (mode === "mock") return "모의고사";
  if (mode === "review") return "복습";
  if (mode === "bookmarks") return "북마크";
  return "학습";
}

// 완료 세션 소요 시간 표시
function formatSessionDuration(durationSeconds: number): string {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return minutes === 0 ? `${seconds}초` : `${minutes}분 ${seconds}초`;
}

// 완료 세션 시각 표시
function formatSessionTime(completedAt: number): string {
  const date = new Date(completedAt);
  return `${date.getMonth() + 1}.${date.getDate()} ${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
}

// 완료 세션 시험 제목 표시
function getSessionExamTitle(
  result: LearningSessionResult,
  exams: Exam[],
): string {
  if (result.examIds.length !== 1) return "여러 시험";
  return (
    exams.find((exam) => exam.id === result.examIds[0])?.shortTitle ?? "시험"
  );
}

// 최근 완료 학습 세션 타임라인
export function LearningSessionTimeline({
  results,
  exams,
  isLoading,
  onRepeat,
}: LearningSessionTimelineProps) {
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const theme = useTheme();
  const filteredResults = results
    .filter((result) => {
      if (filter === "all") return true;
      if (filter === "learn")
        return result.mode === "learn" || result.mode === "bookmarks";
      return result.mode === filter;
    })
    .slice(0, 8);

  return (
    <View style={styles.section}>
      <View>
        <ThemedText style={styles.sectionTitle}>최근 학습 타임라인</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          완료한 세션의 시간·정답률 기록
        </ThemedText>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        {FILTER_OPTIONS.map((option) => {
          const selected = filter === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              onPress={() => setFilter(option.id)}
              style={({ pressed }) => [
                styles.filterChip,
                {
                  backgroundColor: selected
                    ? theme.primary
                    : theme.backgroundElement,
                  borderColor: selected ? theme.primary : theme.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{ color: selected ? theme.onPrimary : theme.text }}
              >
                {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <ThemedView type="backgroundElement" style={styles.emptyState}>
          <ThemedText type="small" themeColor="textSecondary">
            최근 학습을 불러오는 중이에요.
          </ThemedText>
        </ThemedView>
      ) : filteredResults.length === 0 ? (
        <ThemedView type="backgroundElement" style={styles.emptyState}>
          <View
            style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}
          >
            <SymbolView
              tintColor={theme.primary}
              name={{
                ios: "clock.arrow.circlepath",
                android: "history",
                web: "history",
              }}
              size={25}
            />
          </View>
          <ThemedText type="smallBold">완료한 세션이 없어요</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            학습을 마치면 이곳에 회차별로 기록돼요.
          </ThemedText>
        </ThemedView>
      ) : (
        <View style={styles.timeline}>
          {filteredResults.map((result, index) => {
            const accuracy =
              result.questionCount === 0
                ? 0
                : Math.round(
                    (result.correctCount / result.questionCount) * 100,
                  );
            const accent =
              result.mode === "mock"
                ? theme.warning
                : result.mode === "review"
                  ? theme.success
                  : theme.primary;
            const softAccent =
              result.mode === "mock"
                ? theme.warningSoft
                : result.mode === "review"
                  ? theme.successSoft
                  : theme.primarySoft;
            return (
              <View key={result.id} style={styles.timelineRow}>
                <View style={styles.rail}>
                  <View style={[styles.railDot, { backgroundColor: accent }]} />
                  {index < filteredResults.length - 1 && (
                    <View
                      style={[
                        styles.railLine,
                        { backgroundColor: theme.border },
                      ]}
                    />
                  )}
                </View>
                <ThemedView type="backgroundElement" style={styles.sessionCard}>
                  <View style={styles.sessionHeader}>
                    <View
                      style={[
                        styles.modeBadge,
                        { backgroundColor: softAccent },
                      ]}
                    >
                      <ThemedText type="smallBold" style={{ color: accent }}>
                        {getModeLabel(result.mode)}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatSessionTime(result.completedAt)}
                    </ThemedText>
                  </View>
                  <View style={styles.sessionMain}>
                    <View style={styles.sessionCopy}>
                      <ThemedText type="smallBold">
                        {getSessionExamTitle(result, exams)}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {result.answeredCount}/{result.questionCount}문제 응답 ·{" "}
                        {formatSessionDuration(result.durationSeconds)}
                      </ThemedText>
                    </View>
                    <ThemedText style={[styles.accuracy, { color: accent }]}>
                      {accuracy}%
                    </ThemedText>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${getSessionExamTitle(result, exams)} 같은 범위 다시 학습`}
                    onPress={() => onRepeat(result)}
                    style={({ pressed }) => [
                      styles.repeatButton,
                      { backgroundColor: softAccent },
                      pressed && styles.pressed,
                    ]}
                  >
                    <SymbolView
                      tintColor={accent}
                      name={{
                        ios: "arrow.clockwise",
                        android: "refresh",
                        web: "refresh",
                      }}
                      size={16}
                    />
                    <ThemedText type="smallBold" style={{ color: accent }}>
                      같은 범위 다시 시작
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: 800,
  },
  filterRow: {
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  filterChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.pill,
  },
  emptyState: {
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  timeline: {
    gap: 0,
  },
  timelineRow: {
    minHeight: 142,
    flexDirection: "row",
    gap: Spacing.two,
  },
  rail: {
    width: 18,
    alignItems: "center",
  },
  railDot: {
    width: 12,
    height: 12,
    marginTop: Spacing.three,
    borderRadius: Radius.pill,
  },
  railLine: {
    width: 2,
    flex: 1,
  },
  sessionCard: {
    flex: 1,
    gap: Spacing.two,
    marginBottom: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  modeBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  sessionMain: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  sessionCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  accuracy: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: 900,
  },
  repeatButton: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
    borderRadius: Radius.small,
  },
  pressed: {
    opacity: 0.76,
  },
});
