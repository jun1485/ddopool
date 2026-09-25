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
  useRef,
  useState,
} from "react";
import { AppState } from "react-native";

import { examCatalogRepository } from "@/repositories/local-exam-catalog-repository";
import type { ExamCatalogSnapshot } from "@/repositories/exam-catalog-repository";
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
const BACKGROUND_REFRESH_INTERVAL_MS = 60_000;

// 카탈로그 화면 데이터 변경 식별값 생성
function createCatalogRevision(catalog: ExamCatalogSnapshot): string {
  const exams = catalog.exams
    .map((exam) =>
      [
        exam.id,
        exam.title,
        exam.shortTitle,
        exam.description,
        exam.icon,
        exam.subjects.join(","),
      ].join(":"),
    )
    .join("|");
  const questions = catalog.questions
    .map((question) => `${question.id}:${question.version}`)
    .join("|");
  return `${exams}::${questions}`;
}

// 시험 카탈로그 상태 제공
export function ExamCatalogProvider({ children }: PropsWithChildren) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const revisionRef = useRef("");
  const lastRefreshAtRef = useRef(0);

  // 변경된 카탈로그 화면 데이터만 반영
  const applyCatalog = useCallback((catalog: ExamCatalogSnapshot) => {
    const revision = createCatalogRevision(catalog);
    if (revisionRef.current === revision) return;
    revisionRef.current = revision;
    setExams(catalog.exams);
    setQuestions(catalog.questions);
  }, []);

  // 시험 카탈로그 갱신
  const reload = useCallback(async () => {
    lastRefreshAtRef.current = Date.now();
    setErrorMessage(null);
    try {
      const enrollment = await loadExamEnrollment();
      const catalog = await examCatalogRepository.loadCatalog(
        enrollment?.examIds ?? [],
      );
      applyCatalog(catalog);
      if (catalog.isOffline || catalog.unavailableExamIds?.length)
        setErrorMessage(
          "일부 시험은 이전 저장 문제를 표시합니다. 연결 후 다시 시도해 주세요.",
        );
    } catch {
      setErrorMessage("시험 목록을 불러오지 못했어요. 다시 시도해 주세요.");
    } finally {
      setIsLoading(false);
    }
  }, [applyCatalog]);

  // 시험 카탈로그 초기 로드
  useEffect(() => {
    let active = true;

    // 저장 시험 카탈로그 반영
    const hydrate = async () => {
      setIsLoading(true);
      setErrorMessage(null);
      try {
        const enrollment = await loadExamEnrollment();
        const catalog = await examCatalogRepository.loadCatalog(
          enrollment?.examIds ?? [],
        );
        if (!active) return;
        applyCatalog(catalog);
        if (catalog.isOffline || catalog.unavailableExamIds?.length)
          setErrorMessage(
            "일부 시험을 갱신하지 못했어요. 연결 후 다시 시도해 주세요.",
          );
      } catch {
        if (active)
          setErrorMessage("시험 목록을 불러오지 못했어요. 다시 시도해 주세요.");
      } finally {
        if (active) {
          lastRefreshAtRef.current = Date.now();
          setIsLoading(false);
        }
      }
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, [applyCatalog]);

  // 시험 등록 변경에 따른 문제 다운로드
  useEffect(
    () =>
      subscribeExamEnrollment(() => {
        setIsLoading(true);
        void Promise.resolve().then(reload);
      }),
    [reload],
  );

  // 앱 복귀 시 공개 시험 목록 갱신
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (
        state === "active" &&
        Date.now() - lastRefreshAtRef.current >= BACKGROUND_REFRESH_INTERVAL_MS
      )
        void reload();
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
