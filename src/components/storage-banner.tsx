import { useSyncExternalStore } from "react";
import { Pressable, Text, View, StyleSheet } from "react-native";
import {
  hasStorageFailure,
  retryStorageWrite,
  subscribeStorageFailure,
} from "@/storage/retry-write";

// 저장 실패 안내와 재시도 제공
export function StorageBanner() {
  const failed = useSyncExternalStore(
    subscribeStorageFailure,
    hasStorageFailure,
    () => false,
  );
  if (!failed) return null;
  return (
    <View accessibilityRole="alert" style={styles.banner}>
      <Text style={styles.text}>
        기기에 저장하지 못했어요. 저장 공간을 확보하고 다시 시도해 주세요. 저장
        전에는 앱을 종료하지 마세요.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={retryStorageWrite}
        style={styles.button}
      >
        <Text style={styles.text}>저장 다시 시도</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  banner: { padding: 16, gap: 8, backgroundColor: "#FDF0D8" },
  text: { color: "#302B2E", fontSize: 14, lineHeight: 20 },
  button: { minHeight: 44, justifyContent: "center" },
});
