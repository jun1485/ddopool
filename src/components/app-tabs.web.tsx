import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from "expo-router/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePathname } from "expo-router";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

import { Alpha, MaxContentWidth, Radius, Spacing } from "@/constants/theme";
import { useBookmarks } from "@/hooks/use-bookmarks";
import { useTheme } from "@/hooks/use-theme";

// 웹 상단 탭 바
export default function AppTabs() {
  const { bookmarkedQuestionIds } = useBookmarks();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();

  return (
    <Tabs>
      <Animated.View
        key={pathname}
        entering={reduceMotion ? undefined : FadeIn.duration(220)}
        style={[
          styles.tabContent,
          width < 520
            ? { paddingBottom: 72 + insets.bottom }
            : { paddingTop: 64 },
        ]}
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
          <TabTrigger name="discover" href="./discover" asChild>
            <TabButton>시험찾기</TabButton>
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
  const reduceMotion = useReducedMotion();
  const { width } = useWindowDimensions();

  return (
    <Pressable {...props}>
      <Animated.View
        style={[
          styles.tabButtonView,
          width < 520 && styles.compactTabButtonView,
        ]}
      >
        <ThemedText
          type="smallBold"
          style={{ color: isFocused ? theme.primary : theme.textSecondary }}
        >
          {children}
        </ThemedText>
        {isFocused === true && (
          <Animated.View
            entering={reduceMotion ? undefined : FadeIn.duration(180)}
            style={[styles.activeDot, { backgroundColor: theme.primary }]}
          />
        )}
      </Animated.View>
    </Pressable>
  );
}

// 탭 바 컨테이너
export function CustomTabList(props: TabListProps) {
  const { width } = useWindowDimensions();
  const showBrand = width >= 520;
  const insets = useSafeAreaInsets();

  return (
    <View
      {...props}
      style={[
        styles.tabListContainer,
        !showBrand && [styles.mobileBar, { paddingBottom: insets.bottom }],
      ]}
    >
      <ThemedView
        type="backgroundElement"
        style={[styles.innerContainer, !showBrand && styles.compactContainer]}
      >
        {showBrand && (
          <View style={styles.brand}>
            <ThemedText type="smallBold" style={styles.brandText}>
              또풀
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
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    zIndex: 10,
  },
  mobileBar: { bottom: 0, paddingTop: 0, paddingHorizontal: 0 },
  innerContainer: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    flex: 1,
    minWidth: 0,
    gap: Spacing.two,
    maxWidth: MaxContentWidth,
    borderBottomWidth: 1,
    borderColor: Alpha.hairline,
  },
  // 브랜드 영역 미노출 폭에서 탭을 가로 전체로 분산
  compactContainer: {
    justifyContent: "space-between",
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderColor: Alpha.hairline,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    marginRight: "auto",
  },
  brandText: {
    paddingRight: Spacing.two,
  },
  tabButtonView: {
    alignItems: "center",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.pill,
  },
  compactTabButtonView: {
    paddingHorizontal: Spacing.one,
  },
  activeDot: {
    position: "absolute",
    bottom: 3,
    width: 24,
    height: 2,
    borderRadius: Radius.pill,
  },
});
