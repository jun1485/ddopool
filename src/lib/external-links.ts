import { Linking } from "react-native";

import { SUPPORT_EMAIL } from "@/constants/legal";

// 고객 문의 메일 작성 화면 열기
export async function openSupportEmail(): Promise<boolean> {
  if (SUPPORT_EMAIL.length === 0) return false;
  await Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  return true;
}
