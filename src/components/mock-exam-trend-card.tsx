import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type { MockExamResult } from "@/storage/mock-exam-history-store";
import type { Exam } from "@/types/exam";

interface MockExamTrendCardProps {
  exams: Exam[];
  results: MockExamResult[];
  target: { examId: string; targetScore?: number } | null;
  isLoading: boolean;
  onStart: (examId: string) => void;
}

// 모의고사 점수 백분율 계산
function getScore(result: MockExamResult): number {
  return result.questionCount === 0
    ? 0
    : Math.round((result.correctCount / result.questionCount) * 100);
}

// 모의고사 소요 시간 표시
function formatDuration(durationSeconds: number): string {
  const minutes = Math.floor(durationSeconds / 60);
  const seconds = durationSeconds % 60;
  return minutes === 0 ? `${seconds}초` : `${minutes}분 ${seconds}초`;
}

// 모의고사 완료 시각 표시
function formatCompletedAt(completedAt: number): string {
  const date = new Date(completedAt);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
}

// 모의고사 회차별 점수 추세 카드
export function MockExamTrendCard({
  exams,
  results,
  target,
  isLoading,
  onStart,
}: MockExamTrendCardProps) {
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const theme = useTheme();
  const selectedExam =
    exams.find((exam) => exam.id === selectedExamId) ?? exams[0];

  if (selectedExam == null) return null;

  const examResults = results.filter((result) =>
    result.examIds.includes(selectedExam.id),
  );
  const selectedResult =
    examResults.find((result) => result.id === selectedResultId) ??
    examResults[0];
  const chartResults = examResults.slice(0, 5).reverse();
  const averageScore =
    examResults.length === 0
      ? 0
      : Math.round(
          examResults.reduce((total, result) => total + getScore(result), 0) /
            examResults.length,
        );
  const bestScore = Math.max(...examResults.map(getScore), 0);
  const latestScore = examResults[0] == null ? 0 : getScore(examResults[0]);
  const targetScore =
    target?.examId === selectedExam.id ? (target.targetScore ?? null) : null;
  const previousScore =
    examResults[1] == null ? null : getScore(examResults[1]);
  const scoreDelta = previousScore == null ? null : latestScore - previousScore;
  const selectedSubjectResults =
    selectedResult?.subjectResults.filter(
      (subject) => subject.examId === selectedExam.id,
    ) ?? [];

  return (
    <View style={styles.section}>
      <View>
        <ThemedText style={styles.sectionTitle}>모의고사 추세</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          회차별 점수와 과목별 약점 비교
        </ThemedText>
      </View>

      {exams.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.examSelector}
        >
          {exams.map((exam) => {
            const selected = exam.id === selectedExam.id;
            return (
              <Pressable
                key={exam.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                accessibilityLabel={`${exam.shortTitle} 모의고사 선택`}
                onPress={() => {
                  setSelectedExamId(exam.id);
                  setSelectedResultId(null);
                }}
                style={({ pressed }) => [
                  styles.examChip,
                  {
                    backgroundColor: selected
                      ? theme.primary
                      : theme.backgroundElement,
                    borderColor: selected ? theme.primary : theme.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="small">{exam.icon}</ThemedText>
                <ThemedText
                  type="smallBold"
                  style={{ color: selected ? theme.onPrimary : theme.text }}
                >
                  {exam.shortTitle}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <ThemedView type="backgroundElement" style={styles.card}>
        {isLoading ? (
          <View style={styles.emptyState}>
            <ThemedText type="small" themeColor="textSecondary">
              모의고사 기록을 불러오는 중이에요.
            </ThemedText>
          </View>
        ) : selectedResult == null ? (
          <View style={styles.emptyState}>
            <View
              style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}
            >
              <SymbolView
                tintColor={theme.primary}
                name={{
                  ios: "chart.bar.fill",
                  android: "bar_chart",
                  web: "bar_chart",
                }}
                size={27}
              />
            </View>
            <ThemedText type="smallBold">
              아직 모의고사 기록이 없어요
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.centerText}
            >
              첫 회차를 완료하면 점수 변화와 과목별 결과를 보여드려요.
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${selectedExam.shortTitle} 첫 모의고사 시작`}
              onPress={() => onStart(selectedExam.id)}
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.primary },
                pressed && styles.actionPressed,
              ]}
            >
              <ThemedText type="smallBold" style={styles.primaryButtonText}>
                첫 모의고사 시작
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
          </View>
        ) : (
          <>
            <View style={styles.metrics}>
              <View style={styles.metric}>
                <ThemedText
                  style={[styles.metricValue, { color: theme.primary }]}
                >
                  {latestScore}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  최근 점수
                </ThemedText>
              </View>
              <View
                style={[
                  styles.metricDivider,
                  { backgroundColor: theme.border },
                ]}
              />
              <View style={styles.metric}>
                <ThemedText style={styles.metricValue}>
                  {averageScore}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  평균
                </ThemedText>
              </View>
              <View
                style={[
                  styles.metricDivider,
                  { backgroundColor: theme.border },
                ]}
              />
              <View style={styles.metric}>
                <ThemedText
                  style={[styles.metricValue, { color: theme.success }]}
                >
                  {bestScore}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  최고
                </ThemedText>
              </View>
            </View>

            {targetScore != null && (
              <View
                style={[
                  styles.targetCard,
                  {
                    backgroundColor:
                      latestScore >= targetScore
                        ? theme.successSoft
                        : theme.warningSoft,
                  },
                ]}
              >
                <View style={styles.targetHeader}>
                  <View style={styles.targetTitle}>
                    <SymbolView
                      tintColor={
                        latestScore >= targetScore
                          ? theme.success
                          : theme.warning
                      }
                      name={{
                        ios: "target",
                        android: "track_changes",
                        web: "track_changes",
                      }}
                      size={19}
                    />
                    <ThemedText type="smallBold">
                      목표 {targetScore}점
                    </ThemedText>
                  </View>
                  <ThemedText
                    type="smallBold"
                    style={{
                      color:
                        latestScore >= targetScore
                          ? theme.success
                          : theme.warning,
                    }}
                  >
                    {latestScore >= targetScore
                      ? `${latestScore - targetScore}점 초과 달성`
                      : `${targetScore - latestScore}점 남음`}
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.targetTrack,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <View
                    style={[
                      styles.targetFill,
                      {
                        width: `${Math.min((latestScore / targetScore) * 100, 100)}%`,
                        backgroundColor:
                          latestScore >= targetScore
                            ? theme.success
                            : theme.warning,
                      },
                    ]}
                  />
                </View>
              </View>
            )}

            <View style={styles.chartHeader}>
              <ThemedText type="smallBold">
                최근 {chartResults.length}회
              </ThemedText>
              {scoreDelta != null && (
                <ThemedText
                  type="smallBold"
                  style={{
                    color: scoreDelta >= 0 ? theme.success : theme.danger,
                  }}
                >
                  이전 대비 {scoreDelta >= 0 ? "+" : ""}
                  {scoreDelta}점
                </ThemedText>
              )}
            </View>
            <View style={styles.chart}>
              {chartResults.map((result, index) => {
                const score = getScore(result);
                const selected = result.id === selectedResult.id;
                return (
                  <Pressable
                    key={result.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    accessibilityLabel={`${index + 1}회차 ${score}점 결과 보기`}
                    onPress={() => setSelectedResultId(result.id)}
                    style={styles.barColumn}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{
                        color: selected ? theme.primary : theme.textSecondary,
                      }}
                    >
                      {score}
                    </ThemedText>
                    <View style={styles.barArea}>
                      <View
                        style={[
                          styles.scoreBar,
                          {
                            height: 12 + score * 0.58,
                            backgroundColor: selected
                              ? theme.primary
                              : theme.primarySoft,
                          },
                        ]}
                      />
                    </View>
                    <ThemedText
                      type="small"
                      style={{
                        color: selected ? theme.primary : theme.textSecondary,
                      }}
                    >
                      {index + 1}회
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <View
              style={[
                styles.detail,
                { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <View style={styles.detailHeader}>
                <View>
                  <ThemedText type="smallBold">
                    {formatCompletedAt(selectedResult.completedAt)}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {selectedResult.answeredCount}/
                    {selectedResult.questionCount}
                    문제 응답 · {formatDuration(selectedResult.durationSeconds)}
                  </ThemedText>
                </View>
                <ThemedText
                  style={[styles.detailScore, { color: theme.primary }]}
                >
                  {getScore(selectedResult)}점
                </ThemedText>
              </View>

              <View style={styles.subjectList}>
                {selectedSubjectResults.map((subject) => {
                  const accuracy =
                    subject.total === 0
                      ? 0
                      : Math.round((subject.correct / subject.total) * 100);
                  return (
                    <View
                      key={`${subject.examId}:${subject.subject}`}
                      style={styles.subject}
                    >
                      <View style={styles.subjectHeader}>
                        <ThemedText type="small">{subject.subject}</ThemedText>
                        <ThemedText type="smallBold">
                          {subject.correct}/{subject.total} · {accuracy}%
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.subjectTrack,
                          { backgroundColor: theme.border },
                        ]}
                      >
                        <View
                          style={[
                            styles.subjectFill,
                            {
                              width: `${accuracy}%`,
                              backgroundColor:
                                accuracy >= 70
                                  ? theme.success
                                  : accuracy >= 50
                                    ? theme.warning
                                    : theme.danger,
                            },
                          ]}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${selectedExam.shortTitle} 모의고사 다시 시작`}
              onPress={() => onStart(selectedExam.id)}
              style={({ pressed }) => [
                styles.secondaryButton,
                { borderColor: theme.primary },
                pressed && styles.actionPressed,
              ]}
            >
              <SymbolView
                tintColor={theme.primary}
                name={{
                  ios: "arrow.clockwise",
                  android: "refresh",
                  web: "refresh",
                }}
                size={18}
              />
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                같은 시험 다시 도전
              </ThemedText>
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
  sectionTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: 800,
  },
  examSelector: {
    gap: Spacing.two,
    paddingRight: Spacing.four,
  },
  examChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.pill,
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
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.one,
    borderRadius: Radius.medium,
  },
  centerText: {
    maxWidth: 340,
    textAlign: "center",
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    minHeight: 46,
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.medium,
  },
  primaryButtonText: {
    color: "#FFFFFF",
  },
  metrics: {
    flexDirection: "row",
    alignItems: "center",
  },
  metric: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.half,
  },
  metricValue: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 900,
  },
  metricDivider: {
    width: 1,
    height: 36,
  },
  targetCard: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  targetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  targetTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  targetTrack: {
    height: 7,
    overflow: "hidden",
    borderRadius: Radius.pill,
  },
  targetFill: {
    height: "100%",
    borderRadius: Radius.pill,
  },
  chartHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: Spacing.two,
    minHeight: 108,
  },
  barColumn: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.one,
  },
  barArea: {
    height: 70,
    justifyContent: "flex-end",
  },
  scoreBar: {
    width: 22,
    minHeight: 12,
    borderRadius: Radius.small,
  },
  detail: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  detailScore: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 900,
  },
  subjectList: {
    gap: Spacing.two,
  },
  subject: {
    gap: Spacing.one,
  },
  subjectHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  subjectTrack: {
    height: 6,
    overflow: "hidden",
    borderRadius: Radius.pill,
  },
  subjectFill: {
    height: "100%",
    borderRadius: Radius.pill,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  pressed: {
    opacity: 0.8,
  },
  actionPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
});
