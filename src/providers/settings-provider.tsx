import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";

import {
  AppSettings,
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
} from "@/storage/settings-store";

import { Pressable, Text, View, StyleSheet } from "react-native";
import * as SplashScreen from "expo-splash-screen";

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

  const currentSettings = useRef(DEFAULT_SETTINGS);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);

  // 저장 설정 초기 로드
  useEffect(() => {
    let active = true;

    // 저장 설정 반영
    const hydrate = async () => {
      try {
        const storedSettings = await loadSettings();
        if (!active) return;
        currentSettings.current = storedSettings;
        setSettings(storedSettings);
        setLoadError(false);
        setIsLoading(false);
      } catch {
        if (active) {
          setLoadError(true);
          void SplashScreen.hideAsync().catch(() => undefined);
        }
      }
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, [reload]);

  // 설정 항목 갱신
  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    const nextSettings = { ...currentSettings.current, ...patch };
    currentSettings.current = nextSettings;
    setSettings(nextSettings);
    void saveSettings(nextSettings);
  }, []);

  // 설정 기본값 복원
  const resetSettings = useCallback(() => {
    currentSettings.current = DEFAULT_SETTINGS;
    setSettings(DEFAULT_SETTINGS);
    void saveSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo(
    () => ({ settings, isLoading, updateSettings, resetSettings }),
    [isLoading, resetSettings, settings, updateSettings],
  );

  return (
    <SettingsContext.Provider value={value}>
      {loadError ? (
        <View accessibilityRole="alert" style={styles.error}>
          <Text>
            저장된 설정을 읽지 못했어요. 기존 데이터는 삭제하지 않았어요.
          </Text>
          <Pressable
            style={styles.retry}
            accessibilityRole="button"
            onPress={() => setReload((value) => value + 1)}
          >
            <Text style={styles.retryText}>설정 다시 불러오기</Text>
          </Pressable>
        </View>
      ) : isLoading ? (
        <View style={styles.error}>
          <Text>설정을 불러오는 중이에요</Text>
        </View>
      ) : (
        children
      )}
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

const styles = StyleSheet.create({
  error: {
    flex: 1,
    padding: 24,
    gap: 16,
    justifyContent: "center",
    backgroundColor: "#FAF7F3",
  },
  retry: {
    minHeight: 48,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#51434F",
    paddingHorizontal: 16,
  },
  retryText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
});
