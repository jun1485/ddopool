import { CtaButton, ToggleIconButton } from "@/components/quiz/quiz-controls";
import { quizStyles as styles } from "@/components/quiz/quiz-styles";
import { useLocalSearchParams, useNavigation } from "expo-router";
import {
  type NavigationAction,
  usePreventRemove,
} from "expo-router/react-navigation";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useState } from "react";
import { AccessibilityInfo, Platform, ScrollView, View } from "react-native";
import Animated, {
  FadeInRight,
  FadeOutLeft,
  useReducedMotion,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { SkeletonBlock } from "@/components/motion/skeleton-block";
import { PageHead } from "@/components/page-head";
import { AnswerFeedbackSheet } from "@/components/quiz/answer-feedback-sheet";
import { ChoiceButton, ChoiceState } from "@/components/quiz/choice-button";
import { MockReviewPanel } from "@/components/quiz/mock-review-panel";
import { MockTimerBadge } from "@/components/quiz/mock-timer-badge";
import { QuizResultView } from "@/components/quiz/quiz-result-view";
import {
  QuizExitDialog,
  QuizPauseDialog,
} from "@/components/quiz/quiz-session-dialogs";
import { QuizProgressBar } from "@/components/quiz/quiz-progress-bar";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Radius, Spacing } from "@/constants/theme";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useExamCatalog } from "@/hooks/use-exam-catalog";
import { useExamEnrollment } from "@/hooks/use-exam-enrollment";
import { useQuizSession } from "@/hooks/use-quiz-session";
import { useSessionRewards } from "@/hooks/use-session-rewards";
import { useSettings } from "@/hooks/use-settings";
import { useTheme } from "@/hooks/use-theme";
import { useWrongAnswerNotes } from "@/hooks/use-wrong-answer-notes";
import { calculateSessionXp } from "@/learning/progression";
import { goBack } from "@/lib/navigation";
import type { QuizMode } from "@/types/exam";

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

// 키보드 입력 대상 편집 상태 판별
function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined" || !(target instanceof HTMLElement))
    return false;
  return (
    target.closest("input, textarea, select, [contenteditable='true']") != null
  );
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
  const reduceMotion = useReducedMotion();
  const [exitConfirming, setExitConfirming] = useState(false);
  const [sessionPaused, setSessionPaused] = useState(false);
  const [mockExpired, setMockExpired] = useState(false);
  const [mockReviewOpen, setMockReviewOpen] = useState(false);

  const {
    status,
    questions,
    currentQuestion,
    currentIndex,
    selectedIndex,
    isSubmitted,
    isLastQuestion,
    willRequeueCurrent,
    correctCount,
    answers,
    flaggedQuestionIds,
    mockDeadline,
    canRateConfidence,
    currentConfidence,
    rateConfidence,
    selectChoice,
    submitAnswer,
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

  const navigation = useNavigation();
  const [leaveConfirmed, setLeaveConfirmed] = useState(false);
  const [pendingLeaveAction, setPendingLeaveAction] =
    useState<NavigationAction | null>(null);

  // 스와이프·하드웨어·브라우저 뒤로가기 이탈 확인
  usePreventRemove(status === "in-progress" && !leaveConfirmed, ({ data }) => {
    if (mockReviewOpen) {
      setMockReviewOpen(false);
      return;
    }
    if (exitConfirming) {
      setExitConfirming(false);
      setPendingLeaveAction(null);
      return;
    }
    setPendingLeaveAction(data.action);
    setExitConfirming(true);
  });

  // 이탈 확정 후 보류된 이동 실행
  useEffect(() => {
    if (!leaveConfirmed) return;
    if (pendingLeaveAction != null) navigation.dispatch(pendingLeaveAction);
    else goBack();
  }, [leaveConfirmed, navigation, pendingLeaveAction]);

  // 모의고사 제한 시간 종료
  const handleMockExpire = useCallback(() => {
    setMockExpired(true);
    finishMockSession();
  }, [finishMockSession]);

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
      event.preventDefault();
      goNext();
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, [
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
    settings.keyboardShortcutsEnabled,
    status,
    submitAnswer,
    toggleBookmark,
    toggleQuestionFlag,
  ]);

  // 채점 결과 네이티브 스크린리더 안내
  useEffect(() => {
    if (!isSubmitted || quizMode === "mock" || currentQuestion == null) return;
    AccessibilityInfo.announceForAccessibility(
      selectedIndex === currentQuestion.answerIndex
        ? "정답입니다"
        : `오답입니다. 정답은 ${String.fromCharCode(65 + currentQuestion.answerIndex)}번이에요`,
    );
  }, [currentQuestion, isSubmitted, quizMode, selectedIndex]);

  if (status === "loading") {
    return (
      <ThemedView style={styles.container}>
        <PageHead title="문제 풀이" noIndex />
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContent}>
            <SkeletonBlock height={7} radius={Radius.pill} />
            <SkeletonBlock width="45%" height={20} />
            <SkeletonBlock height={26} />
            <SkeletonBlock width="80%" height={26} />
            <View style={styles.loadingChoices}>
              {[0, 1, 2, 3].map((placeholderIndex) => (
                <SkeletonBlock
                  key={placeholderIndex}
                  height={62}
                  radius={Radius.medium}
                />
              ))}
            </View>
          </View>
        </SafeAreaView>
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
          <CtaButton label="돌아가기" onPress={() => goBack()} />
        </View>
      </ThemedView>
    );
  }

  if (status === "finished")
    return (
      <QuizResultView
        examId={params.examId}
        quizMode={quizMode}
        isDiagnostic={isDiagnostic}
        isCustomSession={isCustomSession}
        mockExpired={mockExpired}
        questions={questions}
        answers={answers}
        correctCount={correctCount}
        earnedXp={earnedXp}
        rewards={rewards}
        isRewardsLoading={isRewardsLoading}
        bookmarkedQuestionIds={bookmarkedQuestionIds}
        wrongAnswerNotes={wrongAnswerNotes}
        restartWrongAnswers={restartWrongAnswers}
        toggleBookmark={toggleBookmark}
        addBookmarks={addBookmarks}
        toggleTag={toggleTag}
        updateNote={updateNote}
      />
    );

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
      <PageHead title="문제 풀이" noIndex />
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
              <MockTimerBadge
                durationSeconds={settings.mockDurationMinutes * 60}
                active={status === "in-progress"}
                deadline={mockDeadline}
                onExpire={handleMockExpire}
              />
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

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            key={currentQuestion.id}
            entering={
              reduceMotion || Platform.OS === "android"
                ? undefined
                : FadeInRight.duration(280)
            }
            exiting={
              reduceMotion || Platform.OS === "android"
                ? undefined
                : FadeOutLeft.duration(180)
            }
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
                      aria-selected={isQuestionFlagged}
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
                  <ToggleIconButton
                    active={isBookmarked}
                    accessibilityLabel={
                      isBookmarked
                        ? "저장 문제에서 제거"
                        : "다시 볼 문제로 저장"
                    }
                    activeColor={theme.primary}
                    activeBackground={theme.primarySoft}
                    iconName={{
                      ios: isBookmarked ? "bookmark.fill" : "bookmark",
                      android: isBookmarked ? "bookmark" : "bookmark_border",
                      web: isBookmarked ? "bookmark" : "bookmark_border",
                    }}
                    onPress={() => toggleBookmark(currentQuestion.id)}
                  />
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
            <ThemedText type="small" themeColor="textSecondary">
              {currentQuestion.sourceType === "public_past_exam"
                ? "공개 이용 조건을 확인한 기출 유형"
                : "유형별 연습문제 · 실제 기출 원문 아님"}
              {currentQuestion.version == null
                ? ""
                : ` · 버전 ${currentQuestion.version}`}
              {currentQuestion.examId.startsWith("toeic")
                ? " · 문법·어휘 연습이며 전체 시험 모의평가가 아닙니다"
                : ""}
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
          !isSubmitted && (
            <CtaButton
              label="확인"
              disabled={selectedIndex == null}
              onPress={submitAnswer}
            />
          )
        )}
      </SafeAreaView>

      {isSubmitted && quizMode !== "mock" && (
        <AnswerFeedbackSheet
          question={currentQuestion}
          isCorrect={isCorrectAnswer}
          willRequeue={willRequeueCurrent}
          isLastQuestion={isLastQuestion}
          showExplanation={settings.explanationEnabled}
          showConfidenceRating={
            settings.confidenceRatingEnabled && canRateConfidence
          }
          confidence={currentConfidence}
          onRateConfidence={rateConfidence}
          onNext={goNext}
        />
      )}

      {exitConfirming && (
        <QuizExitDialog
          isMock={quizMode === "mock"}
          onContinue={() => {
            setExitConfirming(false);
            setPendingLeaveAction(null);
          }}
          onLeave={() => setLeaveConfirmed(true)}
        />
      )}

      {sessionPaused && !exitConfirming && (
        <QuizPauseDialog
          onResume={() => setSessionPaused(false)}
          onLeave={() => setLeaveConfirmed(true)}
        />
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
