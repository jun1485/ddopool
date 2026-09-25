import AsyncStorage from "@react-native-async-storage/async-storage";

export const OWNER_KEY = "exam-loop:account-owner:v1";
const MIGRATED_OWNER_KEY = "exam-loop:learning-sync-migrated:v1";

// 현재 기기 학습 기록의 소유 계정 판정
export async function resolveVaultOwner(): Promise<string> {
  return (
    (await AsyncStorage.getItem(OWNER_KEY)) ??
    (await AsyncStorage.getItem(MIGRATED_OWNER_KEY)) ??
    "guest"
  );
}
