import { router, type Href } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnimatedProgressBar } from "@/components/motion/animated-progress-bar";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { PageHead } from "@/components/page-head";
import { PullRefreshControl } from "@/components/pull-refresh-control";
import { SectionHeader } from "@/components/section-header";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import {
  BottomTabInset,
  MaxContentWidth,
  Radius,
  Spacing,
  TabScreenEdges,
} from "@/constants/theme";
import { useDailyStats } from "@/hooks/use-daily-stats";
import { useExamCatalog } from "@/hooks/use-exam-catalog";
import { useExamEnrollment } from "@/hooks/use-exam-enrollment";
import { useLearningReport } from "@/hooks/use-learning-report";
import { useTheme } from "@/hooks/use-theme";
import { AccuracyStat } from "@/storage/stats-store";

// 리포트 하단 이동 메뉴
const LINKS: { href: Href; label: string; icon: SymbolViewProps["name"] }[] = [
  {
    href: "/activity",
    label: "학습 기록 자세히 보기",
    icon: { ios: "calendar", android: "calendar_month", web: "calendar_month" },
  },
  {
    href: "/progress",
    label: "성장 기록·배지",
    icon: { ios: "medal", android: "military_tech", web: "military_tech" },
  },
  {
    href: "/study-plan-settings",
    label: "시험일·목표 점수 설정",
    icon: { ios: "flag", android: "flag", web: "flag" },
  },
];

// 정답률 백분율 계산
function getAccuracy(stat: AccuracyStat): number {
  return stat.answered === 0
    ? 0
    : Math.round((stat.correct / stat.answered) * 100);
}

// 누적 학습 리포트 화면
export default function ReportScreen() {
  const { lifetime, performance } = useLearningReport();
  const { weeklyActivity, streak } = useDailyStats();
  const { exams } = useExamCatalog();
  const { examIds } = useExamEnrollment();
  const theme = useTheme();
  const myExams = exams.filter((exam) => examIds.includes(exam.id));
  const weeklyAnswered = weeklyActivity.reduce(
    (total, activity) => total + activity.answered,
    0,
  );
  const maxDailyAnswered = Math.max(
    ...weeklyActivity.map((activity) => activity.answered),
    1,
  );
  const summary = [
    { label: "푼 문제", value: `${lifetime.answered}` },
    {
      label: "정답률",
      value: lifetime.answered > 0 ? `${getAccuracy(lifetime)}%` : "–",
    },
    { label: "연속 학습", value: `${streak}일` },
  ];

  return (
    <ThemedView style={styles.container}>
      <PageHead
        title="리포트"
        description="정답률·학습 시간·과목별 취약점을 한눈에 보는 학습 통계."
      />
      <SafeAreaView edges={TabScreenEdges} style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<PullRefreshControl />}
        >
          <ThemedText type="subtitle">리포트</ThemedText>

          <ThemedView type="backgroundElement" style={styles.summaryCard}>
            {summary.map((item, index) => (
              <View key={item.label} style={styles.summaryItem}>
                {index > 0 && (
                  <View
                    style={[
                      styles.summaryDivider,
                      { backgroundColor: theme.border },
                    ]}
                  />
                )}
                <ThemedText style={styles.summaryValue}>{item.value}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {item.label}
                </ThemedText>
              </View>
            ))}
          </ThemedView>

          <View style={styles.section}>
            <SectionHeader
              title="최근 7일"
              subtitle={`${weeklyAnswered}문제`}
            />
            <ThemedView type="backgroundElement" style={styles.weekCard}>
              {weeklyActivity.map((activity) => (
                <View key={activity.dateKey} style={styles.dayColumn}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {activity.answered || ""}
                  </ThemedText>
                  <View style={styles.barArea}>
                    <View
                      style={[
                        styles.activityBar,
                        {
                          height:
                            activity.answered === 0
                              ? Spacing.one
                              : 12 + (activity.answered / maxDailyAnswered) * 40,
                          backgroundColor: activity.isToday
                            ? theme.primary
                            : theme.primarySoft,
                        },
                      ]}
                    />
                  </View>
                  <ThemedText
                    type="small"
                    style={[
                      styles.dayLabel,
                      activity.isToday && {
                        color: theme.primary,
                        fontWeight: 700,
                      },
                    ]}
                  >
                    {activity.dayLabel}
                  </ThemedText>
                </View>
              ))}
            </ThemedView>
          </View>

          {myExams.length > 0 && (
            <View style={styles.section}>
              <SectionHeader title="시험별 정답률" />
              <ThemedView type="backgroundElement" style={styles.listCard}>
                {myExams.map((exam, index) => {
                  const stat = performance.byExam[exam.id] ?? {
                    answered: 0,
                    correct: 0,
                  };
                  const accuracy = getAccuracy(stat);
                  return (
                    <View
                      key={exam.id}
                      style={[
                        styles.examRow,
                        index > 0 && {
                          borderTopWidth: 1,
                          borderTopColor: theme.border,
                        },
                      ]}
                    >
                      <View style={styles.examTitleRow}>
                        <ThemedText type="smallBold">
                          {exam.icon} {exam.shortTitle}
                        </ThemedText>
                        <ThemedText
                          type="smallBold"
                          style={{
                            color:
                              stat.answered > 0
                                ? theme.primary
                                : theme.textSecondary,
                          }}
                        >
                          {stat.answered > 0
                            ? `${accuracy}% · ${stat.correct}/${stat.answered}`
                            : "아직 안 풀었어요"}
                        </ThemedText>
                      </View>
                      <AnimatedProgressBar
                        progress={accuracy / 100}
                        height={6}
                        color={theme.primary}
                        trackColor={theme.backgroundSelected}
                      />
                    </View>
                  );
                })}
              </ThemedView>
            </View>
          )}

          <ThemedView type="backgroundElement" style={styles.listCard}>
            {LINKS.map((link, index) => (
              <Pressable
                key={link.label}
                accessibilityRole="button"
                onPress={() => router.push(link.href)}
                style={({ pressed }) => [
                  styles.linkRow,
                  index > 0 && {
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  tintColor={theme.textSecondary}
                  name={link.icon}
                  size={20}
                />
                <ThemedText type="smallBold" style={styles.linkLabel}>
                  {link.label}
                </ThemedText>
                <SymbolView
                  tintColor={theme.textSecondary}
                  name={{
                    ios: "chevron.right",
                    android: "chevron_right",
                    web: "chevron_right",
                  }}
                  size={18}
                />
              </Pressable>
            ))}
          </ThemedView>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    minWidth: 0,
  },
  safeArea: {
    flex: 1,
    width: "100%",
    minWidth: 0,
    maxWidth: MaxContentWidth,
  },
  content: {
    minWidth: 0,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.three,
  },
  summaryCard: {
    flexDirection: "row",
    paddingVertical: Spacing.three,
    borderRadius: Radius.large,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.half,
  },
  summaryDivider: {
    position: "absolute",
    left: 0,
    top: Spacing.one,
    bottom: Spacing.one,
    width: 1,
  },
  summaryValue: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: 800,
  },
  section: {
    gap: Spacing.two,
  },
  weekCard: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.three,
    borderRadius: Radius.large,
  },
  dayColumn: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.one,
  },
  barArea: {
    height: 54,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  activityBar: {
    width: 14,
    minHeight: Spacing.one,
    borderRadius: Radius.pill,
  },
  dayLabel: {
    fontSize: 11,
    lineHeight: 16,
  },
  listCard: {
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.large,
  },
  examRow: {
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  examTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  linkRow: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.twoHalf,
  },
  linkLabel: {
    flex: 1,
  },
  pressed: {
    opacity: 0.72,
  },
});
