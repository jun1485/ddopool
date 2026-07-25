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

import { useAuth } from "@/hooks/use-auth";
import {
  ExamEnrollmentState,
  loadExamEnrollment,
  saveExamEnrollment,
  subscribeExamEnrollment,
} from "@/storage/exam-enrollment-store";
import { loadSrsCards } from "@/storage/srs-store";
import { enqueueLearningSync } from "@/sync/learning-sync-outbox";

interface ExamEnrollmentContextValue {
  examIds: string[];
  onboardingCompleted: boolean;
  isLoading: boolean;
  addExam: (examId: string) => void;
  removeExam: (examId: string) => void;
  toggleExam: (examId: string) => void;
  completeOnboarding: (examIds: string[]) => void;
}

const ExamEnrollmentContext = createContext<ExamEnrollmentContextValue | null>(
  null,
);

const INITIAL_ENROLLMENT: ExamEnrollmentState = {
  examIds: [],
  onboardingCompleted: false,
};

// 시험 식별자 중복 제거
function uniqueExamIds(examIds: string[]): string[] {
  return [...new Set(examIds)];
}

// 내 시험 등록 상태 제공
export function ExamEnrollmentProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [enrollment, setEnrollment] =
    useState<ExamEnrollmentState>(INITIAL_ENROLLMENT);
  const enrollmentRef = useRef(INITIAL_ENROLLMENT);
  const [isLoading, setIsLoading] = useState(true);

  // 내 시험 등록 상태 즉시 반영
  const applyEnrollment = useCallback((state: ExamEnrollmentState) => {
    enrollmentRef.current = state;
    setEnrollment(state);
  }, []);

  // 내 시험 등록 상태 초기 로드
  useEffect(() => {
    let active = true;

    // 기존 학습 기록 기반 내 시험 상태 반영
    const hydrate = async () => {
      const storedEnrollment = await loadExamEnrollment();
      if (!active) return;
      if (storedEnrollment != null) {
        applyEnrollment(storedEnrollment);
        setIsLoading(false);
        return;
      }

      const cards = await loadSrsCards();
      if (!active) return;
      const migratedExamIds = uniqueExamIds(
        Object.values(cards).map((card) => card.examId),
      );
      const migratedEnrollment: ExamEnrollmentState = {
        examIds: migratedExamIds,
        onboardingCompleted: migratedExamIds.length > 0,
      };
      applyEnrollment(migratedEnrollment);
      setIsLoading(false);
      if (migratedExamIds.length > 0)
        void saveExamEnrollment(migratedEnrollment);
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, [applyEnrollment]);

  // 외부 내 시험 등록 변경 반영
  useEffect(() => subscribeExamEnrollment(applyEnrollment), [applyEnrollment]);

  // 내 시험 등록 상태 갱신
  const updateEnrollment = useCallback(
    (createNext: (current: ExamEnrollmentState) => ExamEnrollmentState) => {
      const next = createNext(enrollmentRef.current);
      applyEnrollment(next);
      void saveExamEnrollment(next);
    },
    [applyEnrollment],
  );

  // 내 시험 추가
  const addExam = useCallback(
    (examId: string) => {
      updateEnrollment((current) => ({
        ...current,
        examIds: uniqueExamIds([...current.examIds, examId]),
      }));
      void enqueueLearningSync({ type: "enroll", payload: { examId } }, userId);
    },
    [updateEnrollment, userId],
  );

  // 내 시험 삭제
  const removeExam = useCallback(
    (examId: string) => {
      updateEnrollment((current) => ({
        ...current,
        examIds: current.examIds.filter((id) => id !== examId),
      }));
      void enqueueLearningSync(
        { type: "unenroll", payload: { examId } },
        userId,
      );
    },
    [updateEnrollment, userId],
  );

  // 내 시험 등록 전환
  const toggleExam = useCallback(
    (examId: string) => {
      const enrolled = enrollmentRef.current.examIds.includes(examId);
      updateEnrollment((current) => ({
        ...current,
        examIds: current.examIds.includes(examId)
          ? current.examIds.filter((id) => id !== examId)
          : [...current.examIds, examId],
      }));
      void enqueueLearningSync(
        {
          type: enrolled ? "unenroll" : "enroll",
          payload: { examId },
        },
        userId,
      );
    },
    [updateEnrollment, userId],
  );

  // 첫 시험 선택 완료
  const completeOnboarding = useCallback(
    (examIds: string[]) => {
      const uniqueIds = uniqueExamIds(examIds);
      updateEnrollment(() => ({
        examIds: uniqueIds,
        onboardingCompleted: true,
      }));
      uniqueIds.forEach((examId) => {
        void enqueueLearningSync(
          { type: "enroll", payload: { examId } },
          userId,
        );
      });
    },
    [updateEnrollment, userId],
  );

  const value = useMemo(
    () => ({
      examIds: enrollment.examIds,
      onboardingCompleted: enrollment.onboardingCompleted,
      isLoading,
      addExam,
      removeExam,
      toggleExam,
      completeOnboarding,
    }),
    [
      addExam,
      completeOnboarding,
      enrollment.examIds,
      enrollment.onboardingCompleted,
      isLoading,
      removeExam,
      toggleExam,
    ],
  );

  return (
    <ExamEnrollmentContext.Provider value={value}>
      {children}
    </ExamEnrollmentContext.Provider>
  );
}

// 내 시험 등록 상태 사용
export function useExamEnrollmentContext(): ExamEnrollmentContextValue {
  const context = useContext(ExamEnrollmentContext);
  if (context == null)
    throw new Error("ExamEnrollmentProvider 내부에서 사용해야 합니다.");
  return context;
}
