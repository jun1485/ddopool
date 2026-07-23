import AsyncStorage from "@react-native-async-storage/async-storage";

const SETTINGS_KEY = "exam-loop:settings";

// 화면 테마 설정
export type ThemePreference = "system" | "light" | "dark";

// 앱 설정
export interface AppSettings {
  sessionSize: number;
  dailyGoal: number;
  mockDurationMinutes: number;
  hapticsEnabled: boolean;
  shuffleQuestionsEnabled: boolean;
  shuffleChoicesEnabled: boolean;
  explanationEnabled: boolean;
  themePreference: ThemePreference;
}

// 세션 문항 수 선택지
export const SESSION_SIZE_OPTIONS = [5, 10, 20] as const;

// 모의고사 제한 시간 선택지
export const MOCK_DURATION_OPTIONS = [5, 10, 20, 30] as const;

// 일일 목표 선택지
export const DAILY_GOAL_OPTIONS = [5, 10, 20, 30] as const;

// 화면 테마 선택지
export const THEME_OPTIONS: { value: ThemePreference; label: string }[] = [
  { value: "system", label: "시스템" },
  { value: "light", label: "라이트" },
  { value: "dark", label: "다크" },
];

export const DEFAULT_SETTINGS: AppSettings = {
  sessionSize: 10,
  dailyGoal: 10,
  mockDurationMinutes: 10,
  hapticsEnabled: true,
  shuffleQuestionsEnabled: true,
  shuffleChoicesEnabled: true,
  explanationEnabled: true,
  themePreference: "system",
};

// 저장된 앱 설정 로드
export async function loadSettings(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem(SETTINGS_KEY);
    return raw != null
      ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) }
      : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

// 앱 설정 저장
export async function saveSettings(settings: AppSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
