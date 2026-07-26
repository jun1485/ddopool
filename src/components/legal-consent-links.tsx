import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL } from "@/constants/legal";
import { Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { openLegalDocument } from "@/lib/external-links";

// 약관 동의 문구와 문서 링크 표시
export function LegalConsentLinks() {
  const theme = useTheme();
  const [message, setMessage] = useState<string | null>(null);

  // 법적 문서 링크 열기
  const handleDocumentPress = async (url: string) => {
    try {
      const opened = await openLegalDocument(url);
      setMessage(opened ? null : "문서 링크를 준비 중이에요.");
    } catch {
      setMessage("문서를 열지 못했어요. 다시 시도해 주세요.");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.copy}>
        <ThemedText type="small" themeColor="textSecondary">
          계속하면
        </ThemedText>
        <Pressable
          accessibilityRole="link"
          accessibilityLabel="이용약관 열기"
          onPress={() => void handleDocumentPress(TERMS_OF_SERVICE_URL)}
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
          onPress={() => void handleDocumentPress(PRIVACY_POLICY_URL)}
        >
          <ThemedText type="smallBold" style={{ color: theme.primary }}>
            개인정보처리방침
          </ThemedText>
        </Pressable>
        <ThemedText type="small" themeColor="textSecondary">
          에 동의합니다.
        </ThemedText>
      </View>
      {message != null && (
        <ThemedText type="small" style={{ color: theme.warning }}>
          {message}
        </ThemedText>
      )}
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
