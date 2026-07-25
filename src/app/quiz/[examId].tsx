import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { DiagnosticResultCard } from "@/components/diagnostic-result-card";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { AnswerReviewCard } from "@/components/quiz/answer-review-card";
import { ChoiceButton, ChoiceState } from "@/components/quiz/choice-button";
import { ConfidenceRating } from "@/components/quiz/confidence-rating";
import { MockReviewPanel } from "@/components/quiz/mock-review-panel";
import { QuizProgressBar } from "@/components/quiz/quiz-progress-bar";
import { SessionRewardCard } from "@/components/session-reward-card";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { WrongAnswerNoteEditor } from "@/components/wrong-answer-note-editor";
import { MaxContentWidth, Radius, Shadows, Spacing } from "@/constants/theme";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useCountdown } from "@/hooks/use-countdown";
import { useExamCatalog } from "@/hooks/use-exam-catalog";
import { useExamEnrollment } from "@/hooks/use-exam-enrollment";
import { QuizAnswer, useQuizSession } from "@/hooks/use-quiz-session";
import { useSessionRewards } from "@/hooks/use-session-rewards";
import { useSettings } from "@/hooks/use-settings";
import { useTheme } from "@/hooks/use-theme";
import { useWrongAnswerNotes } from "@/hooks/use-wrong-answer-notes";
import { createDiagnosticAssessment } from "@/learning/diagnostic-assessment";
import { calculateSessionXp } from "@/learning/progression";
import type { QuizMode } from "@/types/exam";

interface CtaButtonProps {
  label: string;
  disabled?: boolean;
  variant?: "primary" | "secondary" | "danger";
  onPress: () => void;
}

// 하단 주요 동작 버튼
function CtaButton({
  label,
  disabled = false,
  variant = "primary",
  onPress,
}: CtaButtonProps) {
  const theme = useTheme();
  const isPrimary = variant === "primary";
  const foregroundColor =
    variant === "primary"
      ? theme.onPrimary
      : variant === "danger"
        ? theme.danger
        : theme.text;
  const backgroundColor =
    variant === "primary"
      ? theme.primary
      : variant === "danger"
        ? theme.dangerSoft
        : theme.backgroundSelected;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.cta,
        {
          backgroundColor,
          borderColor: isPrimary ? theme.primary : theme.border,
        },
        disabled && styles.ctaDisabled,
        pressed && styles.pressed,
      ]}
    >
      <ThemedText type="smallBold" style={{ color: foregroundColor }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

// 채점 여부·정답 여부 기반 보기 렌더링 상태 계산
function getChoiceState(
  choiceIndex: number,
  selectedIndex: number | null,
  answerIndex: number,
  isSubmitted: boolean,
): ChoiceState {
  if (!isSubmitted) return choiceIndex === selectedIndex ? "selected" : "idle";
  if (choiceIndex === answerIndex) return "correct";
  return choiceIndex === selectedIndex ? "wrong" : "idle";
}

// 정답률 구간별 결과 메시지 산출
function getResultMessage(correctCount: number, total: number): string {
  const ratio = correctCount / total;
  if (ratio === 1) return "완벽해요! 전부 맞혔어요.";
  if (ratio >= 0.8) return "훌륭해요! 만점까지 얼마 안 남았어요.";
  if (ratio >= 0.5) return "좋아요! 틀린 문제만 복습하면 금방 올라요.";
  return "괜찮아요, 복습이 실력을 만들어요.";
}

// 남은 시간 분·초 표시
function formatRemainingTime(remainingSeconds: number): string {
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

// 키보드 입력 대상 편집 상태 판별
function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (
    typeof HTMLElement === "undefined" ||
    !(target instanceof HTMLElement)
  )
    return false;
  return (
    target.closest("input, textarea, select, [contenteditable='true']") != null
  );
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
    pathname: "../../session-builder/[examId]",
    params: { examId },
  });
}

// 복습 보관함 화면 진입
function openReviewLibrary() {
  router.push({
    pathname: "../../review-library",
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

// 문제 풀이 화면
export default function QuizScreen() {
  const params = useLocalSearchParams<{
    examId: string;
    mode?: QuizMode;
    questionIds?: string;
    resume?: string;
    diagnostic?: string;
  }>();
  const quizMode: QuizMode =
    params.mode === "mock"
      ? "mock"
      : params.mode === "review"
        ? "review"
        : params.mode === "bookmarks"
          ? "bookmarks"
          : "learn";
  const { findExam } = useExamCatalog();
  const { examIds } = useExamEnrollment();
  const exam = findExam(params.examId);
  const isCustomSession = params.questionIds != null;
  const isDiagnostic = params.diagnostic === "true";
  const { bookmarkedQuestionIds, toggleBookmark, addBookmarks } =
    useBookmarks();
  const { settings } = useSettings();
  const {
    notes: wrongAnswerNotes,
    toggleTag,
    updateNote,
  } = useWrongAnswerNotes();
  const theme = useTheme();
  const [exitConfirming, setExitConfirming] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [mockExpired, setMockExpired] = useState(false);
  const [mockReviewOpen, setMockReviewOpen] = useState(false);
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("all");
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  const {
    status,
    questions,
    currentQuestion,
    currentIndex,
    selectedIndex,
    isSubmitted,
    answerConfidence,
    isLastQuestion,
    correctCount,
    answers,
    flaggedQuestionIds,
    selectChoice,
    submitAnswer,
    rateConfidence,
    goToQuestion,
    toggleQuestionFlag,
    goNext,
    finishMockSession,
    restartWrongAnswers,
  } = useQuizSession(
    params.examId,
    quizMode,
    params.questionIds,
    params.resume === "true",
    quizMode !== "mock" && (sessionPaused || exitConfirming),
  );
  const sessionAnsweredCount = answers.filter(
    (answer) => answer.selectedIndex != null,
  ).length;
  const earnedXp = calculateSessionXp(correctCount, sessionAnsweredCount);
  const { rewards, isLoading: isRewardsLoading } = useSessionRewards({
    finished: status === "finished",
    correctCount,
    answeredCount: sessionAnsweredCount,
    dailyGoal: settings.dailyGoal,
    enrolledExamCount: examIds.length,
  });

  // 모의고사 제한 시간 종료
  const handleMockExpire = useCallback(() => {
    setMockExpired(true);
    finishMockSession();
  }, [finishMockSession]);
  const remainingSeconds = useCountdown(
    settings.mockDurationMinutes * 60,
    quizMode === "mock" && status === "in-progress",
    handleMockExpire,
  );

  // 현재 답안 저장 후 모의고사 검토 열기
  const openMockReview = useCallback(() => {
    goToQuestion(currentIndex);
    setMockReviewOpen(true);
  }, [currentIndex, goToQuestion]);

  // 모의고사 검토 문항 선택 이동
  const selectMockReviewQuestion = (questionIndex: number) => {
    goToQuestion(questionIndex);
    setMockReviewOpen(false);
  };

  // 모의고사 검토 답안 최종 제출
  const submitMockReview = () => {
    setMockReviewOpen(false);
    finishMockSession();
  };

  // 답안 리뷰 필터 전환
  const selectReviewFilter = (filter: ReviewFilter) => {
    setReviewFilter(filter);
    setExpandedReviewId(null);
  };

  // 웹 문제 풀이 키보드 단축키 처리
  useEffect(() => {
    if (
      Platform.OS !== "web" ||
      !settings.keyboardShortcutsEnabled ||
      status !== "in-progress" ||
      currentQuestion == null
    )
      return;

    // 퀴즈 상태별 키보드 동작 실행
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if (
        event.repeat ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        isEditableKeyboardTarget(event.target)
      )
        return;

      if (event.key === "Escape") {
        event.preventDefault();
        if (mockReviewOpen) setMockReviewOpen(false);
        else if (exitConfirming) setExitConfirming(false);
        else if (sessionPaused) setSessionPaused(false);
        else setExitConfirming(true);
        return;
      }
      if (sessionPaused || exitConfirming || mockReviewOpen) return;

      if (/^[1-9]$/.test(event.key) && !isSubmitted) {
        const choiceIndex = Number(event.key) - 1;
        if (choiceIndex >= currentQuestion.choices.length) return;
        event.preventDefault();
        selectChoice(choiceIndex);
        return;
      }

      const shortcutKey = event.key.toLowerCase();
      if (shortcutKey === "b") {
        event.preventDefault();
        toggleBookmark(currentQuestion.id);
        return;
      }
      if (shortcutKey === "f" && quizMode === "mock") {
        event.preventDefault();
        toggleQuestionFlag();
        return;
      }
      if (event.key !== "Enter") return;

      if (quizMode === "mock") {
        if (selectedIndex == null) return;
        event.preventDefault();
        if (isLastQuestion) openMockReview();
        else goNext();
        return;
      }
      if (!isSubmitted) {
        if (selectedIndex == null) return;
        event.preventDefault();
        submitAnswer();
        return;
      }
      if (
        settings.confidenceRatingEnabled &&
        answerConfidence == null
      )
        return;
      event.preventDefault();
      goNext();
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, [
    answerConfidence,
    currentQuestion,
    exitConfirming,
    goNext,
    isLastQuestion,
    isSubmitted,
    mockReviewOpen,
    openMockReview,
    quizMode,
    selectChoice,
    selectedIndex,
    sessionPaused,
    settings.confidenceRatingEnabled,
    settings.keyboardShortcutsEnabled,
    status,
    submitAnswer,
    toggleBookmark,
    toggleQuestionFlag,
  ]);

  if (status === "loading") {
    return (
      <ThemedView style={styles.centerContainer}>
        <ActivityIndicator color={theme.primary} />
      </ThemedView>
    );
  }

  if (status === "empty") {
    return (
      <ThemedView style={styles.centerContainer}>
        <View style={styles.centerBox}>
          <ThemedText type="subtitle">
            {quizMode === "review"
              ? "복습할 문제가 없어요"
              : quizMode === "bookmarks"
                ? "저장한 문제가 없어요"
                : isCustomSession
                  ? "선택한 문제가 없어요"
                  : "출제할 문제가 없어요"}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {quizMode === "review"
              ? "학습을 마치면 복습 일정이 자동으로 등록됩니다."
              : quizMode === "bookmarks"
                ? "학습 중 북마크를 눌러 다시 볼 문제를 저장해 보세요."
                : isCustomSession
                  ? "문제은행에서 학습 범위를 다시 선택해 주세요."
                  : "다른 시험을 선택해 주세요."}
          </ThemedText>
          <CtaButton label="돌아가기" onPress={() => router.back()} />
        </View>
      </ThemedView>
    );
  }

  if (status === "finished") {
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
    const accuracy = Math.round((correctCount / questions.length) * 100);
    const subjectResults = summarizeBySubject(answers);
    const diagnosticAssessment = createDiagnosticAssessment(
      correctCount,
      questions.length,
      subjectResults,
    );

    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.resultSafeArea}>
          <ScrollView
            contentContainerStyle={styles.resultContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              entering={ZoomIn.duration(400)}
              style={styles.resultHero}
            >
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
                    : getResultMessage(correctCount, questions.length)}
              </ThemedText>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(120).duration(300)}>
              <ThemedView type="backgroundElement" style={styles.scoreCard}>
                <View
                  style={[
                    styles.scoreCircle,
                    { borderColor: theme.primarySoft },
                  ]}
                >
                  <ThemedText
                    style={[styles.accuracyText, { color: theme.primary }]}
                  >
                    {accuracy}%
                  </ThemedText>
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
                      style={[
                        styles.scoreDot,
                        { backgroundColor: theme.danger },
                      ]}
                    />
                    <ThemedText
                      type="small"
                      themeColor="textSecondary"
                      style={styles.scoreLabel}
                    >
                      {quizMode === "mock" ? "오답" : "다시 볼 문제"}
                    </ThemedText>
                    <ThemedText type="smallBold">
                      {answeredWrongCount}
                    </ThemedText>
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
                      <ThemedText type="smallBold">
                        {unansweredCount}
                      </ThemedText>
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
                    <ThemedText type="smallBold">{questions.length}</ThemedText>
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
                    <ThemedText
                      type="smallBold"
                      style={{ color: theme.warning }}
                    >
                      +{earnedXp} XP
                    </ThemedText>
                  </View>
                </View>
              </ThemedView>
            </Animated.View>

            {isDiagnostic && (
              <DiagnosticResultCard
                assessment={diagnosticAssessment}
                onStartPlan={() => openSessionBuilder(params.examId)}
              />
            )}

            <SessionRewardCard
              earnedXp={earnedXp}
              rewards={rewards}
              isLoading={isRewardsLoading}
              onOpenProgress={() => router.push("../../progress")}
            />

            {subjectResults.length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(200).duration(300)}
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
                        <View
                          style={[
                            styles.subjectTrack,
                            { backgroundColor: theme.primarySoft },
                          ]}
                        >
                          <View
                            style={[
                              styles.subjectFill,
                              {
                                width: `${subjectAccuracy}%`,
                                backgroundColor: theme.primary,
                              },
                            ]}
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
              entering={FadeInUp.delay(280).duration(300)}
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
              <CtaButton label="돌아가기" onPress={() => router.back()} />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.delay(240).duration(300)}
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
                    accessibilityState={{
                      disabled: allWeakQuestionsBookmarked,
                    }}
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
                        allWeakQuestionsBookmarked
                          ? theme.success
                          : theme.warning
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
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ checked: reviewFilter === "all" }}
                  onPress={() => selectReviewFilter("all")}
                  style={({ pressed }) => [
                    styles.reviewFilterChip,
                    reviewFilter === "all" && {
                      backgroundColor: theme.backgroundElement,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText
                    type="smallBold"
                    style={{
                      color:
                        reviewFilter === "all"
                          ? theme.primary
                          : theme.textSecondary,
                    }}
                  >
                    전체 {answers.length}
                  </ThemedText>
                </Pressable>
                {answeredWrongCount > 0 && (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: reviewFilter === "wrong" }}
                    onPress={() => selectReviewFilter("wrong")}
                    style={({ pressed }) => [
                      styles.reviewFilterChip,
                      reviewFilter === "wrong" && {
                        backgroundColor: theme.backgroundElement,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{
                        color:
                          reviewFilter === "wrong"
                            ? theme.danger
                            : theme.textSecondary,
                      }}
                    >
                      오답 {answeredWrongCount}
                    </ThemedText>
                  </Pressable>
                )}
                {unansweredCount > 0 && (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: reviewFilter === "empty" }}
                    onPress={() => selectReviewFilter("empty")}
                    style={({ pressed }) => [
                      styles.reviewFilterChip,
                      reviewFilter === "empty" && {
                        backgroundColor: theme.backgroundElement,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{
                        color:
                          reviewFilter === "empty"
                            ? theme.warning
                            : theme.textSecondary,
                      }}
                    >
                      미응답 {unansweredCount}
                    </ThemedText>
                  </Pressable>
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

  if (currentQuestion == null) return null;

  const isCorrectAnswer = selectedIndex === currentQuestion.answerIndex;
  const mockAnsweredQuestionIds = new Set(
    answers
      .filter((answer) => answer.selectedIndex != null)
      .map((answer) => answer.questionId),
  );
  if (quizMode === "mock" && selectedIndex != null)
    mockAnsweredQuestionIds.add(currentQuestion.id);
  const answeredCount =
    quizMode === "mock"
      ? mockAnsweredQuestionIds.size
      : currentIndex + (isSubmitted ? 1 : 0);
  const isBookmarked = bookmarkedQuestionIds.includes(currentQuestion.id);
  const isQuestionFlagged = flaggedQuestionIds.includes(currentQuestion.id);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              quizMode === "mock" ? "모의고사 종료" : "학습 종료"
            }
            onPress={() => setExitConfirming(true)}
            hitSlop={Spacing.two}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              tintColor={theme.textSecondary}
              name={{ ios: "xmark", android: "close", web: "close" }}
              size={19}
            />
          </Pressable>
          <QuizProgressBar progress={answeredCount / questions.length} />
          {quizMode !== "mock" && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="학습 일시정지"
              onPress={() => setSessionPaused(true)}
              style={({ pressed }) => [
                styles.pauseButton,
                { backgroundColor: theme.backgroundElement },
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                tintColor={theme.textSecondary}
                name={{ ios: "pause.fill", android: "pause", web: "pause" }}
                size={17}
              />
            </Pressable>
          )}
          {quizMode === "mock" && (
            <>
              <View
                style={[
                  styles.timerBadge,
                  {
                    backgroundColor:
                      remainingSeconds <= 60
                        ? theme.dangerSoft
                        : theme.backgroundElement,
                  },
                ]}
              >
                <SymbolView
                  tintColor={
                    remainingSeconds <= 60 ? theme.danger : theme.textSecondary
                  }
                  name={{ ios: "timer", android: "timer", web: "timer" }}
                  size={15}
                />
                <ThemedText
                  type="smallBold"
                  style={{
                    color:
                      remainingSeconds <= 60
                        ? theme.danger
                        : theme.textSecondary,
                  }}
                >
                  {formatRemainingTime(remainingSeconds)}
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`답안 검토 열기, ${answeredCount}문제 응답, 다시 보기 ${flaggedQuestionIds.length}문제`}
                onPress={openMockReview}
                style={({ pressed }) => [
                  styles.mockReviewButton,
                  {
                    backgroundColor:
                      flaggedQuestionIds.length > 0
                        ? theme.warningSoft
                        : theme.backgroundElement,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  tintColor={
                    flaggedQuestionIds.length > 0
                      ? theme.warning
                      : theme.textSecondary
                  }
                  name={{
                    ios: "square.grid.3x3.fill",
                    android: "grid_view",
                    web: "grid_view",
                  }}
                  size={16}
                />
              </Pressable>
            </>
          )}
          <ThemedText type="smallBold" themeColor="textSecondary">
            {currentIndex + 1}/{questions.length}
          </ThemedText>
        </View>

        {Platform.OS === "web" && settings.keyboardShortcutsEnabled && (
          <View
            accessibilityLabel={`키보드 단축키, 1부터 ${Math.min(currentQuestion.choices.length, 9)}까지 보기 선택, Enter 진행, B 저장${quizMode === "mock" ? ", F 다시 보기 표시" : ""}, Escape 닫기`}
            style={[
              styles.shortcutHint,
              { backgroundColor: theme.backgroundSelected },
            ]}
          >
            <SymbolView
              tintColor={theme.textSecondary}
              name={{ ios: "keyboard", android: "keyboard", web: "keyboard" }}
              size={15}
            />
            <ThemedText type="small" themeColor="textSecondary">
              1–{Math.min(currentQuestion.choices.length, 9)} 선택 · Enter 진행 ·
              B 저장{quizMode === "mock" ? " · F 표시" : ""} · Esc 닫기
            </ThemedText>
          </View>
        )}

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            key={currentQuestion.id}
            entering={FadeInDown.duration(300)}
            style={styles.questionBlock}
          >
            <View style={styles.questionMeta}>
              <View style={styles.questionMetaTop}>
                <ThemedView
                  type="backgroundSelected"
                  style={styles.subjectChip}
                >
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    {quizMode === "mock"
                      ? "모의고사"
                      : quizMode === "bookmarks"
                        ? "저장 문제"
                        : isCustomSession
                          ? "맞춤 학습"
                          : (exam?.shortTitle ?? "전체 시험")}{" "}
                    · {currentQuestion.subject}
                  </ThemedText>
                </ThemedView>
                <View style={styles.questionTools}>
                  {quizMode === "mock" && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={
                        isQuestionFlagged
                          ? "현재 문항 다시 보기 표시 해제"
                          : "현재 문항 다시 보기 표시"
                      }
                      accessibilityState={{ selected: isQuestionFlagged }}
                      onPress={toggleQuestionFlag}
                      hitSlop={Spacing.two}
                      style={({ pressed }) => [
                        styles.bookmarkButton,
                        {
                          backgroundColor: isQuestionFlagged
                            ? theme.warningSoft
                            : theme.backgroundElement,
                          borderColor: isQuestionFlagged
                            ? theme.warning
                            : theme.border,
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <SymbolView
                        tintColor={
                          isQuestionFlagged
                            ? theme.warning
                            : theme.textSecondary
                        }
                        name={{
                          ios: isQuestionFlagged ? "flag.fill" : "flag",
                          android: isQuestionFlagged ? "flag" : "outlined_flag",
                          web: isQuestionFlagged ? "flag" : "outlined_flag",
                        }}
                        size={18}
                      />
                    </Pressable>
                  )}
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      isBookmarked
                        ? "저장 문제에서 제거"
                        : "다시 볼 문제로 저장"
                    }
                    accessibilityState={{ selected: isBookmarked }}
                    onPress={() => toggleBookmark(currentQuestion.id)}
                    hitSlop={Spacing.two}
                    style={({ pressed }) => [
                      styles.bookmarkButton,
                      {
                        backgroundColor: isBookmarked
                          ? theme.primarySoft
                          : theme.backgroundElement,
                        borderColor: isBookmarked
                          ? theme.primary
                          : theme.border,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <SymbolView
                      tintColor={
                        isBookmarked ? theme.primary : theme.textSecondary
                      }
                      name={{
                        ios: isBookmarked ? "bookmark.fill" : "bookmark",
                        android: isBookmarked ? "bookmark" : "bookmark_border",
                        web: isBookmarked ? "bookmark" : "bookmark_border",
                      }}
                      size={19}
                    />
                  </Pressable>
                </View>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {quizMode === "mock"
                  ? "답을 바꾸거나 다시 볼 문항으로 표시할 수 있어요"
                  : "하나를 선택해 주세요"}
              </ThemedText>
            </View>

            <ThemedText style={styles.prompt}>
              {currentQuestion.prompt}
            </ThemedText>

            <View style={styles.choices}>
              {currentQuestion.choices.map((choice, index) => (
                <ChoiceButton
                  key={choice}
                  label={choice}
                  index={index}
                  disabled={isSubmitted}
                  state={getChoiceState(
                    index,
                    selectedIndex,
                    currentQuestion.answerIndex,
                    isSubmitted,
                  )}
                  onPress={() => selectChoice(index)}
                />
              ))}
            </View>
          </Animated.View>

          {isSubmitted && (
            <Animated.View entering={FadeInUp.duration(250)}>
              <ThemedView
                style={[
                  styles.feedback,
                  {
                    backgroundColor: isCorrectAnswer
                      ? theme.successSoft
                      : theme.dangerSoft,
                  },
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={{
                    color: isCorrectAnswer ? theme.success : theme.danger,
                  }}
                >
                  {isCorrectAnswer ? "🙆 정답입니다!" : "🙅 오답입니다"}
                </ThemedText>
                {settings.explanationEnabled && (
                  <ThemedText type="small" themeColor="textSecondary">
                    {currentQuestion.explanation}
                  </ThemedText>
                )}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="현재 문제 오류 신고"
                  onPress={() =>
                    router.push({
                      pathname: "/question-report",
                      params: { questionId: currentQuestion.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.feedbackReport,
                    { borderColor: theme.border },
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    tintColor={theme.textSecondary}
                    name={{
                      ios: "exclamationmark.bubble",
                      android: "report_problem",
                      web: "report_problem",
                    }}
                    size={16}
                  />
                  <ThemedText type="smallBold" themeColor="textSecondary">
                    문제에 이상이 있나요?
                  </ThemedText>
                </Pressable>
              </ThemedView>
            </Animated.View>
          )}

          {isSubmitted &&
            quizMode !== "mock" &&
            settings.confidenceRatingEnabled && (
              <Animated.View entering={FadeInUp.delay(60).duration(250)}>
                <ConfidenceRating
                  isCorrect={isCorrectAnswer}
                  selected={answerConfidence}
                  onSelect={rateConfidence}
                />
              </Animated.View>
            )}
        </ScrollView>

        {quizMode === "mock" ? (
          <View style={styles.mockNavigation}>
            {currentIndex > 0 && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="이전 문제"
                onPress={() => goToQuestion(currentIndex - 1)}
                style={({ pressed }) => [
                  styles.previousButton,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <SymbolView
                  tintColor={theme.text}
                  name={{
                    ios: "chevron.left",
                    android: "chevron_left",
                    web: "chevron_left",
                  }}
                  size={20}
                />
              </Pressable>
            )}
            <View style={styles.mockNextButton}>
              <CtaButton
                label={
                  isLastQuestion
                    ? "답안 검토"
                    : selectedIndex == null
                      ? "건너뛰기"
                      : "다음 문제"
                }
                onPress={isLastQuestion ? openMockReview : goNext}
              />
            </View>
          </View>
        ) : (
          <CtaButton
            label={
              !isSubmitted
                ? "확인"
                : settings.confidenceRatingEnabled && answerConfidence == null
                  ? "확신도를 선택해 주세요"
                  : isLastQuestion
                    ? "결과 보기"
                    : "다음 문제"
            }
            disabled={
              (!isSubmitted && selectedIndex == null) ||
              (isSubmitted &&
                settings.confidenceRatingEnabled &&
                answerConfidence == null)
            }
            onPress={!isSubmitted ? submitAnswer : goNext}
          />
        )}
      </SafeAreaView>

      {exitConfirming && (
        <View style={styles.exitOverlay} accessibilityViewIsModal>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="종료 확인 닫기"
            style={styles.exitBackdrop}
            onPress={() => setExitConfirming(false)}
          />
          <Animated.View
            entering={FadeInUp.duration(220)}
            style={styles.exitDialogWrap}
          >
            <ThemedView type="backgroundElement" style={styles.exitDialog}>
              <View
                style={[
                  styles.exitIcon,
                  { backgroundColor: theme.warningSoft },
                ]}
              >
                <SymbolView
                  tintColor={theme.warning}
                  name={{ ios: "pause.fill", android: "pause", web: "pause" }}
                  size={22}
                />
              </View>
              <View style={styles.exitText}>
                <ThemedText style={styles.exitTitle}>
                  {quizMode === "mock"
                    ? "모의고사를 그만둘까요?"
                    : "학습을 그만둘까요?"}
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.centerText}
                >
                  {quizMode === "mock"
                    ? "제출 전 답안은 저장되지 않으며 결과 화면도 볼 수 없어요."
                    : "현재 문제 위치를 저장하고 홈에서 그대로 이어 풀 수 있어요."}
                </ThemedText>
              </View>
              <View style={styles.exitActions}>
                <View style={styles.exitAction}>
                  <CtaButton
                    label="계속 풀기"
                    variant="secondary"
                    onPress={() => setExitConfirming(false)}
                  />
                </View>
                <View style={styles.exitAction}>
                  <CtaButton
                    label={quizMode === "mock" ? "종료" : "나중에 이어 풀기"}
                    variant="danger"
                    onPress={() => router.back()}
                  />
                </View>
              </View>
            </ThemedView>
          </Animated.View>
        </View>
      )}

      {sessionPaused && !exitConfirming && (
        <View style={styles.exitOverlay} accessibilityViewIsModal>
          <View style={styles.exitBackdrop} />
          <Animated.View
            entering={FadeInUp.duration(220)}
            style={styles.exitDialogWrap}
          >
            <ThemedView type="backgroundElement" style={styles.exitDialog}>
              <View
                style={[
                  styles.exitIcon,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <SymbolView
                  tintColor={theme.primary}
                  name={{
                    ios: "cup.and.saucer.fill",
                    android: "free_breakfast",
                    web: "free_breakfast",
                  }}
                  size={22}
                />
              </View>
              <View style={styles.exitText}>
                <ThemedText style={styles.exitTitle}>
                  잠시 쉬어가도 좋아요
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  style={styles.centerText}
                >
                  학습 시간은 멈춰 있어요. 준비되면 같은 문제부터 이어서
                  풀어 보세요.
                </ThemedText>
              </View>
              <View style={styles.pauseActions}>
                <CtaButton
                  label="계속 학습하기"
                  onPress={() => setSessionPaused(false)}
                />
                <CtaButton
                  label="홈에서 나중에 이어 풀기"
                  variant="secondary"
                  onPress={() => router.back()}
                />
              </View>
            </ThemedView>
          </Animated.View>
        </View>
      )}

      {mockReviewOpen && (
        <MockReviewPanel
          questions={questions}
          answers={answers}
          currentIndex={currentIndex}
          flaggedQuestionIds={flaggedQuestionIds}
          onSelectQuestion={selectMockReviewQuestion}
          onSubmit={submitMockReview}
          onClose={() => setMockReviewOpen(false)}
        />
      )}
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
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerBox: {
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.four,
    maxWidth: MaxContentWidth,
  },
  centerText: {
    textAlign: "center",
  },
  resultSafeArea: {
    flex: 1,
    width: "100%",
    minWidth: 0,
    maxWidth: MaxContentWidth,
  },
  resultContent: {
    flexGrow: 1,
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  resultHero: {
    alignItems: "center",
    gap: Spacing.two,
  },
  trophyCircle: {
    width: 84,
    height: 84,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.one,
    borderRadius: Radius.pill,
  },
  trophyEmoji: {
    fontSize: 40,
    lineHeight: 48,
  },
  scoreCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.four,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  scoreCircle: {
    width: 108,
    height: 108,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 10,
    borderRadius: Radius.pill,
  },
  accuracyText: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: 800,
  },
  scoreDetails: {
    flex: 1,
    gap: Spacing.twoHalf,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  scoreDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
  scoreLabel: {
    flex: 1,
  },
  resultSection: {
    gap: Spacing.two,
  },
  resultSectionTitle: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: 800,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  reviewHeaderText: {
    flex: 1,
    gap: Spacing.half,
  },
  bulkSaveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  reviewFilterRow: {
    flexDirection: "row",
    gap: Spacing.one,
    padding: Spacing.one,
    borderRadius: Radius.medium,
  },
  reviewFilterChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.small,
  },
  reviewList: {
    gap: Spacing.three,
  },
  subjectCard: {
    overflow: "hidden",
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  subjectText: {
    width: 108,
    gap: Spacing.half,
  },
  subjectTrack: {
    flex: 1,
    height: 7,
    overflow: "hidden",
    borderRadius: Radius.pill,
  },
  subjectFill: {
    height: "100%",
    borderRadius: Radius.pill,
  },
  reviewNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  noticeText: {
    flex: 1,
  },
  resultActions: {
    gap: Spacing.two,
    marginTop: "auto",
  },
  safeArea: {
    flex: 1,
    width: "100%",
    minWidth: 0,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
    backgroundColor: "rgba(127, 127, 127, 0.09)",
  },
  pauseButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  shortcutHint: {
    minHeight: 30,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  mockReviewButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.small,
  },
  content: {
    gap: Spacing.four,
    paddingVertical: Spacing.three,
  },
  questionBlock: {
    gap: Spacing.four,
  },
  questionMeta: {
    gap: Spacing.two,
  },
  questionMetaTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  questionTools: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  subjectChip: {
    flexShrink: 1,
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
  },
  bookmarkButton: {
    width: 38,
    height: 38,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  prompt: {
    fontSize: 22,
    lineHeight: 32,
    fontWeight: 700,
  },
  choices: {
    gap: Spacing.twoHalf,
  },
  feedback: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  feedbackReport: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.pill,
  },
  cta: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.twoHalf,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  mockNavigation: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  previousButton: {
    width: 52,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  mockNextButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
  exitOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  exitBackdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(8, 10, 16, 0.56)",
  },
  exitDialogWrap: {
    width: "100%",
    maxWidth: MaxContentWidth,
    padding: Spacing.three,
  },
  exitDialog: {
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  exitIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  exitText: {
    alignItems: "center",
    gap: Spacing.one,
  },
  exitTitle: {
    fontSize: 20,
    lineHeight: 28,
    fontWeight: 800,
  },
  exitActions: {
    flexDirection: "row",
    gap: Spacing.two,
    width: "100%",
  },
  pauseActions: {
    gap: Spacing.two,
    width: "100%",
  },
  exitAction: {
    flex: 1,
  },
});
