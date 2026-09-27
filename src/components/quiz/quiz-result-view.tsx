import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { DiagnosticResultCard } from "@/components/diagnostic-result-card";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { AnimatedProgressBar } from "@/components/motion/animated-progress-bar";
import { CelebrationBurst } from "@/components/motion/celebration-burst";
import { PulseView } from "@/components/motion/pulse-view";
import { PageHead } from "@/components/page-head";
import { AnswerReviewCard } from "@/components/quiz/answer-review-card";
import { CtaButton, ReviewFilterChip } from "@/components/quiz/quiz-controls";
import { quizStyles as styles } from "@/components/quiz/quiz-styles";
import { SessionRewardCard } from "@/components/session-reward-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { WrongAnswerNoteEditor } from "@/components/wrong-answer-note-editor";
import type { useBookmarks } from "@/hooks/use-bookmarks";
import type { QuizAnswer } from "@/hooks/use-quiz-session";
import type { useSessionRewards } from "@/hooks/use-session-rewards";
import { useTheme } from "@/hooks/use-theme";
import type { useWrongAnswerNotes } from "@/hooks/use-wrong-answer-notes";
import { createDiagnosticAssessment } from "@/learning/diagnostic-assessment";
import { goBack } from "@/lib/navigation";
import type { Question, QuizMode } from "@/types/exam";

type Bookmarks = ReturnType<typeof useBookmarks>;
type WrongAnswerNotes = ReturnType<typeof useWrongAnswerNotes>;

interface QuizResultViewProps {
  examId: string;
  quizMode: QuizMode;
  isDiagnostic: boolean;
  isCustomSession: boolean;
  mockExpired: boolean;
  questions: Question[];
  answers: QuizAnswer[];
  correctCount: number;
  earnedXp: number;
  rewards: ReturnType<typeof useSessionRewards>["rewards"];
  isRewardsLoading: boolean;
  bookmarkedQuestionIds: Bookmarks["bookmarkedQuestionIds"];
  wrongAnswerNotes: WrongAnswerNotes["notes"];
  restartWrongAnswers: () => void;
  toggleBookmark: Bookmarks["toggleBookmark"];
  addBookmarks: Bookmarks["addBookmarks"];
  toggleTag: WrongAnswerNotes["toggleTag"];
  updateNote: WrongAnswerNotes["updateNote"];
}

// 정답률 구간별 결과 메시지 산출
function getResultMessage(correctCount: number, total: number): string {
  const ratio = correctCount / total;
  if (ratio === 1) return "완벽해요! 전부 맞혔어요.";
  if (ratio >= 0.8) return "훌륭해요! 만점까지 얼마 안 남았어요.";
  if (ratio >= 0.5) return "좋아요! 틀린 문제만 복습하면 금방 올라요.";
  return "괜찮아요, 복습이 실력을 만들어요.";
}

interface SubjectResult {
  subject: string;
  correct: number;
  total: number;
}

type ReviewFilter = "all" | "wrong" | "empty";

// 취약 문제 재학습 세션 진입
function startWeakAnswerSession(questionIds: string[]) {
  router.replace({
    pathname: "/quiz/[examId]",
    params: { examId: "all", questionIds: questionIds.join(",") },
  });
}

// 진단 결과 기반 맞춤 세션 구성 화면 진입
function openSessionBuilder(examId: string) {
  router.replace({
    pathname: "/session-builder/[examId]",
    params: { examId },
  });
}

// 복습 보관함 화면 진입
function openReviewLibrary() {
  router.push({
    pathname: "/review-library",
    params: { filter: "wrong" },
  });
}

// 과목별 세션 결과 집계
function summarizeBySubject(answers: QuizAnswer[]): SubjectResult[] {
  const summary: Record<string, SubjectResult> = {};

  for (const answer of answers) {
    const current = summary[answer.subject] ?? {
      subject: answer.subject,
      correct: 0,
      total: 0,
    };
    summary[answer.subject] = {
      ...current,
      correct: current.correct + (answer.isCorrect ? 1 : 0),
      total: current.total + 1,
    };
  }

  return Object.values(summary);
}

// 퀴즈 세션 결과·답안 리뷰 화면
export function QuizResultView({
  examId,
  quizMode,
  isDiagnostic,
  isCustomSession,
  mockExpired,
  questions,
  answers,
  correctCount,
  earnedXp,
  rewards,
  isRewardsLoading,
  bookmarkedQuestionIds,
  wrongAnswerNotes,
  restartWrongAnswers,
  toggleBookmark,
  addBookmarks,
  toggleTag,
  updateNote,
}: QuizResultViewProps) {
  const theme = useTheme();
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  // 답안 리뷰 필터 전환
  const selectReviewFilter = (filter: ReviewFilter) => {
    setReviewFilter(filter);
    setExpandedReviewId(null);
  };

  const unansweredCount = answers.filter(
    (answer) => answer.selectedIndex == null,
  ).length;
  const answeredWrongCount = answers.filter(
    (answer) => answer.selectedIndex != null && !answer.isCorrect,
  ).length;
  const wrongCount = answeredWrongCount + unansweredCount;
  const weakQuestionIds = answers
    .filter((answer) => !answer.isCorrect)
    .map((answer) => answer.questionId);
  const allWeakQuestionsBookmarked =
    weakQuestionIds.length > 0 &&
    weakQuestionIds.every((questionId) =>
      bookmarkedQuestionIds.includes(questionId),
    );
  const filteredReviewAnswers = answers.filter((answer) => {
    if (reviewFilter === "wrong")
      return answer.selectedIndex != null && !answer.isCorrect;
    if (reviewFilter === "empty") return answer.selectedIndex == null;
    return true;
  });
  // 세션 끝 재출제분을 뺀 첫 시도 문항 수
  const totalCount = answers.length;
  const accuracy = Math.round((correctCount / Math.max(totalCount, 1)) * 100);
  const subjectResults = summarizeBySubject(answers);
  const diagnosticAssessment = createDiagnosticAssessment(
    correctCount,
    totalCount,
    subjectResults,
  );

  return (
    <ThemedView style={styles.container}>
      <PageHead title="문제 풀이" noIndex />
      <SafeAreaView style={styles.resultSafeArea}>
        <ScrollView
          contentContainerStyle={styles.resultContent}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={ZoomIn.duration(400)}
            style={styles.resultHero}
          >
            <PulseView active={wrongCount === 0} scaleTo={1.05}>
              <View
                style={[
                  styles.trophyCircle,
                  { backgroundColor: theme.warningSoft },
                ]}
              >
                <ThemedText style={styles.trophyEmoji}>
                  {wrongCount === 0 ? "🏆" : "✨"}
                </ThemedText>
              </View>
            </PulseView>
            <CelebrationBurst
              trigger={1}
              distance={wrongCount === 0 ? 120 : 92}
            />
            <ThemedText type="subtitle">
              {isDiagnostic
                ? "빠른 진단 완료!"
                : quizMode === "mock"
                  ? mockExpired
                    ? "시간 종료!"
                    : "모의고사 완료!"
                  : quizMode === "review"
                    ? "복습 완료!"
                    : quizMode === "bookmarks"
                      ? "저장 문제 학습 완료!"
                      : isCustomSession
                        ? "맞춤 학습 완료!"
                        : "학습 완료!"}
            </ThemedText>
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.centerText}
            >
              {isDiagnostic
                ? "현재 수준과 먼저 학습할 과목을 찾았어요."
                : quizMode === "mock" && mockExpired
                  ? "제한 시간이 끝나 답안을 자동으로 제출했어요."
                  : getResultMessage(correctCount, totalCount)}
            </ThemedText>
          </Animated.View>

          <Animated.View
            entering={
              Platform.OS === "android"
                ? undefined
                : FadeInDown.delay(120).duration(300)
            }
          >
            <ThemedView type="backgroundElement" style={styles.scoreCard}>
              <View
                style={[styles.scoreCircle, { borderColor: theme.primarySoft }]}
              >
                <AnimatedCounter
                  style={[styles.accuracyText, { color: theme.primary }]}
                  value={accuracy}
                  suffix="%"
                />
                <ThemedText type="small" themeColor="textSecondary">
                  정답률
                </ThemedText>
              </View>
              <View style={styles.scoreDetails}>
                <View style={styles.scoreRow}>
                  <View
                    style={[
                      styles.scoreDot,
                      { backgroundColor: theme.success },
                    ]}
                  />
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.scoreLabel}
                  >
                    맞힌 문제
                  </ThemedText>
                  <ThemedText type="smallBold">{correctCount}</ThemedText>
                </View>
                <View style={styles.scoreRow}>
                  <View
                    style={[styles.scoreDot, { backgroundColor: theme.danger }]}
                  />
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.scoreLabel}
                  >
                    {quizMode === "mock" ? "오답" : "다시 볼 문제"}
                  </ThemedText>
                  <ThemedText type="smallBold">{answeredWrongCount}</ThemedText>
                </View>
                {quizMode === "mock" && (
                  <View style={styles.scoreRow}>
                    <View
                      style={[
                        styles.scoreDot,
                        { backgroundColor: theme.warning },
                      ]}
                    />
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={styles.scoreLabel}
                    >
                      미응답
                    </ThemedText>
                    <ThemedText type="smallBold">{unansweredCount}</ThemedText>
                  </View>
                )}
                <View style={styles.scoreRow}>
                  <View
                    style={[
                      styles.scoreDot,
                      { backgroundColor: theme.primary },
                    ]}
                  />
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.scoreLabel}
                  >
                    전체 문제
                  </ThemedText>
                  <ThemedText type="smallBold">{totalCount}</ThemedText>
                </View>
                <View style={styles.scoreRow}>
                  <View
                    style={[
                      styles.scoreDot,
                      { backgroundColor: theme.warning },
                    ]}
                  />
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.scoreLabel}
                  >
                    획득 경험치
                  </ThemedText>
                  <AnimatedCounter
                    type="smallBold"
                    style={{ color: theme.warning }}
                    value={earnedXp}
                    prefix="+"
                    suffix=" XP"
                  />
                </View>
              </View>
            </ThemedView>
          </Animated.View>

          {isDiagnostic && (
            <DiagnosticResultCard
              assessment={diagnosticAssessment}
              onStartPlan={() => openSessionBuilder(examId)}
            />
          )}

          <SessionRewardCard
            earnedXp={earnedXp}
            rewards={rewards}
            isLoading={isRewardsLoading}
            onOpenProgress={() => router.push("/progress")}
          />

          {subjectResults.length > 0 && (
            <Animated.View
              entering={
                Platform.OS === "android"
                  ? undefined
                  : FadeInDown.delay(200).duration(300)
              }
              style={styles.resultSection}
            >
              <ThemedText style={styles.resultSectionTitle}>
                과목별 결과
              </ThemedText>
              <ThemedView type="backgroundElement" style={styles.subjectCard}>
                {subjectResults.map((result, index) => {
                  const subjectAccuracy = Math.round(
                    (result.correct / result.total) * 100,
                  );
                  return (
                    <View
                      key={result.subject}
                      style={[
                        styles.subjectRow,
                        index < subjectResults.length - 1 && {
                          borderBottomColor: theme.border,
                          borderBottomWidth: 1,
                        },
                      ]}
                    >
                      <View style={styles.subjectText}>
                        <ThemedText type="smallBold">
                          {result.subject}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {result.correct}/{result.total} 정답
                        </ThemedText>
                      </View>
                      <View style={styles.subjectTrack}>
                        <AnimatedProgressBar
                          progress={subjectAccuracy / 100}
                          height={7}
                          color={theme.primary}
                          trackColor={theme.primarySoft}
                        />
                      </View>
                      <ThemedText
                        type="smallBold"
                        style={{ color: theme.primary }}
                      >
                        {subjectAccuracy}%
                      </ThemedText>
                    </View>
                  );
                })}
              </ThemedView>
            </Animated.View>
          )}

          {answeredWrongCount > 0 && (
            <ThemedView
              style={[
                styles.reviewNotice,
                { backgroundColor: theme.dangerSoft },
              ]}
            >
              <SymbolView
                tintColor={theme.danger}
                name={{
                  ios: "arrow.triangle.2.circlepath",
                  android: "replay",
                  web: "replay",
                }}
                size={21}
              />
              <ThemedText
                type="small"
                style={[styles.noticeText, { color: theme.danger }]}
              >
                선택한 오답 {answeredWrongCount}문제는 복습 일정에도 바로
                반영됐어요.
              </ThemedText>
            </ThemedView>
          )}

          <Animated.View
            entering={
              Platform.OS === "android"
                ? undefined
                : FadeInUp.delay(280).duration(300)
            }
            style={styles.resultActions}
          >
            {wrongCount > 0 && (
              <CtaButton
                label={
                  isDiagnostic
                    ? `진단 오답 ${wrongCount}문제 학습`
                    : quizMode === "mock"
                      ? `취약 ${wrongCount}문제 바로 복습`
                      : `오답 ${wrongCount}문제 다시 풀기`
                }
                variant="secondary"
                onPress={
                  quizMode === "mock"
                    ? () => startWeakAnswerSession(weakQuestionIds)
                    : restartWrongAnswers
                }
              />
            )}
            {weakQuestionIds.length > 0 && (
              <CtaButton
                label="복습 보관함에서 정리"
                variant="secondary"
                onPress={openReviewLibrary}
              />
            )}
            <CtaButton label="돌아가기" onPress={() => goBack()} />
          </Animated.View>

          <Animated.View
            entering={
              Platform.OS === "android"
                ? undefined
                : FadeInDown.delay(240).duration(300)
            }
            style={styles.resultSection}
          >
            <View style={styles.reviewHeader}>
              <View style={styles.reviewHeaderText}>
                <ThemedText style={styles.resultSectionTitle}>
                  답안 리뷰
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  선택 답·정답·핵심 해설 비교
                </ThemedText>
              </View>
              {weakQuestionIds.length > 0 && (
                <Pressable
                  accessibilityRole="button"
                  aria-disabled={allWeakQuestionsBookmarked}
                  disabled={allWeakQuestionsBookmarked}
                  onPress={() => addBookmarks(weakQuestionIds)}
                  style={({ pressed }) => [
                    styles.bulkSaveButton,
                    {
                      backgroundColor: allWeakQuestionsBookmarked
                        ? theme.successSoft
                        : theme.warningSoft,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    tintColor={
                      allWeakQuestionsBookmarked ? theme.success : theme.warning
                    }
                    name={{
                      ios: allWeakQuestionsBookmarked
                        ? "checkmark.circle.fill"
                        : "bookmark.fill",
                      android: allWeakQuestionsBookmarked
                        ? "check_circle"
                        : "bookmark",
                      web: allWeakQuestionsBookmarked
                        ? "check_circle"
                        : "bookmark",
                    }}
                    size={16}
                  />
                  <ThemedText
                    type="smallBold"
                    style={{
                      color: allWeakQuestionsBookmarked
                        ? theme.success
                        : theme.warning,
                    }}
                  >
                    {allWeakQuestionsBookmarked ? "모두 저장됨" : "취약 저장"}
                  </ThemedText>
                </Pressable>
              )}
            </View>

            <View
              style={[
                styles.reviewFilterRow,
                { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <ReviewFilterChip
                label={`전체 ${answers.length}`}
                selected={reviewFilter === "all"}
                activeTextColor={theme.primary}
                onPress={() => selectReviewFilter("all")}
              />
              {answeredWrongCount > 0 && (
                <ReviewFilterChip
                  label={`오답 ${answeredWrongCount}`}
                  selected={reviewFilter === "wrong"}
                  activeTextColor={theme.danger}
                  onPress={() => selectReviewFilter("wrong")}
                />
              )}
              {unansweredCount > 0 && (
                <ReviewFilterChip
                  label={`미응답 ${unansweredCount}`}
                  selected={reviewFilter === "empty"}
                  activeTextColor={theme.warning}
                  onPress={() => selectReviewFilter("empty")}
                />
              )}
            </View>

            <View style={styles.reviewList}>
              {filteredReviewAnswers.map((answer) => {
                const question = questions.find(
                  (item) => item.id === answer.questionId,
                );
                if (question == null) return null;
                const wrongAnswerNote = wrongAnswerNotes[answer.questionId];
                return (
                  <AnswerReviewCard
                    key={answer.questionId}
                    answer={answer}
                    question={question}
                    index={questions.findIndex(
                      (item) => item.id === answer.questionId,
                    )}
                    expanded={expandedReviewId === answer.questionId}
                    bookmarked={bookmarkedQuestionIds.includes(
                      answer.questionId,
                    )}
                    noteEditor={
                      wrongAnswerNote == null ? undefined : (
                        <WrongAnswerNoteEditor
                          note={wrongAnswerNote}
                          onToggleTag={(tag) =>
                            void toggleTag(answer.questionId, tag)
                          }
                          onSaveMemo={(memo) =>
                            void updateNote(answer.questionId, {
                              memo,
                            })
                          }
                        />
                      )
                    }
                    onToggleExpanded={() =>
                      setExpandedReviewId((current) =>
                        current === answer.questionId
                          ? null
                          : answer.questionId,
                      )
                    }
                    onToggleBookmark={() => toggleBookmark(answer.questionId)}
                    onReport={() =>
                      router.push({
                        pathname: "/question-report",
                        params: { questionId: answer.questionId },
                      })
                    }
                  />
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}
