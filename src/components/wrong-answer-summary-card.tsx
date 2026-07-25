import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type {
  WrongAnswerNote,
  WrongAnswerTag,
} from "@/storage/wrong-answer-note-store";

const TAG_LABELS: Record<WrongAnswerTag, string> = {
  concept: "개념 부족",
  calculation: "계산 실수",
  misread: "문제 오독",
  guess: "찍어서 선택",
};
const WRONG_ANSWER_TAGS: WrongAnswerTag[] = [
  "concept",
  "calculation",
  "misread",
  "guess",
];

interface WrongAnswerSummaryCardProps {
  unresolvedNotes: WrongAnswerNote[];
  resolvedCount: number;
  onOpen: () => void;
}

// 가장 많이 기록된 오답 원인 추출
function findMostCommonTag(notes: WrongAnswerNote[]): WrongAnswerTag | null {
  const counts = notes
    .flatMap((note) => note.tags)
    .reduce<
      Partial<Record<WrongAnswerTag, number>>
    >((result, tag) => ({ ...result, [tag]: (result[tag] ?? 0) + 1 }), {});
  const mostCommonTag = [...WRONG_ANSWER_TAGS].sort(
    (left, right) => (counts[right] ?? 0) - (counts[left] ?? 0),
  )[0];
  return mostCommonTag != null && (counts[mostCommonTag] ?? 0) > 0
    ? mostCommonTag
    : null;
}

// 미해결 오답 노트 요약 카드
export function WrongAnswerSummaryCard({
  unresolvedNotes,
  resolvedCount,
  onOpen,
}: WrongAnswerSummaryCardProps) {
  const theme = useTheme();
  const mostCommonTag = findMostCommonTag(unresolvedNotes);
  const totalWrongCount = unresolvedNotes.reduce(
    (total, note) => total + note.wrongCount,
    0,
  );

  return (
    <ThemedView type="backgroundElement" style={styles.card}>
      <View style={styles.header}>
        <View style={[styles.icon, { backgroundColor: theme.dangerSoft }]}>
          <SymbolView
            tintColor={theme.danger}
            name={{
              ios: "pencil.and.list.clipboard",
              android: "edit_note",
              web: "edit_note",
            }}
            size={24}
          />
        </View>
        <View style={styles.headerCopy}>
          <ThemedText type="smallBold">오답·학습 노트</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {unresolvedNotes.length > 0
              ? totalWrongCount > 0
                ? `${unresolvedNotes.length}문제 점검 · 오답 ${totalWrongCount}회`
                : `${unresolvedNotes.length}문제 확신도 점검 필요`
              : "현재 남은 미해결 오답이 없어요"}
          </ThemedText>
        </View>
        <View
          style={[
            styles.countBadge,
            {
              backgroundColor:
                unresolvedNotes.length > 0
                  ? theme.dangerSoft
                  : theme.successSoft,
            },
          ]}
        >
          <ThemedText
            type="smallBold"
            style={{
              color: unresolvedNotes.length > 0 ? theme.danger : theme.success,
            }}
          >
            {unresolvedNotes.length}
          </ThemedText>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <ThemedText type="small" themeColor="textSecondary">
            주요 원인
          </ThemedText>
          <ThemedText type="smallBold">
            {mostCommonTag == null ? "아직 미분류" : TAG_LABELS[mostCommonTag]}
          </ThemedText>
        </View>
        <View style={[styles.divider, { backgroundColor: theme.border }]} />
        <View style={styles.stat}>
          <ThemedText type="small" themeColor="textSecondary">
            해결 완료
          </ThemedText>
          <ThemedText type="smallBold" style={{ color: theme.success }}>
            {resolvedCount}문제
          </ThemedText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`오답 보관함 열기, 미해결 ${unresolvedNotes.length}문제`}
        onPress={onOpen}
        style={({ pressed }) => [
          styles.startButton,
          {
            backgroundColor:
              unresolvedNotes.length > 0
                ? theme.dangerSoft
                : theme.backgroundSelected,
          },
          pressed && styles.pressed,
        ]}
      >
        <ThemedText
          type="smallBold"
          style={{
            color:
              unresolvedNotes.length > 0 ? theme.danger : theme.textSecondary,
          }}
        >
          {unresolvedNotes.length > 0
            ? "오답 보관함에서 골라 학습"
            : "해결한 문제 다시 보기"}
        </ThemedText>
        <SymbolView
          tintColor={
            unresolvedNotes.length > 0 ? theme.danger : theme.textSecondary
          }
          name={{
            ios: unresolvedNotes.length > 0 ? "arrow.right" : "archivebox",
            android:
              unresolvedNotes.length > 0 ? "arrow_forward" : "inventory_2",
            web: unresolvedNotes.length > 0 ? "arrow_forward" : "inventory_2",
          }}
          size={18}
        />
      </Pressable>
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
    alignItems: "center",
    gap: Spacing.three,
  },
  icon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  headerCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  countBadge: {
    minWidth: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.pill,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stat: {
    flex: 1,
    gap: Spacing.half,
  },
  divider: {
    width: 1,
    height: 34,
    marginHorizontal: Spacing.three,
  },
  startButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderRadius: Radius.medium,
  },
  pressed: {
    opacity: 0.72,
  },
});
