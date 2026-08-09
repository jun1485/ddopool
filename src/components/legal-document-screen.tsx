import { SymbolView } from "expo-symbols";
import { Platform, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { LegalDocumentView } from "@/components/legal-document-view";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { PageHead } from "@/components/page-head";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import type { LegalDocument } from "@/data/legal-documents";
import { useTheme } from "@/hooks/use-theme";
import { goBack } from "@/lib/navigation";

// 법률 문서 화면 공통 레이아웃
export function LegalDocumentScreen({ document }: { document: LegalDocument }) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <PageHead title={document.title} description={document.description} />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이전 화면"
            onPress={() => goBack()}
            hitSlop={Spacing.two}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: theme.backgroundElement },
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              tintColor={theme.text}
              name={{
                ios: "chevron.left",
                android: "arrow_back",
                web: "arrow_back",
              }}
              size={22}
            />
          </Pressable>
          <View style={styles.topTitle}>
            <ThemedText type="smallBold">{document.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              시행일 {document.effectiveDate}
            </ThemedText>
          </View>
          <View style={styles.iconButton} />
        </View>

        <Animated.ScrollView
          entering={FadeInDown.duration(320)}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <LegalDocumentView markdown={document.markdown} />
          <ThemedText type="small" themeColor="textSecondary">
            작성일 {document.writtenAt}
          </ThemedText>
        </Animated.ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    minWidth: 0,
  },
  safeArea: {
    flex: 1,
    width: "100%",
    minWidth: 0,
    maxWidth: MaxContentWidth,
  },
  topBar: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === "web" ? Spacing.four : Spacing.two,
    paddingBottom: Spacing.three,
  },
  topTitle: {
    flex: 1,
    gap: Spacing.half,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  content: {
    minWidth: 0,
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
  },
  pressed: {
    opacity: 0.7,
  },
});
