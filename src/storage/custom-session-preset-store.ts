import AsyncStorage from "@react-native-async-storage/async-storage";

import type { CustomSessionStrategy } from "@/learning/custom-session";
import type { QuizMode } from "@/types/exam";

const CUSTOM_SESSION_PRESETS_KEY = "exam-loop:custom-session-presets:v1";
let customSessionPresetWriteQueue: Promise<void> = Promise.resolve();

// 시험별 저장 학습 루틴
export interface CustomSessionPreset {
  examId: string;
  selectedSubjects: string[];
  questionCount: number;
  mode: Extract<QuizMode, "learn" | "mock">;
  strategy: CustomSessionStrategy;
  updatedAt: number;
}

export type SaveCustomSessionPresetInput = Omit<
  CustomSessionPreset,
  "updatedAt"
>;
export type CustomSessionPresetMap = Record<string, CustomSessionPreset>;

const customSessionPresetListeners = new Set<
  (presets: CustomSessionPresetMap) => void
>();

// 저장 학습 루틴 원본 로드
async function readCustomSessionPresets(): Promise<CustomSessionPresetMap> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_SESSION_PRESETS_KEY);
    return raw == null ? {} : (JSON.parse(raw) as CustomSessionPresetMap);
  } catch {
    return {};
  }
}

// 저장 학습 루틴 변경 전파
function notifyCustomSessionPresets(presets: CustomSessionPresetMap) {
  customSessionPresetListeners.forEach((listener) => listener(presets));
}

// 저장 학습 루틴 변경 구독
export function subscribeCustomSessionPresets(
  listener: (presets: CustomSessionPresetMap) => void,
): () => void {
  customSessionPresetListeners.add(listener);
  return () => {
    customSessionPresetListeners.delete(listener);
  };
}

// 시험별 저장 학습 루틴 전체 로드
export async function loadCustomSessionPresets(): Promise<CustomSessionPresetMap> {
  await customSessionPresetWriteQueue.catch(() => undefined);
  return readCustomSessionPresets();
}

// 시험별 맞춤 학습 루틴 저장
export function saveCustomSessionPreset(
  input: SaveCustomSessionPresetInput,
): Promise<void> {
  customSessionPresetWriteQueue = customSessionPresetWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const presets = await readCustomSessionPresets();
      const nextPresets = {
        ...presets,
        [input.examId]: { ...input, updatedAt: Date.now() },
      };
      await AsyncStorage.setItem(
        CUSTOM_SESSION_PRESETS_KEY,
        JSON.stringify(nextPresets),
      );
      notifyCustomSessionPresets(nextPresets);
    });
  return customSessionPresetWriteQueue;
}

// 저장 학습 루틴 전체 제거
export function clearCustomSessionPresets(): Promise<void> {
  customSessionPresetWriteQueue = customSessionPresetWriteQueue
    .catch(() => undefined)
    .then(async () => {
      await AsyncStorage.removeItem(CUSTOM_SESSION_PRESETS_KEY);
      notifyCustomSessionPresets({});
    });
  return customSessionPresetWriteQueue;
}
