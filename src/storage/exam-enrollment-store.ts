import { enrollmentSchema } from "@/storage/data-schemas";
import { readValidated } from "@/storage/read-validated";
import AsyncStorage from "@react-native-async-storage/async-storage";

const EXAM_ENROLLMENT_KEY = "exam-loop:exam-enrollment:v1";
let enrollmentWriteQueue: Promise<void> = Promise.resolve();
const enrollmentListeners = new Set<(state: ExamEnrollmentState) => void>();

// 내 시험 등록 상태
export interface ExamEnrollmentState {
  examIds: string[];
  onboardingCompleted: boolean;
}

// 내 시험 등록 상태 변경 구독
export function subscribeExamEnrollment(
  listener: (state: ExamEnrollmentState) => void,
): () => void {
  enrollmentListeners.add(listener);
  return () => {
    enrollmentListeners.delete(listener);
  };
}

// 내 시험 등록 상태 로드
export async function loadExamEnrollment(): Promise<ExamEnrollmentState | null> {
  try {
    await enrollmentWriteQueue.catch(() => undefined);
    return readValidated(
      EXAM_ENROLLMENT_KEY,
      enrollmentSchema.nullable(),
      null,
    );
  } catch {
    return null;
  }
}

// 내 시험 등록 상태 순차 저장
export function saveExamEnrollment(state: ExamEnrollmentState): Promise<void> {
  enrollmentListeners.forEach((listener) => listener(state));
  enrollmentWriteQueue = enrollmentWriteQueue
    .catch(() => undefined)
    .then(() =>
      AsyncStorage.setItem(EXAM_ENROLLMENT_KEY, JSON.stringify(state)),
    );
  return enrollmentWriteQueue;
}

// 내 시험 등록 상태 전체 삭제
export function clearExamEnrollment(): Promise<void> {
  const clearedState: ExamEnrollmentState = {
    examIds: [],
    onboardingCompleted: false,
  };
  enrollmentListeners.forEach((listener) => listener(clearedState));
  enrollmentWriteQueue = enrollmentWriteQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.removeItem(EXAM_ENROLLMENT_KEY));
  return enrollmentWriteQueue;
}

// 저장 대기 작업 종료 대기
export async function settleExamEnrollmentStore(): Promise<void> {
  await enrollmentWriteQueue.catch(() => undefined);
}
