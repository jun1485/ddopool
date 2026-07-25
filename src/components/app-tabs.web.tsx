import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from "expo-router/ui";
import { usePathname } from "expo-router";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

import { MaxContentWidth, Radius, Shadows, Spacing } from "@/constants/theme";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useTheme } from "@/hooks/use-theme";

// 웹 상단 탭 바
export default function AppTabs() {
  const { bookmarkedQuestionIds } = useBookmarks();
  const pathname = usePathname();

  return (
    <Tabs>
      <Animated.View
        key={pathname}
        entering={FadeIn.duration(220)}
        style={styles.tabContent}
      >
        <TabSlot style={styles.tabSlot} />
      </Animated.View>
      <TabList asChild>
        <CustomTabList>
          <TabTrigger name="home" href="/" asChild>
            <TabButton>홈</TabButton>
          </TabTrigger>
          <TabTrigger name="library" href="/library" asChild>
            <TabButton>
              {bookmarkedQuestionIds.length > 0
                ? `문제집 · ${bookmarkedQuestionIds.length}`
                : "문제집"}
            </TabButton>
          </TabTrigger>
          <TabTrigger name="review" href="/review" asChild>
            <TabButton>복습</TabButton>
          </TabTrigger>
          <TabTrigger name="report" href="/report" asChild>
            <TabButton>리포트</TabButton>
          </TabTrigger>
        </CustomTabList>
      </TabList>
    </Tabs>
  );
}

// 탭 전환 버튼
export function TabButton({
  children,
  isFocused,
  ...props
}: TabTriggerSlotProps) {
  const theme = useTheme();

  return (
    <Pressable {...props} style={({ pressed }) => pressed && styles.pressed}>
      <ThemedView
        style={[
          styles.tabButtonView,
          {
            backgroundColor: isFocused
              ? theme.primarySoft
              : theme.backgroundElement,
          },
        ]}
      >
        <ThemedText
          type="smallBold"
          style={{ color: isFocused ? theme.primary : theme.textSecondary }}
        >
          {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

// 탭 바 컨테이너
export function CustomTabList(props: TabListProps) {
  const { width } = useWindowDimensions();

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView type="backgroundElement" style={styles.innerContainer}>
        {width >= 520 && (
          <View style={styles.brand}>
            <View style={styles.brandMark}>
              <ThemedText type="smallBold" style={styles.brandMarkText}>
                E
              </ThemedText>
            </View>
            <ThemedText type="smallBold" style={styles.brandText}>
              Exam Loop
            </ThemedText>
          </View>
        )}

        {props.children}
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabContent: {
    flex: 1,
  },
  tabSlot: {
    height: "100%",
  },
  tabListContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    padding: Spacing.three,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    zIndex: 10,
  },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.large,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
    minWidth: 0,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    borderWidth: 1,
    borderColor: "rgba(127, 127, 127, 0.12)",
    ...Shadows.card,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    marginRight: "auto",
  },
  brandMark: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.small,
    backgroundColor: "#6657E8",
  },
  brandMarkText: {
    color: "#FFFFFF",
  },
  brandText: {
    paddingRight: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
  tabButtonView: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
});
