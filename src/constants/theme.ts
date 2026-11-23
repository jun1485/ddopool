import "@/global.css";

import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#1B2733",
    background: "#FFFFFF",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#F1F5F9",
    border: "#E6EDF3",
    cardBorder: "#E2EAF2",
    textSecondary: "#5B6B7B",
    primary: "#1E6FD9",
    primaryDeep: "#1659B5",
    primarySoft: "#E9F2FD",
    rose: "#E5484D",
    roseSoft: "#FDECEC",
    lilac: "#1E6FD9",
    lilacSoft: "#E9F2FD",
    slate: "#5B6B7B",
    slateSoft: "#F1F5F9",
    onPrimary: "#FFFFFF",
    onPrimaryMuted: "rgba(255, 255, 255, 0.78)",
    onPrimarySurface: "rgba(255, 255, 255, 0.16)",
    onPrimaryTrack: "rgba(255, 255, 255, 0.24)",
    onPrimaryLine: "rgba(255, 255, 255, 0.4)",
    success: "#1F8A5B",
    successSoft: "#E3F4EC",
    danger: "#E5484D",
    dangerSoft: "#FDECEC",
    reminderUrgent: "#D92D20",
    reminderUrgentSoft: "#FFF0EF",
    warning: "#B25E00",
    warningSoft: "#FFF3DC",
  },
  dark: {
    text: "#E8EEF4",
    background: "#0F161D",
    backgroundElement: "#17202A",
    backgroundSelected: "#202C38",
    border: "#2A3744",
    cardBorder: "rgba(255, 255, 255, 0.08)",
    textSecondary: "#9AA8B6",
    primary: "#5AA2F0",
    primaryDeep: "#3D8BE0",
    primarySoft: "#16304B",
    rose: "#FF7A80",
    roseSoft: "#3D1C20",
    lilac: "#5AA2F0",
    lilacSoft: "#16304B",
    slate: "#9AA8B6",
    slateSoft: "#202C38",
    onPrimary: "#0B1620",
    onPrimaryMuted: "rgba(11, 22, 32, 0.74)",
    onPrimarySurface: "rgba(11, 22, 32, 0.1)",
    onPrimaryTrack: "rgba(11, 22, 32, 0.16)",
    onPrimaryLine: "rgba(11, 22, 32, 0.3)",
    success: "#5FC79A",
    successSoft: "#173528",
    danger: "#FF7A80",
    dangerSoft: "#3D1C20",
    reminderUrgent: "#FF8A80",
    reminderUrgentSoft: "#431C18",
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

// 카드 강조색 조합
export function accentByIndex(
  theme: ThemePalette,
  _index: number,
): { accent: string; soft: string } {
  return { accent: theme.primary, soft: theme.primarySoft };
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
  small: 6,
  medium: 10,
  large: 16,
  pill: 999,
} as const;

export const Shadows = {
  card: Platform.select({
    ios: {
      shadowColor: "#171A24",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.025,
      shadowRadius: 20,
    },
    android: { elevation: 1 },
    default: {
      boxShadow: "0 1px 3px rgba(24, 32, 24, 0.035)",
    },
  }),
  // 히어로·강조 카드 부양 그림자
  floating: Platform.select({
    ios: {
      shadowColor: "#171A24",
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.06,
      shadowRadius: 32,
    },
    android: { elevation: 1 },
    default: {
      boxShadow: "0 4px 12px rgba(24, 32, 24, 0.06)",
    },
  }),
  // 인라인 요소 미세 그림자
  soft: Platform.select({
    ios: {
      shadowColor: "#171A24",
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.02,
      shadowRadius: 10,
    },
    android: { elevation: 1 },
    default: {
      boxShadow: "0 1px 2px rgba(24, 32, 24, 0.03)",
    },
  }),
};

// 컬러 배경 위 반투명 레이어 색
export const Alpha = {
  hairline: "rgba(127, 127, 127, 0.12)",
  scrim: "rgba(9, 11, 17, 0.55)",
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 0 }) ?? 0;

// 탭 화면 안전 영역, 아래는 탭바가 처리
export const TabScreenEdges = ["top", "left", "right"] as const;
export const MaxContentWidth = 800;
