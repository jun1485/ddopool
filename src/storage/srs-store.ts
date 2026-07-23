import AsyncStorage from "@react-native-async-storage/async-storage";

import { SrsCard } from "@/types/exam";

const SRS_CARDS_KEY = "exam-loop:srs-cards";

// questionId 기준 SRS 카드 맵
export type SrsCardMap = Record<string, SrsCard>;

// 저장된 SRS 카드 전체 로드
export async function loadSrsCards(): Promise<SrsCardMap> {
  try {
    const raw = await AsyncStorage.getItem(SRS_CARDS_KEY);
    return raw != null ? (JSON.parse(raw) as SrsCardMap) : {};
  } catch {
    return {};
  }
}

// SRS 카드 전체 저장
export async function saveSrsCards(cards: SrsCardMap): Promise<void> {
  await AsyncStorage.setItem(SRS_CARDS_KEY, JSON.stringify(cards));
}

// SRS 카드 전체 삭제
export async function clearSrsCards(): Promise<void> {
  await AsyncStorage.removeItem(SRS_CARDS_KEY);
}
