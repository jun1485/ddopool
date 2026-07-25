import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus, Platform } from "react-native";

import { useAuth } from "@/hooks/use-auth";
import { useExamCatalog } from "@/hooks/use-exam-catalog";
import { useSettings } from "@/hooks/use-settings";
import { selectAdaptiveQuestions } from "@/learning/adaptive-questions";
import { getConfidenceReviewQuality } from "@/learning/answer-confidence";
import type { AnswerConfidence } from "@/learning/answer-confidence";
import { createSrsCard, reviewSrsCard } from "@/srs/sm2";
import {
  clearActiveQuizSession,
  loadActiveQuizSession,
  saveActiveQuizSession,
} from "@/storage/active-quiz-session-store";
import { loadBookmarks } from "@/storage/bookmark-store";
import { recordLearningSessionResult } from "@/storage/learning-session-history-store";
import {
  MockExamSubjectResult,
  recordMockExamResult,
} from "@/storage/mock-exam-history-store";
import { loadPerformanceStats, recordAnswer } from "@/storage/stats-store";
import {
  loadSrsCards,
  SrsCardMap,
  updateSrsCard,
  updateSrsCards,
} from "@/storage/srs-store";
import {
  recordUncertainAnswerState,
  recordWrongAnswerState,
} from "@/storage/wrong-answer-note-store";
import { queueLearningAttempt } from "@/sync/learning-attempt-sync";
import {
  enqueueLearningSync,
  getLearningSyncOutboxVersion,
} from "@/sync/learning-sync-outbox";
import { Question, QuizMode, SrsCard } from "@/types/exam";

// 채점 결과 햅틱 피드백 실행
async function triggerAnswerHaptic(isCorrect: boolean): Promise<void> {
  if (Platform.OS === "web") return;
  await Haptics.notificationAsync(
    isCorrect
      ? Haptics.NotificationFeedbackType.Success
      : Haptics.NotificationFeedbackType.Error,
  );
}

// 퀴즈 세션 진행 상태
export type QuizStatus = "loading" | "empty" | "in-progress" | "finished";

// 문제별 세션 채점 결과
export interface QuizAnswer {
  questionId: string;
  subject: string;
  selectedIndex: number | null;
  isCorrect: boolean;
  confidence: AnswerConfidence | null;
}

// 모의고사 과목별 채점 결과 집계
function createMockSubjectResults(
  questions: Question[],
  answers: QuizAnswer[],
): MockExamSubjectResult[] {
  const correctQuestionIds = new Set(
    answers
      .filter((answer) => answer.isCorrect)
      .map((answer) => answer.questionId),
  );
  const subjectResults = new Map<string, MockExamSubjectResult>();

  questions.forEach((question) => {
    const key = `${question.examId}:${question.subject}`;
    const current = subjectResults.get(key) ?? {
      examId: question.examId,
      subject: question.subject,
      correct: 0,
      total: 0,
    };
    subjectResults.set(key, {
      ...current,
      correct: current.correct + (correctQuestionIds.has(question.id) ? 1 : 0),
      total: current.total + 1,
    });
  });

  return [...subjectResults.values()];
}

// 퀴즈 세션 반환 값
export interface QuizSession {
  status: QuizStatus;
  questions: Question[];
  currentQuestion: Question | null;
  currentIndex: number;
  selectedIndex: number | null;
  isSubmitted: boolean;
  answerConfidence: AnswerConfidence | null;
  isLastQuestion: boolean;
  correctCount: number;
  answers: QuizAnswer[];
  flaggedQuestionIds: string[];
  selectChoice: (choiceIndex: number) => void;
  submitAnswer: () => void;
  rateConfidence: (confidence: AnswerConfidence) => void;
  goToQuestion: (questionIndex: number) => void;
  toggleQuestionFlag: () => void;
  goNext: () => void;
  finishMockSession: () => void;
  restartWrongAnswers: () => void;
}

// 배열 무작위 섞기
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 보기 순서 무작위화 및 answerIndex 재계산
function shuffleChoices(question: Question): Question {
  const order = shuffle(question.choices.map((_, index) => index));
  return {
    ...question,
    choices: order.map((originalIndex) => question.choices[originalIndex]),
    answerIndex: order.indexOf(question.answerIndex),
  };
}

// SRS 카드 서버 동기화 입력 변환
function toProgressInput(card: SrsCard) {
  return {
    questionId: card.questionId,
    examId: card.examId,
    repetitions: card.repetitions,
    easeFactor: card.easeFactor,
    intervalDays: card.intervalDays,
    dueAt: new Date(card.dueAt).toISOString(),
    lastReviewedAt: new Date(card.lastReviewedAt).toISOString(),
  };
}

// 퀴즈 진행(출제·채점·SRS 반영) 훅
export function useQuizSession(
  examId: string,
  mode: QuizMode,
  questionIds?: string,
  resumeRequested = false,
  paused = false,
): QuizSession {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const {
    questions: catalogQuestions,
    isLoading: isCatalogLoading,
    selectQuestionsByExam,
  } = useExamCatalog();
  const { settings, isLoading: isSettingsLoading } = useSettings();
  const sessionRequestKey = `${examId}:${mode}:${questionIds ?? ""}:${
    resumeRequested ? "resume" : "new"
  }`;
  const [status, setStatus] = useState<QuizStatus>("loading");
  const [preparedSessionKey, setPreparedSessionKey] = useState<string | null>(
    null,
  );
  const [questions, setQuestions] = useState<Question[]>([]);
  const [cards, setCards] = useState<SrsCardMap>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [answerConfidence, setAnswerConfidence] =
    useState<AnswerConfidence | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<string[]>([]);
  const sessionElapsedMs = useRef(0);
  const activeSegmentStartedAt = useRef<number | null>(null);
  const sessionPausedRef = useRef(paused);
  const sessionStatusRef = useRef<QuizStatus>("loading");
  const [clockRevision, setClockRevision] = useState(0);
  const sessionFinishLocked = useRef(false);

  // 현재 세션 활성 학습 시간 계산
  const getSessionDurationSeconds = useCallback((now = Date.now()) => {
    const activeSegment =
      activeSegmentStartedAt.current == null
        ? 0
        : now - activeSegmentStartedAt.current;
    return Math.max(
      Math.round((sessionElapsedMs.current + activeSegment) / 1000),
      1,
    );
  }, []);

  // 세션 활성 학습 시계 초기화
  const resetSessionClock = useCallback((elapsedSeconds = 0) => {
    sessionElapsedMs.current = elapsedSeconds * 1000;
    activeSegmentStartedAt.current =
      AppState.currentState === "active" ? Date.now() : null;
  }, []);

  // 세션 활성 학습 시계 실행 상태 전환
  useEffect(() => {
    sessionPausedRef.current = paused;
    sessionStatusRef.current = status;
    const now = Date.now();
    if (paused || status !== "in-progress") {
      if (activeSegmentStartedAt.current == null) return;
      sessionElapsedMs.current += now - activeSegmentStartedAt.current;
      activeSegmentStartedAt.current = null;
      setClockRevision((revision) => revision + 1);
      return;
    }
    if (
      AppState.currentState === "active" &&
      activeSegmentStartedAt.current == null
    )
      activeSegmentStartedAt.current = now;
  }, [paused, status]);

  // 앱 비활성 시간 학습 시간 제외
  useEffect(() => {
    // 앱 상태별 활성 학습 시계 전환
    const updateSessionClock = (nextState: AppStateStatus) => {
      const now = Date.now();
      if (nextState === "active") {
        if (
          !sessionPausedRef.current &&
          sessionStatusRef.current === "in-progress" &&
          activeSegmentStartedAt.current == null
        )
          activeSegmentStartedAt.current = now;
        return;
      }
      if (activeSegmentStartedAt.current == null) return;
      sessionElapsedMs.current += now - activeSegmentStartedAt.current;
      activeSegmentStartedAt.current = null;
      setClockRevision((revision) => revision + 1);
    };

    const subscription = AppState.addEventListener(
      "change",
      updateSessionClock,
    );
    return () => subscription.remove();
  }, []);

  // 모드별 세션 문제 목록 구성
  useEffect(() => {
    if (isCatalogLoading || isSettingsLoading) return;

    let cancelled = false;

    // 세션 출제 문제 구성
    const prepare = async () => {
      const [storedCards, bookmarkedQuestionIds, performance, activeSession] =
        await Promise.all([
          loadSrsCards(),
          loadBookmarks(),
          loadPerformanceStats(),
          resumeRequested && mode !== "mock"
            ? loadActiveQuizSession(Date.now())
            : Promise.resolve(null),
        ]);
      if (cancelled) return;

      if (
        activeSession != null &&
        activeSession.examId === examId &&
        activeSession.mode === mode
      ) {
        setCards(storedCards);
        setQuestions(activeSession.questions);
        setCurrentIndex(activeSession.currentIndex);
        setSelectedIndex(activeSession.selectedIndex);
        setIsSubmitted(activeSession.isSubmitted);
        setAnswerConfidence(
          Object.prototype.hasOwnProperty.call(
            activeSession,
            "answerConfidence",
          )
            ? (activeSession.answerConfidence ?? null)
            : activeSession.isSubmitted
              ? "unsure"
              : null,
        );
        setCorrectCount(activeSession.correctCount);
        setAnswers(
          activeSession.answers.map((answer) => ({
            ...answer,
            confidence: answer.confidence ?? null,
          })),
        );
        setFlaggedQuestionIds([]);
        resetSessionClock(
          activeSession.elapsedSeconds ??
            Math.max(
              Math.round(
                (activeSession.updatedAt -
                  (activeSession.startedAt ?? activeSession.updatedAt)) /
                  1000,
              ),
              0,
            ),
        );
        sessionFinishLocked.current = false;
        setPreparedSessionKey(sessionRequestKey);
        setStatus("in-progress");
        return;
      }

      const requestedQuestionIds =
        questionIds?.split(",").filter(Boolean) ?? [];
      const selectedQuestionIds = new Set(requestedQuestionIds);
      const examQuestions =
        selectedQuestionIds.size > 0
          ? catalogQuestions
              .filter((question) => selectedQuestionIds.has(question.id))
              .sort(
                (left, right) =>
                  requestedQuestionIds.indexOf(left.id) -
                  requestedQuestionIds.indexOf(right.id),
              )
          : examId === "all"
            ? catalogQuestions
            : selectQuestionsByExam(examId);
      const targets =
        mode === "review"
          ? examQuestions.filter((question) => {
              const card = storedCards[question.id];
              return card != null && card.dueAt <= Date.now();
            })
          : mode === "bookmarks"
            ? examQuestions.filter((question) =>
                bookmarkedQuestionIds.includes(question.id),
              )
            : examQuestions;
      const sessionLimit =
        selectedQuestionIds.size > 0
          ? targets.length
          : examId === "all" && mode === "review"
            ? targets.length
            : settings.sessionSize;
      const isAdaptiveSession =
        settings.personalizedQuestionsEnabled &&
        mode === "learn" &&
        selectedQuestionIds.size === 0;
      const selectedQuestions =
        selectedQuestionIds.size > 0
          ? targets.slice(0, sessionLimit)
          : isAdaptiveSession
            ? selectAdaptiveQuestions(
                targets,
                storedCards,
                performance,
                sessionLimit,
                Date.now(),
                settings.shuffleQuestionsEnabled,
              )
            : (settings.shuffleQuestionsEnabled
                ? shuffle(targets)
                : targets
              ).slice(0, sessionLimit);
      const picked = selectedQuestions.map((question) =>
        settings.shuffleChoicesEnabled ? shuffleChoices(question) : question,
      );

      setCards(storedCards);
      setQuestions(picked);
      setCurrentIndex(0);
      setSelectedIndex(null);
      setIsSubmitted(false);
      setAnswerConfidence(null);
      setCorrectCount(0);
      setAnswers([]);
      setFlaggedQuestionIds([]);
      resetSessionClock();
      sessionFinishLocked.current = false;
      setPreparedSessionKey(sessionRequestKey);
      setStatus(picked.length === 0 ? "empty" : "in-progress");
    };

    void prepare();
    return () => {
      cancelled = true;
    };
  }, [
    examId,
    catalogQuestions,
    isCatalogLoading,
    isSettingsLoading,
    mode,
    questionIds,
    resumeRequested,
    resetSessionClock,
    settings.sessionSize,
    settings.personalizedQuestionsEnabled,
    settings.shuffleChoicesEnabled,
    settings.shuffleQuestionsEnabled,
    selectQuestionsByExam,
    sessionRequestKey,
  ]);

  // 진행 중인 일반 학습 세션 자동 저장
  useEffect(() => {
    if (
      mode === "mock" ||
      questions.length === 0 ||
      preparedSessionKey !== sessionRequestKey
    )
      return;
    if (status === "finished") {
      void clearActiveQuizSession();
      return;
    }
    if (status !== "in-progress") return;
    void saveActiveQuizSession({
      examId,
      mode,
      questions,
      currentIndex,
      selectedIndex,
      isSubmitted,
      answerConfidence,
      correctCount,
      answers,
      elapsedSeconds: getSessionDurationSeconds(),
      updatedAt: Date.now(),
    });
  }, [
    answers,
    answerConfidence,
    clockRevision,
    correctCount,
    currentIndex,
    examId,
    isSubmitted,
    getSessionDurationSeconds,
    mode,
    preparedSessionKey,
    questions,
    selectedIndex,
    sessionRequestKey,
    status,
  ]);

  // 보기 선택
  const selectChoice = useCallback(
    (choiceIndex: number) => {
      if (isSubmitted) return;
      setSelectedIndex(choiceIndex);
    },
    [isSubmitted],
  );

  // 확신도 기반 SRS·오답 상태 반영
  const persistSrsReview = useCallback(
    (
      question: Question,
      isCorrect: boolean,
      confidence: AnswerConfidence | null,
    ) => {
      const now = Date.now();
      const syncVersion = getLearningSyncOutboxVersion();
      const quality =
        confidence == null
          ? undefined
          : getConfidenceReviewQuality(isCorrect, confidence);
      const baseCard =
        cards[question.id] ?? createSrsCard(question.id, question.examId, now);
      const optimisticCard = reviewSrsCard(baseCard, isCorrect, now, quality);
      setCards((current) => ({
        ...current,
        [question.id]: optimisticCard,
      }));
      void updateSrsCard(question.id, (current) =>
        current != null && current.lastReviewedAt > now
          ? current
          : reviewSrsCard(
              current ?? createSrsCard(question.id, question.examId, now),
              isCorrect,
              now,
              quality,
            ),
      ).then((card) => {
        setCards((current) => ({ ...current, [question.id]: card }));
        void enqueueLearningSync(
          {
            type: "progress",
            payload: [toProgressInput(card)],
          },
          userId,
          syncVersion,
        );
      });
      if (isCorrect && confidence != null && confidence !== "confident")
        void recordUncertainAnswerState(question, now);
      else void recordWrongAnswerState(question, isCorrect, now);
    },
    [cards, userId],
  );

  // 채점 및 풀이 기록 저장
  const submitAnswer = useCallback(() => {
    const question = questions[currentIndex];
    if (
      mode === "mock" ||
      question == null ||
      selectedIndex == null ||
      isSubmitted
    )
      return;

    const isCorrect = selectedIndex === question.answerIndex;
    const now = Date.now();

    setIsSubmitted(true);
    setAnswerConfidence(null);
    if (isCorrect) setCorrectCount((count) => count + 1);
    setAnswers((current) => [
      ...current,
      {
        questionId: question.id,
        subject: question.subject,
        selectedIndex,
        isCorrect,
        confidence: null,
      },
    ]);
    if (!settings.confidenceRatingEnabled)
      persistSrsReview(question, isCorrect, null);
    void recordAnswer(
      isCorrect,
      question.examId,
      question.subject,
      now,
      question.id,
    );
    void queueLearningAttempt(
      {
        questionId: question.id,
        examId: question.examId,
        subject: question.subject,
        selectedIndex,
        isCorrect,
        mode,
        answeredAt: new Date(now).toISOString(),
      },
      userId,
    );
    if (settings.hapticsEnabled) void triggerAnswerHaptic(isCorrect);
  }, [
    currentIndex,
    isSubmitted,
    mode,
    persistSrsReview,
    questions,
    selectedIndex,
    settings.confidenceRatingEnabled,
    settings.hapticsEnabled,
    userId,
  ]);

  // 현재 답변 확신도 확정
  const rateConfidence = useCallback(
    (confidence: AnswerConfidence) => {
      const question = questions[currentIndex];
      if (
        mode === "mock" ||
        question == null ||
        !isSubmitted ||
        answerConfidence != null
      )
        return;
      const isCorrect = selectedIndex === question.answerIndex;
      setAnswerConfidence(confidence);
      setAnswers((current) =>
        current.map((answer) =>
          answer.questionId === question.id
            ? { ...answer, confidence }
            : answer,
        ),
      );
      persistSrsReview(question, isCorrect, confidence);
    },
    [
      answerConfidence,
      currentIndex,
      isSubmitted,
      mode,
      persistSrsReview,
      questions,
      selectedIndex,
    ],
  );

  // 모의고사 전체 답안 채점
  const finishMockSession = useCallback(() => {
    if (
      mode !== "mock" ||
      status !== "in-progress" ||
      sessionFinishLocked.current
    )
      return;
    sessionFinishLocked.current = true;

    const currentQuestion = questions[currentIndex];
    const submittedAnswers = new Map(
      answers.map((answer) => [answer.questionId, answer]),
    );
    const finalAnswers = questions.map((question) => {
      const previousAnswer = submittedAnswers.get(question.id);
      const answerSelection =
        question.id === currentQuestion?.id
          ? selectedIndex
          : (previousAnswer?.selectedIndex ?? null);
      return {
        questionId: question.id,
        subject: question.subject,
        selectedIndex: answerSelection,
        isCorrect: answerSelection === question.answerIndex,
        confidence: null,
      };
    });
    const answeredResults = finalAnswers.filter(
      (answer) => answer.selectedIndex != null,
    );
    const finalCorrectCount = finalAnswers.filter(
      (answer) => answer.isCorrect,
    ).length;
    const completedAt = Date.now();
    finalAnswers.forEach((answer) => {
      const question = questions.find((item) => item.id === answer.questionId);
      if (question != null)
        void recordWrongAnswerState(
          question,
          answer.selectedIndex != null && answer.isCorrect,
          completedAt,
        );
    });
    const reviewedAnswers = answeredResults.reduce<
      { answer: QuizAnswer; question: Question; answeredAt: number }[]
    >((result, answer) => {
      const question = questions.find((item) => item.id === answer.questionId);
      return question == null
        ? result
        : [...result, { answer, question, answeredAt: completedAt }];
    }, []);
    const nextCards = reviewedAnswers.reduce<SrsCardMap>((result, review) => {
      const { answer, question, answeredAt } = review;
      const baseCard =
        result[question.id] ??
        createSrsCard(question.id, question.examId, answeredAt);
      void recordAnswer(
        answer.isCorrect,
        question.examId,
        question.subject,
        answeredAt,
        question.id,
      );
      void queueLearningAttempt(
        {
          questionId: question.id,
          examId: question.examId,
          subject: question.subject,
          selectedIndex: answer.selectedIndex,
          isCorrect: answer.isCorrect,
          mode: "mock",
          answeredAt: new Date(answeredAt).toISOString(),
        },
        userId,
      );
      return {
        ...result,
        [question.id]: reviewSrsCard(baseCard, answer.isCorrect, answeredAt),
      };
    }, cards);

    setCards(nextCards);
    setAnswers(finalAnswers);
    setCorrectCount(finalCorrectCount);
    setStatus("finished");
    void recordLearningSessionResult({
      examIds: [...new Set(questions.map((question) => question.examId))],
      questionIds: questions.map((question) => question.id),
      mode,
      questionCount: questions.length,
      answeredCount: answeredResults.length,
      correctCount: finalCorrectCount,
      durationSeconds: getSessionDurationSeconds(completedAt),
      completedAt,
    });
    void recordMockExamResult({
      examIds: [...new Set(questions.map((question) => question.examId))],
      questionCount: questions.length,
      answeredCount: answeredResults.length,
      correctCount: finalCorrectCount,
      durationSeconds: getSessionDurationSeconds(completedAt),
      subjectResults: createMockSubjectResults(questions, finalAnswers),
      completedAt,
    });
    if (reviewedAnswers.length > 0) {
      const syncVersion = getLearningSyncOutboxVersion();
      void updateSrsCards((current) =>
        reviewedAnswers.reduce<SrsCardMap>(
          (result, { answer, question, answeredAt }) => {
            const currentCard = result[question.id];
            return currentCard != null &&
              currentCard.lastReviewedAt > answeredAt
              ? result
              : {
                  ...result,
                  [question.id]: reviewSrsCard(
                    currentCard ??
                      createSrsCard(question.id, question.examId, answeredAt),
                    answer.isCorrect,
                    answeredAt,
                  ),
                };
          },
          current,
        ),
      ).then((updatedCards) => {
        setCards(updatedCards);
        void enqueueLearningSync(
          {
            type: "progress",
            payload: reviewedAnswers.map(({ question }) =>
              toProgressInput(updatedCards[question.id]),
            ),
          },
          userId,
          syncVersion,
        );
      });
    }
  }, [
    answers,
    cards,
    currentIndex,
    getSessionDurationSeconds,
    mode,
    questions,
    selectedIndex,
    status,
    userId,
  ]);

  // 모의고사 현재 답안 저장 후 지정 문항 이동
  const goToQuestion = useCallback(
    (questionIndex: number) => {
      const currentQuestion = questions[currentIndex];
      if (
        mode !== "mock" ||
        currentQuestion == null ||
        questionIndex < 0 ||
        questionIndex >= questions.length
      )
        return;
      const currentAnswer: QuizAnswer = {
        questionId: currentQuestion.id,
        subject: currentQuestion.subject,
        selectedIndex,
        isCorrect: selectedIndex === currentQuestion.answerIndex,
        confidence: null,
      };
      const nextAnswers = [
        ...answers.filter(
          (answer) => answer.questionId !== currentQuestion.id,
        ),
        currentAnswer,
      ];
      const targetQuestion = questions[questionIndex];
      const targetAnswer = nextAnswers.find(
        (answer) => answer.questionId === targetQuestion.id,
      );

      setAnswers(nextAnswers);
      setCurrentIndex(questionIndex);
      setSelectedIndex(targetAnswer?.selectedIndex ?? null);
    },
    [answers, currentIndex, mode, questions, selectedIndex],
  );

  // 모의고사 현재 문항 검토 표시 전환
  const toggleQuestionFlag = useCallback(() => {
    const question = questions[currentIndex];
    if (mode !== "mock" || question == null) return;
    setFlaggedQuestionIds((current) =>
      current.includes(question.id)
        ? current.filter((questionId) => questionId !== question.id)
        : [...current, question.id],
    );
  }, [currentIndex, mode, questions]);

  // 다음 문제 이동 또는 세션 종료
  const goNext = useCallback(() => {
    if (mode === "mock") {
      const question = questions[currentIndex];
      if (question == null) return;
      if (currentIndex + 1 >= questions.length) {
        goToQuestion(currentIndex);
        return;
      }
      goToQuestion(currentIndex + 1);
      return;
    }

    if (
      !isSubmitted ||
      (settings.confidenceRatingEnabled && answerConfidence == null)
    )
      return;
    if (currentIndex + 1 >= questions.length) {
      if (sessionFinishLocked.current) return;
      sessionFinishLocked.current = true;
      const completedAt = Date.now();
      void recordLearningSessionResult({
        examIds: [...new Set(questions.map((question) => question.examId))],
        questionIds: questions.map((question) => question.id),
        mode,
        questionCount: questions.length,
        answeredCount: answers.length,
        correctCount,
        durationSeconds: getSessionDurationSeconds(completedAt),
        completedAt,
      });
      setStatus("finished");
      return;
    }
    setCurrentIndex((index) => index + 1);
    setSelectedIndex(null);
    setIsSubmitted(false);
    setAnswerConfidence(null);
  }, [
    answerConfidence,
    answers,
    correctCount,
    currentIndex,
    getSessionDurationSeconds,
    goToQuestion,
    isSubmitted,
    mode,
    questions,
    settings.confidenceRatingEnabled,
  ]);

  // 오답 문제 재도전 세션 시작
  const restartWrongAnswers = useCallback(() => {
    const wrongQuestionIds = new Set(
      answers
        .filter((answer) => !answer.isCorrect)
        .map((answer) => answer.questionId),
    );
    const retryQuestions = questions
      .filter((question) => wrongQuestionIds.has(question.id))
      .map((question) =>
        settings.shuffleChoicesEnabled ? shuffleChoices(question) : question,
      );

    setQuestions(
      settings.shuffleQuestionsEnabled
        ? shuffle(retryQuestions)
        : retryQuestions,
    );
    setCurrentIndex(0);
    setSelectedIndex(null);
    setIsSubmitted(false);
    setAnswerConfidence(null);
    setCorrectCount(0);
    setAnswers([]);
    setFlaggedQuestionIds([]);
    resetSessionClock();
    sessionFinishLocked.current = false;
    setStatus(retryQuestions.length === 0 ? "finished" : "in-progress");
  }, [
    answers,
    questions,
    resetSessionClock,
    settings.shuffleChoicesEnabled,
    settings.shuffleQuestionsEnabled,
  ]);

  return {
    status,
    questions,
    currentQuestion: questions[currentIndex] ?? null,
    currentIndex,
    selectedIndex,
    isSubmitted,
    answerConfidence,
    isLastQuestion: currentIndex + 1 >= questions.length,
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
  };
}
