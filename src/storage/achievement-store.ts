import AsyncStorage from "@react-native-async-storage/async-storage";

import type { AchievementId } from "@/learning/achievements";

const ACHIEVEMENTS_KEY = "exam-loop:achievements:v1";
let achievementWriteQueue: Promise<AchievementId[]> = Promise.resolve([]);

// 해제 업적 식별자 목록 로드
export async function loadUnlockedAchievements(): Promise<AchievementId[]> {
  try {
    const raw = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
    return raw == null ? [] : (JSON.parse(raw) as AchievementId[]);
  } catch {
    return [];
  }
}

// 신규 업적 해제 상태 누적
export function unlockAchievements(
  achievementIds: AchievementId[],
): Promise<AchievementId[]> {
  achievementWriteQueue = achievementWriteQueue
    .catch(() => [])
    .then(async () => {
      const currentIds = await loadUnlockedAchievements();
      const nextIds = [...new Set([...currentIds, ...achievementIds])];
      await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(nextIds));
      return nextIds;
    });
  return achievementWriteQueue;
}

// 해제 업적 기록 초기화
export function clearAchievements(): Promise<void> {
  achievementWriteQueue = achievementWriteQueue
    .catch(() => [])
    .then(async () => {
      await AsyncStorage.removeItem(ACHIEVEMENTS_KEY);
      return [];
    });
  return achievementWriteQueue.then(() => undefined);
}
