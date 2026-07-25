import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { ExamRequest, ExamRequestStatus } from "@/types/exam-request";

const STATUS_LABELS: Record<ExamRequestStatus, string> = {
  requested: "요청 접수",
  triage: "검토 중",
  approved: "추가 확정",
  sourcing: "자료 확보 중",
  draft: "문제 제작 중",
  review: "품질 검수 중",
  published: "학습 가능",
  duplicate: "기존 요청에 통합",
  rejected: "추가 보류",
  blocked: "진행 보류",
  archived: "요청 종료",
  cancelled: "요청 취소",
};

const STATUS_PROGRESS: Record<ExamRequestStatus, number> = {
  requested: 0.12,
  triage: 0.24,
  approved: 0.46,
  sourcing: 0.6,
  draft: 0.72,
  review: 0.86,
  published: 1,
  duplicate: 0,
  rejected: 0,
  blocked: 0.46,
  archived: 0,
  cancelled: 0,
};

interface ExamRequestCardProps {
  request: ExamRequest;
  onToggleVote: () => void;
  onManage?: () => void;
  onStartPublishedExam?: (examId: string) => void;
  compact?: boolean;
}

// 시험 요청 등록일 표시
function formatRequestDate(timestamp: number): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
  }).format(timestamp);
}

// 시험 요청 상태 카드
export function ExamRequestCard({
  request,
  onToggleVote,
  onManage,
  onStartPublishedExam,
  compact = false,
}: ExamRequestCardProps) {
  const theme = useTheme();
  const publishedExamId = request.publishedExamId;
  const isInactive = [
    "duplicate",
    "rejected",
    "archived",
    "cancelled",
  ].includes(request.status);
  const statusColor = isInactive
    ? theme.danger
    : request.status === "published"
      ? theme.success
      : theme.primary;
  const statusSoftColor = isInactive
    ? theme.dangerSoft
    : request.status === "published"
      ? theme.successSoft
      : theme.primarySoft;

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <ThemedText type="smallBold" numberOfLines={2}>
            {request.examName}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {[request.organization, request.level]
              .filter(Boolean)
              .join(" · ") || "주관 기관 미입력"}
          </ThemedText>
        </View>
        <View
          style={[styles.statusBadge, { backgroundColor: statusSoftColor }]}
        >
          <ThemedText type="smallBold" style={{ color: statusColor }}>
            {STATUS_LABELS[request.status]}
          </ThemedText>
        </View>
      </View>

      {!compact && !isInactive && (
        <View style={styles.progressBlock}>
          <View
            style={[styles.progressTrack, { backgroundColor: theme.border }]}
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${STATUS_PROGRESS[request.status] * 100}%`,
                  backgroundColor: statusColor,
                },
              ]}
            />
          </View>
          <View style={styles.progressMeta}>
            <ThemedText type="small" themeColor="textSecondary">
              접수
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              문제 준비
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              공개
            </ThemedText>
          </View>
        </View>
      )}

      {!compact &&
        request.status === "published" &&
        publishedExamId != null &&
        onStartPublishedExam != null && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${request.examName} 내 시험에 추가하고 학습 시작`}
            onPress={() => onStartPublishedExam(publishedExamId)}
            style={({ pressed }) => [
              styles.publishedButton,
              { backgroundColor: theme.success },
              pressed && styles.publishedPressed,
            ]}
          >
            <SymbolView
              tintColor={theme.onPrimary}
              name={{
                ios: "play.fill",
                android: "play_arrow",
                web: "play_arrow",
              }}
              size={17}
            />
            <ThemedText type="smallBold" style={styles.publishedButtonText}>
              내 시험에 추가하고 학습 시작
            </ThemedText>
          </Pressable>
        )}

      <View style={styles.footer}>
        <ThemedText type="small" themeColor="textSecondary">
          {formatRequestDate(request.createdAt)} 요청
        </ThemedText>
        <View style={styles.footerActions}>
          {onManage != null && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="시험 요청 상세 관리"
              onPress={onManage}
              style={({ pressed }) => [
                styles.manageButton,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold" themeColor="textSecondary">
                상세·수정
              </ThemedText>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              request.hasVoted ? "시험 요청 공감 취소" : "시험 요청에 공감"
            }
            accessibilityState={{ selected: request.hasVoted }}
            disabled={request.status === "cancelled"}
            onPress={onToggleVote}
            style={({ pressed }) => [
              styles.voteButton,
              {
                backgroundColor: request.hasVoted
                  ? theme.primarySoft
                  : theme.backgroundSelected,
              },
              request.status === "cancelled" && styles.disabled,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              tintColor={request.hasVoted ? theme.primary : theme.textSecondary}
              name={{
                ios: request.hasVoted ? "hand.thumbsup.fill" : "hand.thumbsup",
                android: request.hasVoted ? "thumb_up" : "thumb_up_off_alt",
                web: request.hasVoted ? "thumb_up" : "thumb_up_off_alt",
              }}
              size={16}
            />
            <ThemedText
              type="smallBold"
              style={{
                color: request.hasVoted ? theme.primary : theme.textSecondary,
              }}
            >
              {request.voteCount}
            </ThemedText>
          </Pressable>
        </View>
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
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
  },
  titleBlock: {
    flex: 1,
    gap: Spacing.half,
  },
  statusBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  progressBlock: {
    gap: Spacing.one,
  },
  progressTrack: {
    height: 6,
    overflow: "hidden",
    borderRadius: Radius.pill,
  },
  progressFill: {
    height: "100%",
    borderRadius: Radius.pill,
  },
  progressMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  publishedButton: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderRadius: Radius.medium,
  },
  publishedButtonText: {
    color: "#FFFFFF",
  },
  footer: {
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  footerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
  },
  manageButton: {
    minHeight: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  voteButton: {
    minWidth: 58,
    minHeight: 34,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.7,
  },
  publishedPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
