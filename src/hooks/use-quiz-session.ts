import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

import { useExamCatalog } from "@/hooks/use-exam-catalog";
import { useSettings } from "@/hooks/use-settings";
import { createSrsCard, reviewSrsCard } from "@/srs/sm2";
import { loadBookmarks } from "@/storage/bookmark-store";
import { recordAnswer } from "@/storage/stats-store";
import { loadSrsCards, saveSrsCards, SrsCardMap } from "@/storage/srs-store";
import { enqueueLearningSync } from "@/sync/learning-sync-outbox";
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
}

// 퀴즈 세션 반환 값
export interface QuizSession {
  status: QuizStatus;
  questions: Question[];
  currentQuestion: Question | null;
  currentIndex: number;
  selectedIndex: number | null;
  isSubmitted: boolean;
  isLastQuestion: boolean;
  correctCount: number;
  answers: QuizAnswer[];
  selectChoice: (choiceIndex: number) => void;
  submitAnswer: () => void;
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
): QuizSession {
  const {
    questions: catalogQuestions,
    isLoading: isCatalogLoading,
    selectQuestionsByExam,
  } = useExamCatalog();
  const { settings, isLoading: isSettingsLoading } = useSettings();
  const [status, setStatus] = useState<QuizStatus>("loading");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [cards, setCards] = useState<SrsCardMap>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);

  // 모드별 세션 문제 목록 구성
  useEffect(() => {
    if (isCatalogLoading || isSettingsLoading) return;

    let cancelled = false;

    // 세션 출제 문제 구성
    const prepare = async () => {
      const [storedCards, bookmarkedQuestionIds] = await Promise.all([
        loadSrsCards(),
        loadBookmarks(),
      ]);
      if (cancelled) return;

      const selectedQuestionIds = new Set(
        questionIds?.split(",").filter(Boolean) ?? [],
      );
      const examQuestions =
        selectedQuestionIds.size > 0
          ? catalogQuestions.filter((question) =>
              selectedQuestionIds.has(question.id),
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
      const orderedQuestions = settings.shuffleQuestionsEnabled
        ? shuffle(targets)
        : targets;
      const sessionLimit =
        examId === "all" && mode === "review"
          ? orderedQuestions.length
          : settings.sessionSize;
      const picked = orderedQuestions
        .slice(0, sessionLimit)
        .map((question) =>
          settings.shuffleChoicesEnabled ? shuffleChoices(question) : question,
        );

      setCards(storedCards);
      setQuestions(picked);
      setCurrentIndex(0);
      setSelectedIndex(null);
      setIsSubmitted(false);
      setCorrectCount(0);
      setAnswers([]);
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
    settings.sessionSize,
    settings.shuffleChoicesEnabled,
    settings.shuffleQuestionsEnabled,
    selectQuestionsByExam,
  ]);

  // 보기 선택
  const selectChoice = useCallback(
    (choiceIndex: number) => {
      if (isSubmitted) return;
      setSelectedIndex(choiceIndex);
    },
    [isSubmitted],
  );

  // 채점 및 SRS 카드 갱신 저장
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
    const baseCard =
      cards[question.id] ?? createSrsCard(question.id, question.examId, now);
    const nextCards: SrsCardMap = {
      ...cards,
      [question.id]: reviewSrsCard(baseCard, isCorrect, now),
    };

    setCards(nextCards);
    setIsSubmitted(true);
    if (isCorrect) setCorrectCount((count) => count + 1);
    setAnswers((current) => [
      ...current,
      {
        questionId: question.id,
        subject: question.subject,
        selectedIndex,
        isCorrect,
      },
    ]);
    void saveSrsCards(nextCards);
    void recordAnswer(
      isCorrect,
      question.examId,
      question.subject,
      now,
      question.id,
    );
    void enqueueLearningSync({
      type: "attempt",
      payload: {
        questionId: question.id,
        examId: question.examId,
        subject: question.subject,
        selectedIndex,
        isCorrect,
        mode,
        answeredAt: new Date(now).toISOString(),
      },
    });
    void enqueueLearningSync({
      type: "progress",
      payload: [toProgressInput(nextCards[question.id])],
    });
    if (settings.hapticsEnabled) void triggerAnswerHaptic(isCorrect);
  }, [
    cards,
    currentIndex,
    isSubmitted,
    mode,
    questions,
    selectedIndex,
    settings.hapticsEnabled,
  ]);

  // 모의고사 전체 답안 채점
  const finishMockSession = useCallback(() => {
    if (mode !== "mock" || status !== "in-progress") return;

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
      };
    });
    const answeredResults = finalAnswers.filter(
      (answer) => answer.selectedIndex != null,
    );
    const nextCards = answeredResults.reduce<SrsCardMap>((result, answer) => {
      const question = questions.find((item) => item.id === answer.questionId);
      if (question == null) return result;
      const now = Date.now();
      const baseCard =
        result[question.id] ?? createSrsCard(question.id, question.examId, now);
      void recordAnswer(
        answer.isCorrect,
        question.examId,
        question.subject,
        now,
        question.id,
      );
      void enqueueLearningSync({
        type: "attempt",
        payload: {
          questionId: question.id,
          examId: question.examId,
          subject: question.subject,
          selectedIndex: answer.selectedIndex,
          isCorrect: answer.isCorrect,
          mode: "mock",
          answeredAt: new Date(now).toISOString(),
        },
      });
      return {
        ...result,
        [question.id]: reviewSrsCard(baseCard, answer.isCorrect, now),
      };
    }, cards);

    setCards(nextCards);
    setAnswers(finalAnswers);
    setCorrectCount(finalAnswers.filter((answer) => answer.isCorrect).length);
    setStatus("finished");
    if (answeredResults.length > 0) {
      void saveSrsCards(nextCards);
      const updatedCards = answeredResults.reduce<SrsCard[]>(
        (result, answer) => {
          const card = nextCards[answer.questionId];
          return card == null ? result : [...result, card];
        },
        [],
      );
      void enqueueLearningSync({
        type: "progress",
        payload: updatedCards.map(toProgressInput),
      });
    }
  }, [answers, cards, currentIndex, mode, questions, selectedIndex, status]);

  // 다음 문제 이동 또는 세션 종료
  const goNext = useCallback(() => {
    if (mode === "mock") {
      const question = questions[currentIndex];
      if (question == null) return;
      if (currentIndex + 1 >= questions.length) {
        finishMockSession();
        return;
      }
      setAnswers((current) => [
        ...current,
        {
          questionId: question.id,
          subject: question.subject,
          selectedIndex,
          isCorrect: selectedIndex === question.answerIndex,
        },
      ]);
      setCurrentIndex((index) => index + 1);
      setSelectedIndex(null);
      return;
    }

    if (!isSubmitted) return;
    if (currentIndex + 1 >= questions.length) {
      setStatus("finished");
      return;
    }
    setCurrentIndex((index) => index + 1);
    setSelectedIndex(null);
    setIsSubmitted(false);
  }, [
    currentIndex,
    finishMockSession,
    isSubmitted,
    mode,
    questions,
    selectedIndex,
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
    setCorrectCount(0);
    setAnswers([]);
    setStatus(retryQuestions.length === 0 ? "finished" : "in-progress");
  }, [
    answers,
    questions,
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
    isLastQuestion: currentIndex + 1 >= questions.length,
    correctCount,
    answers,
    selectChoice,
    submitAnswer,
    goNext,
    finishMockSession,
    restartWrongAnswers,
  };
}
