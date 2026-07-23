/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import "@/global.css";

import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#171A24",
    background: "#F6F7FB",
    backgroundElement: "#FFFFFF",
    backgroundSelected: "#EEF0F7",
    border: "#E2E5EE",
    textSecondary: "#6F7585",
    primary: "#6657E8",
    primarySoft: "#ECE9FF",
    onPrimary: "#FFFFFF",
    success: "#158F68",
    successSoft: "#E2F7EF",
    danger: "#D6455D",
    dangerSoft: "#FDE9EE",
    warning: "#D67B00",
    warningSoft: "#FFF1D6",
  },
  dark: {
    text: "#F6F7FB",
    background: "#0E1118",
    backgroundElement: "#181C25",
    backgroundSelected: "#242A36",
    border: "#303746",
    textSecondary: "#A4AABC",
    primary: "#9388FF",
    primarySoft: "#292548",
    onPrimary: "#FFFFFF",
    success: "#55D6A7",
    successSoft: "#15382E",
    danger: "#FF718A",
    dangerSoft: "#421E29",
    warning: "#FFB84D",
    warningSoft: "#3D2E15",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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
};

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
