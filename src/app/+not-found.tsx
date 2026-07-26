import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";
import Animated, {
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

// 존재하지 않는 경로 복구 화면
export default function NotFoundScreen() {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(320)}
          style={styles.content}
        >
          <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
            <SymbolView
              tintColor={theme.primary}
              name={{
                ios: "map.fill",
                android: "explore",
                web: "explore",
              }}
              size={36}
            />
          </View>
          <View style={styles.copy}>
            <ThemedText type="subtitle">페이지를 찾지 못했어요</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.description}>
              링크가 잘못됐거나 이동한 화면이에요. 홈에서 다시 시작해 주세요.
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.replace("/")}
            style={({ pressed }) => [
              styles.button,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
              홈으로 이동
            </ThemedText>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  safeArea: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.four,
    padding: Spacing.four,
  },
  icon: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.pill,
  },
  copy: {
    alignItems: "center",
    gap: Spacing.two,
  },
  description: {
    maxWidth: 480,
    textAlign: "center",
  },
  button: {
    minWidth: 180,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.medium,
  },
  pressed: {
    opacity: 0.72,
  },
});
