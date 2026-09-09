import { srsSchema } from "@/storage/data-schemas";
import { readValidated } from "@/storage/read-validated";
import AsyncStorage from "@react-native-async-storage/async-storage";

import { SrsCard } from "@/types/exam";

const SRS_CARDS_KEY = "exam-loop:srs-cards";
let srsWriteQueue: Promise<void> = Promise.resolve();

// questionId 기준 SRS 카드 맵
export type SrsCardMap = Record<string, SrsCard>;

// 저장된 SRS 카드 원본 로드
async function readSrsCards(): Promise<SrsCardMap> {
  return readValidated(SRS_CARDS_KEY, srsSchema, {});
}

// 저장된 SRS 카드 전체 로드
export async function loadSrsCards(): Promise<SrsCardMap> {
  try {
    await srsWriteQueue.catch(() => undefined);
    return await readSrsCards();
  } catch {
    return {};
  }
}

// SRS 카드 전체 저장
export function saveSrsCards(cards: SrsCardMap): Promise<void> {
  srsWriteQueue = srsWriteQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.setItem(SRS_CARDS_KEY, JSON.stringify(cards)));
  return srsWriteQueue;
}

// SRS 카드 최신 상태 함수형 갱신
export function updateSrsCards(
  createNext: (current: SrsCardMap) => SrsCardMap,
): Promise<SrsCardMap> {
  const updatePromise = srsWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const cards = createNext(await readSrsCards());
      await AsyncStorage.setItem(SRS_CARDS_KEY, JSON.stringify(cards));
      return cards;
    });
  srsWriteQueue = updatePromise.then(() => undefined);
  return updatePromise;
}

// questionId SRS 카드 함수형 갱신
export function updateSrsCard(
  questionId: string,
  createNext: (current: SrsCard | undefined) => SrsCard,
): Promise<SrsCard> {
  return updateSrsCards((current) => ({
    ...current,
    [questionId]: createNext(current[questionId]),
  })).then((cards) => cards[questionId]);
}

// SRS 카드 전체 삭제
export function clearSrsCards(): Promise<void> {
  srsWriteQueue = srsWriteQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.removeItem(SRS_CARDS_KEY));
  return srsWriteQueue;
}

// 저장 대기 작업 종료 대기
export async function settleSrsStore(): Promise<void> {
  await srsWriteQueue.catch(() => undefined);
}
