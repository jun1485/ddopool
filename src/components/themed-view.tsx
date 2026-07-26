import { View, type ViewProps } from "react-native";

import { ThemeColor } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
  type?: ThemeColor;
};

export function ThemedView({
  style,
  lightColor,
  darkColor,
  type,
  ...otherProps
}: ThemedViewProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        { backgroundColor: theme[type ?? "background"] },
        // 카드 면이 배경과 분리되도록 기본 경계선 적용
        type === "backgroundElement" && {
          borderWidth: 1,
          borderColor: theme.cardBorder,
        },
        style,
      ]}
      {...otherProps}
    />
  );
}
