import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { AnimatedProgressBar } from "@/components/motion/animated-progress-bar";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type {
  SubjectMastery,
  SubjectMasteryStatus,
  SubjectRecommendation,
} from "@/learning/subject-mastery";
import type { Exam } from "@/types/exam";

export interface SubjectMasteryExamItem {
  exam: Exam;
  subjects: SubjectMastery[];
}

interface SubjectMasteryMapProps {
  items: SubjectMasteryExamItem[];
  isLoading: boolean;
  onStart: (mastery: SubjectMastery) => void;
  onOpenCatalog: () => void;
}

const STATUS_LABELS: Record<SubjectMasteryStatus, string> = {
  notStarted: "시작 전",
  learning: "기초 학습",
  developing: "성장 중",
  stable: "안정화",
  mastered: "숙련",
};

const RECOMMENDATION_LABELS: Record<SubjectRecommendation, string> = {
  review: "도래한 복습",
  errors: "미해결 오답",
  weak: "정확도 보완",
  new: "새 범위 확장",
  practice: "숙련 유지",
};

// 추천 과목 세션 버튼 문구 생성
function getActionLabel(mastery: SubjectMastery): string {
  const count = mastery.recommendedQuestionIds.length;
  if (mastery.recommendation === "review") return `복습 ${count}문제 시작`;
  if (mastery.recommendation === "errors") return `오답 ${count}문제 다시 풀기`;
  if (mastery.recommendation === "new") return `새 문제 ${count}개 시작`;
  if (mastery.recommendation === "weak") return `취약 과목 ${count}문제 집중`;
  return `유지 연습 ${count}문제`;
}

// 시험 전환형 과목 숙련도 맵
export function SubjectMasteryMap({
  items,
  isLoading,
  onStart,
  onOpenCatalog,
}: SubjectMasteryMapProps) {
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const theme = useTheme();
  const selectedItem =
    items.find((item) => item.exam.id === selectedExamId) ?? items[0];
  const selectedMastery =
    selectedItem?.subjects.find(
      (mastery) => mastery.subject === selectedSubject,
    ) ?? selectedItem?.subjects[0];

  if (isLoading)
    return (
      <View style={styles.section}>
        <ThemedText style={styles.sectionTitle}>과목 숙련도</ThemedText>
        <ThemedView type="backgroundElement" style={styles.stateCard}>
          <ThemedText type="small" themeColor="textSecondary">
            과목별 학습 기록을 분석하는 중...
          </ThemedText>
        </ThemedView>
      </View>
    );

  if (selectedItem == null || selectedMastery == null)
    return (
      <View style={styles.section}>
        <View>
          <ThemedText style={styles.sectionTitle}>과목 숙련도</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            등록한 시험의 과목별 성장 상태
          </ThemedText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="문제은행이 있는 시험 찾아보기"
          onPress={onOpenCatalog}
          style={({ pressed }) => [
            styles.emptyCard,
            {
              backgroundColor: theme.backgroundElement,
              borderColor: theme.border,
            },
            pressed && styles.pressed,
          ]}
        >
          <View
            style={[styles.emptyIcon, { backgroundColor: theme.primarySoft }]}
          >
            <SymbolView
              tintColor={theme.primary}
              name={{
                ios: "map.fill",
                android: "route",
                web: "route",
              }}
              size={22}
            />
          </View>
          <View style={styles.emptyCopy}>
            <ThemedText type="smallBold">
              과목 경로를 만들 시험이 필요해요
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              문제은행이 있는 시험을 추가하면 숙련도를 분석해요
            </ThemedText>
          </View>
          <SymbolView
            tintColor={theme.primary}
            name={{
              ios: "chevron.right",
              android: "chevron_right",
              web: "chevron_right",
            }}
            size={19}
          />
        </Pressable>
      </View>
    );

  const selectedColor =
    selectedMastery.status === "notStarted"
      ? theme.primary
      : selectedMastery.score >= 85
        ? theme.success
        : selectedMastery.score >= 65
          ? theme.primary
          : selectedMastery.score >= 40
            ? theme.warning
            : theme.danger;
  const selectedBackground =
    selectedMastery.status === "notStarted"
      ? theme.primarySoft
      : selectedMastery.score >= 85
        ? theme.successSoft
        : selectedMastery.score >= 65
          ? theme.primarySoft
          : selectedMastery.score >= 40
            ? theme.warningSoft
            : theme.dangerSoft;
  const accuracy =
    selectedMastery.answered === 0
      ? null
      : Math.round((selectedMastery.correct / selectedMastery.answered) * 100);

  return (
    <View style={styles.section}>
      <View>
        <ThemedText style={styles.sectionTitle}>과목 숙련도</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          범위·정확도·반복 복습을 합산한 학습 지표
        </ThemedText>
      </View>

      {items.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.examSelector}
        >
          {items.map((item) => {
            const selected = item.exam.id === selectedItem.exam.id;
            return (
              <Pressable
                key={item.exam.id}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                onPress={() => {
                  setSelectedExamId(item.exam.id);
                  setSelectedSubject(null);
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
                <ThemedText type="small">{item.exam.icon}</ThemedText>
                <ThemedText
                  type="smallBold"
                  style={{
                    color: selected ? theme.onPrimary : theme.textSecondary,
                  }}
                >
                  {item.exam.shortTitle}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
      )}

      <View style={styles.subjectList}>
        {selectedItem.subjects.map((mastery) => {
          const selected = mastery.subject === selectedMastery.subject;
          const color =
            mastery.status === "notStarted"
              ? theme.primary
              : mastery.score >= 85
                ? theme.success
                : mastery.score >= 65
                  ? theme.primary
                  : mastery.score >= 40
                    ? theme.warning
                    : theme.danger;
          const background =
            mastery.status === "notStarted"
              ? theme.primarySoft
              : mastery.score >= 85
                ? theme.successSoft
                : mastery.score >= 65
                  ? theme.primarySoft
                  : mastery.score >= 40
                    ? theme.warningSoft
                    : theme.dangerSoft;
          return (
            <Pressable
              key={`${mastery.examId}:${mastery.subject}`}
              accessibilityRole="button"
              accessibilityState={{ selected, expanded: selected }}
              accessibilityLabel={`${mastery.subject} 숙련도 ${mastery.score}점`}
              onPress={() => setSelectedSubject(mastery.subject)}
              style={({ pressed }) => [
                styles.subjectCard,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: selected ? color : theme.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <View
                style={[styles.scoreBadge, { backgroundColor: background }]}
              >
                <ThemedText type="smallBold" style={{ color }}>
                  {mastery.score}
                </ThemedText>
              </View>
              <View style={styles.subjectCopy}>
                <View style={styles.subjectTitleRow}>
                  <ThemedText type="smallBold">{mastery.subject}</ThemedText>
                  <ThemedText type="small" style={{ color }}>
                    {STATUS_LABELS[mastery.status]}
                  </ThemedText>
                </View>
                <AnimatedProgressBar
                  progress={(mastery.score) / 100}
                  height={6}
                  color={color}
                  trackColor={theme.backgroundSelected}
                />
                <ThemedText type="small" themeColor="textSecondary">
                  {mastery.studiedQuestions}/{mastery.totalQuestions}문제 경험
                  {mastery.dueQuestions > 0
                    ? ` · 복습 ${mastery.dueQuestions}`
                    : ""}
                </ThemedText>
              </View>
              <SymbolView
                tintColor={selected ? color : theme.textSecondary}
                name={{
                  ios: selected ? "chevron.down" : "chevron.right",
                  android: selected ? "expand_more" : "chevron_right",
                  web: selected ? "expand_more" : "chevron_right",
                }}
                size={18}
              />
            </Pressable>
          );
        })}
      </View>

      <ThemedView
        type="backgroundElement"
        style={[styles.detailCard, { borderColor: selectedColor }]}
      >
        <View style={styles.detailHeader}>
          <View style={styles.detailCopy}>
            <ThemedText type="smallBold">
              {selectedMastery.subject} ·{" "}
              {RECOMMENDATION_LABELS[selectedMastery.recommendation]}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {accuracy == null
                ? "풀이 정확도 기록 없음"
                : `정답률 ${accuracy}%`}
              {" · "}반복 학습 {selectedMastery.matureQuestions}문제
              {selectedMastery.unresolvedWrongAnswers > 0
                ? ` · 오답 ${selectedMastery.unresolvedWrongAnswers}`
                : ""}
            </ThemedText>
          </View>
          <View
            style={[
              styles.detailScore,
              { backgroundColor: selectedBackground },
            ]}
          >
            <ThemedText type="smallBold" style={{ color: selectedColor }}>
              {selectedMastery.score}점
            </ThemedText>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${selectedMastery.subject} 추천 학습 시작`}
          accessibilityState={{
            disabled: selectedMastery.recommendedQuestionIds.length === 0,
          }}
          disabled={selectedMastery.recommendedQuestionIds.length === 0}
          onPress={() => onStart(selectedMastery)}
          style={({ pressed }) => [
            styles.startButton,
            { backgroundColor: selectedColor },
            pressed && styles.startPressed,
          ]}
        >
          <ThemedText type="smallBold" style={styles.startText}>
            {getActionLabel(selectedMastery)}
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
      </ThemedView>
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
  stateCard: {
    alignItems: "center",
    padding: Spacing.five,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  emptyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  emptyIcon: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  emptyCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
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
  subjectList: {
    gap: Spacing.two,
  },
  subjectCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  scoreBadge: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  subjectCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.one,
  },
  subjectTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  detailCard: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  detailCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  detailScore: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  startButton: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderRadius: Radius.medium,
  },
  startText: {
    color: "#FFFFFF",
  },
  pressed: {
    opacity: 0.72,
  },
  startPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
