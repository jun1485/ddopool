import {
  Tabs,
  TabList,
  TabTrigger,
  TabSlot,
  TabTriggerSlotProps,
  TabListProps,
} from "expo-router/ui";
import { usePathname } from "expo-router";
import { useEffect } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import Animated, {
  FadeIn,
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { MascotCat } from "@/components/mascot-cat";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "./themed-text";
import { ThemedView } from "./themed-view";

import { Springs, Timings } from "@/constants/motion";
import {
  Alpha,
  MaxContentWidth,
  Radius,
  Shadows,
  Spacing,
} from "@/constants/theme";
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
  const reduceMotion = useReducedMotion();
  const focusProgress = useSharedValue(isFocused === true ? 1 : 0);

  // 활성 탭 전환 시 배경·확대 진행값 갱신
  useEffect(() => {
    const target = isFocused === true ? 1 : 0;
    focusProgress.value = reduceMotion
      ? target
      : withTiming(target, Timings.fast);
  }, [focusProgress, isFocused, reduceMotion]);

  const pillStyle = useAnimatedStyle(
    () => ({
      backgroundColor: interpolateColor(
        focusProgress.value,
        [0, 1],
        [theme.backgroundElement, theme.primarySoft],
      ),
      transform: [
        {
          scale: reduceMotion
            ? 1
            : withSpring(1 + focusProgress.value * 0.04, Springs.pop),
        },
      ],
    }),
    [reduceMotion, theme.backgroundElement, theme.primarySoft],
  );

  return (
    <Pressable {...props}>
      <Animated.View style={[styles.tabButtonView, pillStyle]}>
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

  return (
    <View {...props} style={styles.tabListContainer}>
      <ThemedView
        type="backgroundElement"
        style={[styles.innerContainer, !showBrand && styles.compactContainer]}
      >
        {showBrand && (
          <View style={styles.brand}>
            <MascotCat size={34} />
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
    borderColor: Alpha.hairline,
    ...Shadows.card,
  },
  // 브랜드 영역 미노출 폭에서 탭을 가로 전체로 분산
  compactContainer: {
    justifyContent: "space-between",
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
  activeDot: {
    position: "absolute",
    bottom: 3,
    width: 14,
    height: 3,
    borderRadius: Radius.pill,
  },
});
