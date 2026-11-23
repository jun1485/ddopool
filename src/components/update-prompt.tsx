import { SymbolView } from "expo-symbols";
import * as Updates from "expo-updates";
import { useState } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Alpha, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useRefresh } from "@/providers/refresh-provider";

// 받아 둔 새 버전이 있으면 지금 업데이트할지 묻는 안내 창
export function UpdatePrompt() {
  const { isUpdatePending } = Updates.useUpdates();
  const { refreshKey } = useRefresh();
  const theme = useTheme();
  // 안내를 닫은 때의 새로고침 번호, 닫지 않았으면 null
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const [applying, setApplying] = useState(false);
  // 닫은 뒤에도 당겨서 새로고침하면 다시 띄움
  const visible =
    Updates.isEnabled && isUpdatePending && dismissedAt !== refreshKey;
  if (!visible) return null;

  const dismiss = () => setDismissedAt(refreshKey);
  // 받아 둔 새 코드로 앱 다시 시작
  const apply = () => {
    setApplying(true);
    Updates.reloadAsync().catch((error: Error) => {
      console.warn(`업데이트 적용 실패: ${error.message}`);
      setApplying(false);
      dismiss();
    });
  };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={dismiss}>
      <View style={[styles.backdrop, { backgroundColor: Alpha.scrim }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={dismiss}
          disabled={applying}
          accessible={false}
        />
        <View
          style={[styles.card, { backgroundColor: theme.backgroundElement }]}
        >
          <SymbolView
            tintColor={theme.primary}
            name={{
              ios: "sparkles",
              android: "auto_awesome",
              web: "auto_awesome",
            }}
            size={28}
          />
          <ThemedText style={styles.title}>새 버전이 준비됐어요</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            지금 업데이트하면 또풀이 잠깐 다시 시작돼요. 나중에 하면 다음에
            열 때 바뀌어요.
          </ThemedText>
          <Pressable
            accessibilityRole="button"
            disabled={applying}
            onPress={apply}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
              {applying ? "업데이트하는 중" : "지금 업데이트"}
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            disabled={applying}
            onPress={dismiss}
            style={({ pressed }) => [styles.button, pressed && styles.pressed]}
          >
            <ThemedText type="smallBold" themeColor="textSecondary">
              나중에
            </ThemedText>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.four,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    gap: Spacing.twoHalf,
    padding: Spacing.four,
    borderRadius: Radius.large,
  },
  title: {
    fontSize: 18,
    lineHeight: 26,
    fontWeight: 700,
  },
  button: {
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  pressed: {
    opacity: 0.8,
  },
});
