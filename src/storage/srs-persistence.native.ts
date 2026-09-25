import { srsSchema } from "@/storage/data-schemas";
import {
  type LearningRows,
  type LegacyImport,
  withLearningRows,
} from "@/storage/learning-rows";
import { readValidated } from "@/storage/read-validated";

import { SrsCard } from "@/types/exam";

const SRS_CARDS_KEY = "exam-loop:srs-cards";
const COLLECTION = "srs-cards";
const cardSchema = srsSchema.valueType;

const legacyImport: LegacyImport = {
  collection: COLLECTION,
  legacyKey: SRS_CARDS_KEY,
  decode: async () =>
    Object.entries(await readValidated(SRS_CARDS_KEY, srsSchema, {})).map(
      ([id, card]) => [id, JSON.stringify(card)],
    ),
};

// 행 값 SRS 카드 검증 변환
function parseCard(value: string | null): SrsCard | undefined {
  if (value == null) return undefined;
  try {
    const parsed = cardSchema.safeParse(JSON.parse(value));
    return parsed.success ? parsed.data : undefined;
  } catch {
    return undefined;
  }
}

// 유효한 SRS 카드 행 전체 로드
async function readCardMap(
  rows: LearningRows,
): Promise<Record<string, SrsCard>> {
  const cards: Record<string, SrsCard> = {};
  for (const [id, value] of await rows.entries(COLLECTION)) {
    const card = parseCard(value);
    if (card != null) cards[id] = card;
  }
  return cards;
}

// SRS 카드 전체 조회
export function readSrsCardMap(): Promise<Record<string, SrsCard>> {
  return withLearningRows([legacyImport], readCardMap);
}

// questionId SRS 카드 한 건 갱신
export function updateSrsCardRow(
  questionId: string,
  createNext: (current: SrsCard | undefined) => SrsCard,
): Promise<SrsCard> {
  return withLearningRows([legacyImport], async (rows) => {
    const next = createNext(parseCard(await rows.get(COLLECTION, questionId)));
    await rows.put(COLLECTION, [[questionId, JSON.stringify(next)]]);
    return next;
  });
}

// SRS 카드 맵 함수형 갱신 후 변경 행만 반영
export function updateSrsCardMap(
  createNext: (current: Record<string, SrsCard>) => Record<string, SrsCard>,
): Promise<Record<string, SrsCard>> {
  return withLearningRows([legacyImport], async (rows) => {
    const current = await readCardMap(rows);
    const next = createNext(current);
    const changed = Object.entries(next).flatMap(
      ([id, card]): [string, string][] => {
        const value = JSON.stringify(card);
        return JSON.stringify(current[id]) === value ? [] : [[id, value]];
      },
    );
    await rows.put(COLLECTION, changed);
    await rows.remove(
      COLLECTION,
      Object.keys(current).filter((id) => !(id in next)),
    );
    return next;
  });
}

// SRS 카드 전체 삭제
export async function clearSrsCardMap(): Promise<void> {
  await withLearningRows([legacyImport], (rows) => rows.clear(COLLECTION));
}
