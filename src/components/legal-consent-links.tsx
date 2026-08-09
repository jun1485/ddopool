import { router } from "expo-router";
import { StyleSheet, View } from "react-native";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

// 약관 동의 문구와 문서 링크 표시
export function LegalConsentLinks() {
  const theme = useTheme();

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <ThemedText type="small" themeColor="textSecondary">
          계속하면
        </ThemedText>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="이용약관 열기"
          onPress={() => router.push("/terms")}
        >
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            이용약관
          </ThemedText>
        </Pressable>
        <ThemedText type="small" themeColor="textSecondary">
          및
        </ThemedText>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="개인정보처리방침 열기"
          onPress={() => router.push("/privacy")}
        >
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            개인정보처리방침
          </ThemedText>
        </Pressable>
        <ThemedText type="small" themeColor="textSecondary">
          에 동의합니다.
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    gap: Spacing.one,
  },
  copy: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
  },
});
