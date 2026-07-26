/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import "@/global.css";

import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#15181F",
    background: "#F4F5F9",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#EBEEF6",
    border: "#E4E7F0",
    cardBorder: "rgba(21, 24, 31, 0.06)",
    textSecondary: "#6B7280",
    primary: "#5B4BE0",
    primaryDeep: "#7C5CF0",
    primarySoft: "#EDEAFF",
    onPrimary: "#FFFFFF",
    success: "#12866B",
    successSoft: "#DFF5EE",
    danger: "#D33F58",
    dangerSoft: "#FDE8EC",
    warning: "#C97A05",
    warningSoft: "#FDF0D8",
  },
  dark: {
    text: "#F2F4F9",
    background: "#0A0D14",
    backgroundElement: "#141922",
    backgroundSelected: "#1D2431",
    border: "#242C3A",
    cardBorder: "rgba(255, 255, 255, 0.07)",
    textSecondary: "#949CAF",
    primary: "#8C82F5",
    primaryDeep: "#6F5AE8",
    primarySoft: "#221F3C",
    onPrimary: "#FFFFFF",
    success: "#4FD3A4",
    successSoft: "#123328",
    danger: "#FF6E88",
    dangerSoft: "#3D1B25",
    warning: "#FFB547",
    warningSoft: "#382A12",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;
export type ThemePalette = Record<ThemeColor, string>;

// 히어로 카드 그라데이션 색 조합
export function heroGradient(theme: ThemePalette): [string, string] {
  return [theme.primaryDeep, theme.primary];
}

// 카드 강조색 순환 조합
export function accentByIndex(
  theme: ThemePalette,
  index: number,
): { accent: string; soft: string } {
  const pairs = [
    { accent: theme.primary, soft: theme.primarySoft },
    { accent: theme.success, soft: theme.successSoft },
    { accent: theme.warning, soft: theme.warningSoft },
  ];
  return pairs[Math.abs(index) % pairs.length];
}

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  twoHalf: 12,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = {
  small: 10,
  medium: 16,
  large: 24,
  pill: 999,
} as const;

export const Shadows = {
  card: Platform.select({
    ios: {
      shadowColor: "#171A24",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 20,
    },
    android: { elevation: 2 },
    default: {
      boxShadow: "0 8px 28px rgba(23, 26, 36, 0.08)",
    },
  }),
  // 히어로·강조 카드 부양 그림자
  floating: Platform.select({
    ios: {
      shadowColor: "#171A24",
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.16,
      shadowRadius: 32,
    },
    android: { elevation: 8 },
    default: {
      boxShadow: "0 18px 40px rgba(23, 26, 36, 0.18)",
    },
  }),
  // 인라인 요소 미세 그림자
  soft: Platform.select({
    ios: {
      shadowColor: "#171A24",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.05,
      shadowRadius: 10,
    },
    android: { elevation: 1 },
    default: {
      boxShadow: "0 3px 12px rgba(23, 26, 36, 0.05)",
    },
  }),
};

// 컬러 배경 위 반투명 레이어 색
export const Alpha = {
  onPrimaryStrong: "rgba(255, 255, 255, 0.92)",
  onPrimaryMuted: "rgba(255, 255, 255, 0.76)",
  onPrimarySurface: "rgba(255, 255, 255, 0.16)",
  onPrimaryTrack: "rgba(255, 255, 255, 0.22)",
  onPrimaryDivider: "rgba(255, 255, 255, 0.18)",
  hairline: "rgba(127, 127, 127, 0.12)",
  scrim: "rgba(9, 11, 17, 0.55)",
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
