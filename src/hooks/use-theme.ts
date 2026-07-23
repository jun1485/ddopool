/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSettings } from "@/hooks/use-settings";

// 앱 설정 기준 화면 테마 결정
export function useResolvedColorScheme(): "light" | "dark" {
  const systemScheme = useColorScheme();
  const { settings } = useSettings();

  if (settings.themePreference !== "system") return settings.themePreference;
  return systemScheme === "dark" ? "dark" : "light";
}

// 화면 테마 색상 제공
export function useTheme() {
  return Colors[useResolvedColorScheme()];
}
