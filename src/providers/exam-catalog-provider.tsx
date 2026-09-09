import { useGlobalSearchParams } from "expo-router";
import {
  loadExamEnrollment,
  subscribeExamEnrollment,
} from "@/storage/exam-enrollment-store";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppState } from "react-native";

import { examCatalogRepository } from "@/repositories/local-exam-catalog-repository";
import { Exam, Question } from "@/types/exam";

interface ExamCatalogContextValue {
  exams: Exam[];
  questions: Question[];
  isLoading: boolean;
  errorMessage: string | null;
  reload: () => Promise<void>;
  findExam: (examId: string) => Exam | undefined;
  findQuestion: (questionId: string) => Question | undefined;
  selectQuestionsByExam: (examId: string) => Question[];
}

const ExamCatalogContext = createContext<ExamCatalogContextValue | null>(null);

// 시험 카탈로그 상태 제공
export function ExamCatalogProvider({ children }: PropsWithChildren) {
  const { examId: routeExamId } = useGlobalSearchParams<{ examId?: string }>();
  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 시험 카탈로그 갱신
  const reload = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const enrollment = await loadExamEnrollment();
      const catalog = await examCatalogRepository.loadCatalog([
        ...(enrollment?.examIds ?? []),
        ...(routeExamId ? [routeExamId] : []),
      ]);
      setExams(catalog.exams);
      setQuestions(catalog.questions);
      if (catalog.isOffline || catalog.unavailableExamIds?.length)
        setErrorMessage(
          "일부 시험은 이전 저장 문제를 표시합니다. 연결 후 다시 시도해 주세요.",
        );
    } catch {
      setErrorMessage("시험 목록을 불러오지 못했어요. 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  }, [routeExamId]);

  // 시험 카탈로그 초기 로드
  useEffect(() => {
    let active = true;

    // 저장 시험 카탈로그 반영
    const hydrate = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const enrollment = await loadExamEnrollment();
        const catalog = await examCatalogRepository.loadCatalog([
          ...(enrollment?.examIds ?? []),
          ...(routeExamId ? [routeExamId] : []),
        ]);
        if (!active) return;
        setExams(catalog.exams);
        setQuestions(catalog.questions);
        if (catalog.isOffline || catalog.unavailableExamIds?.length)
          setErrorMessage(
            "일부 시험을 갱신하지 못했어요. 연결 후 다시 시도해 주세요.",
          );
      } catch {
        if (active)
          setErrorMessage("시험 목록을 불러오지 못했어요. 다시 시도해 주세요.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, [routeExamId]);

  // 시험 등록 변경에 따른 문제 다운로드
  useEffect(
    () =>
      subscribeExamEnrollment(() => {
        void Promise.resolve().then(reload);
      }),
    [reload],
  );

  // 앱 복귀 시 공개 시험 목록 갱신
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void reload();
    });
    return () => subscription.remove();
  }, [reload]);

  // 시험 정보 조회
  const findExam = useCallback(
    (examId: string) => exams.find((exam) => exam.id === examId),
    [exams],
  );

  // 문제 정보 조회
  const findQuestion = useCallback(
    (questionId: string) =>
      questions.find((question) => question.id === questionId),
    [questions],
  );

  // 시험별 문제 목록 추출
  const selectQuestionsByExam = useCallback(
    (examId: string) =>
      questions.filter((question) => question.examId === examId),
    [questions],
  );

  const value = useMemo(
    () => ({
      exams,
      questions,
      isLoading,
      errorMessage,
      reload,
      findExam,
      findQuestion,
      selectQuestionsByExam,
    }),
    [
      errorMessage,
      exams,
      findExam,
      findQuestion,
      isLoading,
      questions,
      reload,
      selectQuestionsByExam,
    ],
  );

  return (
    <ExamCatalogContext.Provider value={value}>
      {children}
    </ExamCatalogContext.Provider>
  );
}

// 시험 카탈로그 상태 사용
export function useExamCatalogContext(): ExamCatalogContextValue {
  const context = useContext(ExamCatalogContext);
  if (context == null)
    throw new Error("ExamCatalogProvider 내부에서 사용해야 합니다.");
  return context;
}
