import { targetSchema } from "@/storage/data-schemas";
import { readValidated } from "@/storage/read-validated";
import AsyncStorage from "@react-native-async-storage/async-storage";

import type { StudyTarget } from "@/learning/exam-pace";

const STUDY_TARGET_KEY = "exam-loop:study-target:v1";
const studyTargetListeners = new Set<(target: StudyTarget | null) => void>();
let studyTargetWriteQueue: Promise<void> = Promise.resolve();

// 시험 학습 목표 변경 전파
function notifyStudyTarget(target: StudyTarget | null) {
  studyTargetListeners.forEach((listener) => listener(target));
}

// 시험 학습 목표 변경 구독
export function subscribeStudyTarget(
  listener: (target: StudyTarget | null) => void,
): () => void {
  studyTargetListeners.add(listener);
  return () => {
    studyTargetListeners.delete(listener);
  };
}

// 시험 학습 목표 로드
export async function loadStudyTarget(): Promise<StudyTarget | null> {
  try {
    await studyTargetWriteQueue.catch(() => undefined);
    return readValidated(STUDY_TARGET_KEY, targetSchema, null);
  } catch {
    return null;
  }
}

// 시험 학습 목표 순차 저장
export function saveStudyTarget(target: StudyTarget): Promise<void> {
  notifyStudyTarget(target);
  studyTargetWriteQueue = studyTargetWriteQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(STUDY_TARGET_KEY, JSON.stringify(target)));
  return studyTargetWriteQueue;
}

// 시험 학습 목표 전체 삭제
export function clearStudyTarget(): Promise<void> {
  notifyStudyTarget(null);
  studyTargetWriteQueue = studyTargetWriteQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.removeItem(STUDY_TARGET_KEY));
  return studyTargetWriteQueue;
}

// 저장 대기 작업 종료 대기
export async function settleStudyTargetStore(): Promise<void> {
  await studyTargetWriteQueue.catch(() => undefined);
}
