import "@/global.css";

import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#302B2E",
    background: "#FAF7F3",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#F0EBE6",
    border: "#E4DDD7",
    cardBorder: "rgba(21, 24, 31, 0.06)",
    textSecondary: "#756B70",
    primary: "#51434F",
    primaryDeep: "#3C323B",
    primarySoft: "#EEE8EF",
    rose: "#9E5269",
    roseSoft: "#F7E9ED",
    lilac: "#74608E",
    lilacSoft: "#EEE9F5",
    slate: "#576E87",
    slateSoft: "#EAF0F5",
    onPrimary: "#FFFFFF",
    success: "#4C7566",
    successSoft: "#EAF2EE",
    danger: "#D33F58",
    dangerSoft: "#FDE8EC",
    reminderUrgent: "#D92D20",
    reminderUrgentSoft: "#FFF0EF",
    warning: "#C97A05",
    warningSoft: "#FDF0D8",
  },
  dark: {
    text: "#F5EFEF",
    background: "#211D21",
    backgroundElement: "#2B252B",
    backgroundSelected: "#393139",
    border: "#4D424C",
    cardBorder: "rgba(255, 255, 255, 0.07)",
    textSecondary: "#BAADB7",
    primary: "#D6C4D8",
    primaryDeep: "#C7AFCC",
    primarySoft: "#3B3041",
    rose: "#E8ACBD",
    roseSoft: "#442D37",
    lilac: "#C8B5E5",
    lilacSoft: "#382F49",
    slate: "#B0C7DF",
    slateSoft: "#2B3744",
    onPrimary: "#2B222C",
    success: "#9FC9B6",
    successSoft: "#283C33",
    danger: "#FF6E88",
    dangerSoft: "#3D1B25",
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

// 카드 강조색 순환 조합
export function accentByIndex(
  theme: ThemePalette,
  index: number,
): { accent: string; soft: string } {
  return [
    { accent: theme.lilac, soft: theme.lilacSoft },
    { accent: theme.rose, soft: theme.roseSoft },
    { accent: theme.slate, soft: theme.slateSoft },
  ][((index % 3) + 3) % 3];
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
