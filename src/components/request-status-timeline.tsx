import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import type { ExamRequestStatusHistoryRow } from "../../packages/contracts/src";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ExamRequestStatus } from "@/types/exam-request";

const FLOW_STEPS: {
  status: ExamRequestStatus;
  label: string;
  description: string;
}[] = [
  {
    status: "requested",
    label: "요청 접수",
    description: "시험 정보와 수요가 등록됐어요",
  },
  {
    status: "triage",
    label: "운영 검토",
    description: "수요·자료·저작권 가능성을 확인해요",
  },
  {
    status: "approved",
    label: "추가 확정",
    description: "시험과 출제 범위 구성을 준비해요",
  },
  {
    status: "sourcing",
    label: "자료 확보",
    description: "공식 기준과 사용 가능한 자료를 모아요",
  },
  {
    status: "draft",
    label: "문제 제작",
    description: "문제·보기·정답·해설 초안을 만들어요",
  },
  {
    status: "review",
    label: "품질 검수",
    description: "정답 타당성과 출처를 최종 확인해요",
  },
  {
    status: "published",
    label: "학습 공개",
    description: "내 시험에 추가해 바로 학습할 수 있어요",
  },
];

const EXCEPTION_LABELS: Partial<Record<ExamRequestStatus, string>> = {
  duplicate: "동일한 기존 요청에 통합됐어요.",
  rejected: "현재 기준으로 시험 추가가 보류됐어요.",
  blocked: "자료 또는 권리 확인이 필요해 진행이 멈춰 있어요.",
  archived: "운영이 종료된 요청이에요.",
  cancelled: "직접 취소한 요청이에요.",
};

interface RequestStatusTimelineProps {
  status: ExamRequestStatus;
  history?: ExamRequestStatusHistoryRow[];
}

// 요청 변경 날짜 표시
function formatHistoryDate(value: string): string {
  const date = new Date(value);
  return `${date.getFullYear()}.${`${date.getMonth() + 1}`.padStart(2, "0")}.${`${date.getDate()}`.padStart(2, "0")}`;
}

// 시험 요청 진행 단계 타임라인
export function RequestStatusTimeline({
  status,
  history = [],
}: RequestStatusTimelineProps) {
  const theme = useTheme();
  const currentIndex = FLOW_STEPS.findIndex((step) => step.status === status);
  const exceptionMessage = EXCEPTION_LABELS[status];

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View>
        <ThemedText style={styles.title}>진행 타임라인</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          요청부터 학습 공개까지의 준비 과정
        </ThemedText>
      </View>

      {exceptionMessage != null && (
        <View
          style={[styles.exception, { backgroundColor: theme.warningSoft }]}
        >
          <SymbolView
            tintColor={theme.warning}
            name={{
              ios: "exclamationmark.circle.fill",
              android: "info",
              web: "info",
            }}
            size={18}
          />
          <ThemedText type="smallBold" style={{ color: theme.warning }}>
            {exceptionMessage}
          </ThemedText>
        </View>
      )}

      <View style={styles.steps}>
        {FLOW_STEPS.map((step, index) => {
          const historyItem = history.find(
            (item) => item.to_status === step.status,
          );
          const completed =
            currentIndex >= 0 ? index < currentIndex : historyItem != null;
          const current = index === currentIndex;
          const active = completed || current;
          return (
            <View key={step.status} style={styles.step}>
              <View style={styles.rail}>
                <View
                  style={[
                    styles.node,
                    {
                      backgroundColor: active
                        ? theme.primary
                        : theme.backgroundSelected,
                      borderColor: active ? theme.primary : theme.border,
                    },
                  ]}
                >
                  {completed ? (
                    <SymbolView
                      tintColor={theme.onPrimary}
                      name={{
                        ios: "checkmark",
                        android: "check",
                        web: "check",
                      }}
                      size={14}
                    />
                  ) : (
                    <View
                      style={[
                        styles.nodeDot,
                        {
                          backgroundColor: current
                            ? theme.onPrimary
                            : theme.textSecondary,
                        },
                      ]}
                    />
                  )}
                </View>
                {index < FLOW_STEPS.length - 1 && (
                  <View
                    style={[
                      styles.line,
                      {
                        backgroundColor: completed
                          ? theme.primary
                          : theme.border,
                      },
                    ]}
                  />
                )}
              </View>
              <View style={styles.stepCopy}>
                <ThemedText
                  type="smallBold"
                  style={{
                    color: current
                      ? theme.primary
                      : active
                        ? theme.text
                        : theme.textSecondary,
                  }}
                >
                  {step.label}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {step.description}
                </ThemedText>
                {historyItem != null && (
                  <ThemedText
                    type="small"
                    style={{
                      color: active ? theme.primary : theme.textSecondary,
                    }}
                  >
                    {formatHistoryDate(historyItem.created_at)}
                    {historyItem.note == null ? "" : ` · ${historyItem.note}`}
                  </ThemedText>
                )}
              </View>
              {current && (
                <View
                  style={[
                    styles.currentBadge,
                    { backgroundColor: theme.primarySoft },
                  ]}
                >
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    현재
                  </ThemedText>
                </View>
              )}
            </View>
          );
        })}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: Spacing.four,
    padding: Spacing.four,
    borderRadius: Radius.large,
  },
  title: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: 700,
  },
  exception: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  steps: {
    gap: 0,
  },
  step: {
    minHeight: 66,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.three,
  },
  rail: {
    width: 28,
    alignItems: "center",
  },
  node: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: Radius.pill,
  },
  nodeDot: {
    width: 6,
    height: 6,
    borderRadius: Radius.pill,
  },
  line: {
    width: 2,
    flex: 1,
    minHeight: 38,
  },
  stepCopy: {
    flex: 1,
    gap: Spacing.half,
    paddingBottom: Spacing.three,
  },
  currentBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
});
