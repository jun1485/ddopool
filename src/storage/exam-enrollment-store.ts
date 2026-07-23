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
    const raw = await AsyncStorage.getItem(EXAM_ENROLLMENT_KEY);
    return raw == null ? null : (JSON.parse(raw) as ExamEnrollmentState);
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
