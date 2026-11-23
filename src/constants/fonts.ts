import { useFonts } from "expo-font";
import type { TextStyle } from "react-native";

// 앱에 넣은 Pretendard 굵기별 글꼴 파일
const FONT_FILES = {
  "Pretendard-Regular": require("@/assets/fonts/Pretendard-Regular.otf"),
  "Pretendard-Medium": require("@/assets/fonts/Pretendard-Medium.otf"),
  "Pretendard-SemiBold": require("@/assets/fonts/Pretendard-SemiBold.otf"),
  "Pretendard-Bold": require("@/assets/fonts/Pretendard-Bold.otf"),
  "Pretendard-ExtraBold": require("@/assets/fonts/Pretendard-ExtraBold.otf"),
};

type FontFamily = keyof typeof FONT_FILES;

const FAMILY_BY_WEIGHT: Record<string, FontFamily> = {
  normal: "Pretendard-Regular",
  "100": "Pretendard-Regular",
  "200": "Pretendard-Regular",
  "300": "Pretendard-Regular",
  "400": "Pretendard-Regular",
  "500": "Pretendard-Medium",
  "600": "Pretendard-SemiBold",
  bold: "Pretendard-Bold",
  "700": "Pretendard-Bold",
  "800": "Pretendard-ExtraBold",
  "900": "Pretendard-ExtraBold",
};

// Pretendard 글꼴 불러오기, 실패해도 기본 글꼴로 진행
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts(FONT_FILES);
  return loaded || error != null;
}

// 굵기에 맞는 Pretendard 파일 지정, 굵기 덧칠 방지
export function fontStyle(weight?: TextStyle["fontWeight"]): TextStyle {
  return {
    fontFamily: FAMILY_BY_WEIGHT[String(weight ?? "400")] ?? "Pretendard-Regular",
    fontWeight: "normal",
  };
}
