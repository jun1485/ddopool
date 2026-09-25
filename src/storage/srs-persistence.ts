import type * as NativePersistence from "@/storage/srs-persistence.native";
import { srsSchema } from "@/storage/data-schemas";
import { readValidated } from "@/storage/read-validated";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SRS_CARDS_KEY = "exam-loop:srs-cards";

// SRS 카드 전체 조회
export const readSrsCardMap: typeof NativePersistence.readSrsCardMap = () =>
  readValidated(SRS_CARDS_KEY, srsSchema, {});

// SRS 카드 맵 함수형 갱신 후 전체 저장
export const updateSrsCardMap: typeof NativePersistence.updateSrsCardMap =
  async (createNext) => {
    const cards = createNext(await readSrsCardMap());
    await AsyncStorage.setItem(SRS_CARDS_KEY, JSON.stringify(cards));
    return cards;
  };

// questionId SRS 카드 한 건 갱신
export const updateSrsCardRow: typeof NativePersistence.updateSrsCardRow =
  async (questionId, createNext) => {
    const cards = await updateSrsCardMap((current) => ({
      ...current,
      [questionId]: createNext(current[questionId]),
    }));
    return cards[questionId];
  };

// SRS 카드 전체 삭제
export const clearSrsCardMap: typeof NativePersistence.clearSrsCardMap = () =>
  AsyncStorage.removeItem(SRS_CARDS_KEY);
