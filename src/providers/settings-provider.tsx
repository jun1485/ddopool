import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AppSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from "@/storage/settings-store";

interface SettingsContextValue {
  settings: AppSettings;
  isLoading: boolean;
  updateSettings: (patch: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

// 앱 설정 상태 제공
export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // 저장 설정 초기 로드
  useEffect(() => {
    let active = true;

    // 저장 설정 반영
    const hydrate = async () => {
      const storedSettings = await loadSettings();
      if (!active) return;
      setSettings(storedSettings);
      setIsLoading(false);
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, []);

  // 설정 항목 갱신
  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((current) => {
      const nextSettings = { ...current, ...patch };
      void saveSettings(nextSettings);
      return nextSettings;
    });
  }, []);

  // 설정 기본값 복원
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    void saveSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo(
    () => ({ settings, isLoading, updateSettings, resetSettings }),
    [isLoading, resetSettings, settings, updateSettings],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

// 앱 설정 상태 사용
export function useSettingsContext(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (context == null)
    throw new Error("SettingsProvider 내부에서 사용해야 합니다.");
  return context;
}
