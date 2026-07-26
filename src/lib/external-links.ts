import * as WebBrowser from "expo-web-browser";
import { Linking } from "react-native";

import { SUPPORT_EMAIL } from "@/constants/legal";

// 법적 문서 외부 브라우저 열기
export async function openLegalDocument(url: string): Promise<boolean> {
  if (url.length === 0) return false;
  await WebBrowser.openBrowserAsync(url);
  return true;
}

// 고객 문의 메일 작성 화면 열기
export async function openSupportEmail(): Promise<boolean> {
  if (SUPPORT_EMAIL.length === 0) return false;
  await Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  return true;
}
