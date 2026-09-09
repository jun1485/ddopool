import { settingsSchema } from "@/storage/data-schemas";
import { recoverBackupRestore } from "@/storage/backup-recovery";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { retryableWrite } from "./retry-write";

const SETTINGS_KEY = "exam-loop:settings";
let pendingSettingsWrite: Promise<void> = Promise.resolve();

// 화면 테마 설정
export type ThemePreference = "system" | "light" | "dark";

// 앱 설정
export interface AppSettings {
  sessionSize: number;
  dailyGoal: number;
  weeklyGoal: number;
  mockDurationMinutes: number;
  hapticsEnabled: boolean;
  studyReminderEnabled: boolean;
  studyReminderHour: number;
  reminderDailyLimit: number;
  reminderQuietHour: number;
  reminderPausedDate: string;
  personalizedQuestionsEnabled: boolean;
  shuffleQuestionsEnabled: boolean;
  shuffleChoicesEnabled: boolean;
  explanationEnabled: boolean;
  confidenceRatingEnabled: boolean;
  keyboardShortcutsEnabled: boolean;
  themePreference: ThemePreference;
}

// 세션 문항 수 선택지
export const SESSION_SIZE_OPTIONS = [5, 10, 20] as const;

// 모의고사 제한 시간 선택지
export const MOCK_DURATION_OPTIONS = [5, 10, 20, 30] as const;

// 일일 목표 선택지
export const DAILY_GOAL_OPTIONS = [5, 10, 20, 30] as const;

// 주간 목표 선택지
export const WEEKLY_GOAL_OPTIONS = [35, 70, 140, 210] as const;

// 화면 테마 선택지
export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "시스템" },
  { value: "light", label: "라이트" },
  { value: "dark", label: "다크" },
];

export const DEFAULT_SETTINGS: AppSettings = {
  sessionSize: 10,
  dailyGoal: 10,
  weeklyGoal: 70,
  mockDurationMinutes: 10,
  hapticsEnabled: true,
  studyReminderEnabled: true,
  studyReminderHour: 12,
  reminderDailyLimit: 4,
  reminderQuietHour: 24,
  reminderPausedDate: "",
  personalizedQuestionsEnabled: true,
  shuffleQuestionsEnabled: true,
  shuffleChoicesEnabled: true,
  explanationEnabled: true,
  confidenceRatingEnabled: true,
  keyboardShortcutsEnabled: true,
  themePreference: "light",
};

// 저장된 앱 설정 로드
export async function loadSettings(): Promise<AppSettings> {
  await pendingSettingsWrite;
  await recoverBackupRestore();
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  return raw != null
    ? {
        ...DEFAULT_SETTINGS,
        ...settingsSchema.partial().parse(JSON.parse(raw)),
      }
    : DEFAULT_SETTINGS;
}

// 앱 설정 저장
export async function saveSettings(settings: AppSettings): Promise<void> {
  const value = JSON.stringify(settings);
  pendingSettingsWrite = retryableWrite(() =>
    AsyncStorage.setItem(SETTINGS_KEY, value),
  );
  await pendingSettingsWrite;
}
