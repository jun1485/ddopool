import {
  Platform,
  StyleSheet,
  Text,
  type TextProps,
  type TextStyle,
} from "react-native";

import { fontStyle } from "@/constants/fonts";
import { Fonts, ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ThemedTextProps = TextProps & {
  type?:
    | "default"
    | "title"
    | "small"
    | "smallBold"
    | "subtitle"
    | "link"
    | "linkPrimary"
    | "code";
  themeColor?: ThemeColor;
};

// 본문·제목 위계 표시
export function ThemedText({
  style,
  type = "default",
  themeColor,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const merged = StyleSheet.flatten<TextStyle>([
    { color: theme[themeColor ?? "text"] },
    type === "default" && styles.default,
    type === "title" && styles.title,
    type === "small" && styles.small,
    type === "smallBold" && styles.smallBold,
    type === "subtitle" && styles.subtitle,
    type === "link" && styles.link,
    type === "linkPrimary" && styles.linkPrimary,
    type === "code" && styles.code,
    style,
  ]);

  return (
    <Text
      style={[
        merged,
        // 글꼴을 직접 정하지 않은 글자는 Pretendard 굵기 파일 적용
        merged.fontFamily == null && fontStyle(merged.fontWeight),
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 30,
    fontWeight: 600,
    lineHeight: 38,
  },
  subtitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: 600,
  },
  link: {
    lineHeight: 30,
    fontSize: 13,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 13,
    color: "#3c87f7",
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 11,
  },
});
