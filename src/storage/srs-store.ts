import {
  clearSrsCardMap,
  readSrsCardMap,
  updateSrsCardMap,
  updateSrsCardRow,
} from "@/storage/srs-persistence";

import { SrsCard } from "@/types/exam";

let srsWriteQueue: Promise<void> = Promise.resolve();

// questionId 기준 SRS 카드 맵
export type SrsCardMap = Record<string, SrsCard>;

// 저장된 SRS 카드 전체 로드
export async function loadSrsCards(): Promise<SrsCardMap> {
  try {
    await srsWriteQueue.catch(() => undefined);
    return await readSrsCardMap();
  } catch {
    return {};
  }
}

// SRS 카드 최신 상태 함수형 갱신
export function updateSrsCards(
  createNext: (current: SrsCardMap) => SrsCardMap,
): Promise<SrsCardMap> {
  const updatePromise = srsWriteQueue
    .catch(() => undefined)
    .then(() => updateSrsCardMap(createNext));
  srsWriteQueue = updatePromise.then(() => undefined);
  return updatePromise;
}

// questionId SRS 카드 함수형 갱신
export function updateSrsCard(
  questionId: string,
  createNext: (current: SrsCard | undefined) => SrsCard,
): Promise<SrsCard> {
  const updatePromise = srsWriteQueue
    .catch(() => undefined)
    .then(() => updateSrsCardRow(questionId, createNext));
  srsWriteQueue = updatePromise.then(() => undefined);
  return updatePromise;
}

// SRS 카드 전체 삭제
export function clearSrsCards(): Promise<void> {
  srsWriteQueue = srsWriteQueue.catch(() => undefined).then(clearSrsCardMap);
  return srsWriteQueue;
}

// 저장 대기 작업 종료 대기
export async function settleSrsStore(): Promise<void> {
  await srsWriteQueue.catch(() => undefined);
}
