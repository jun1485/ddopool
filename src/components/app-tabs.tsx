import { NativeTabs } from "expo-router/unstable-native-tabs";

import { useBookmarks } from "@/hooks/use-bookmarks";
import { useTheme } from "@/hooks/use-theme";

// 네이티브 하단 탭 구성
export default function AppTabs() {
  const colors = useTheme();
  const { bookmarkedQuestionIds } = useBookmarks();

  return (
    <NativeTabs
      backgroundColor={colors.backgroundElement}
      indicatorColor={colors.primarySoft}
      labelVisibilityMode="labeled"
      iconColor={{ default: colors.textSecondary, selected: colors.primary }}
      labelStyle={{
        default: { color: colors.textSecondary, fontSize: 12 },
        selected: { color: colors.text, fontSize: 12, fontWeight: "600" },
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>홈</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require("@/assets/images/tabIcons/home.png")}
          sf={{ default: "house", selected: "house.fill" }}
          md="home"
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="library">
        <NativeTabs.Trigger.Label>문제집</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require("@/assets/images/tabIcons/explore.png")}
          sf={{ default: "books.vertical", selected: "books.vertical.fill" }}
          md="menu_book"
          renderingMode="template"
        />
        {bookmarkedQuestionIds.length > 0 && (
          <NativeTabs.Trigger.Badge>
            {String(bookmarkedQuestionIds.length)}
          </NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="discover">
        <NativeTabs.Trigger.Label>시험찾기</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require("@/assets/images/tabIcons/explore.png")}
          sf="magnifyingglass"
          md="search"
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="review">
        <NativeTabs.Trigger.Label>복습</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require("@/assets/images/tabIcons/explore.png")}
          sf="brain.head.profile"
          md="psychology"
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="report">
        <NativeTabs.Trigger.Label>리포트</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require("@/assets/images/tabIcons/explore.png")}
          sf="chart.bar.xaxis"
          md="analytics"
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
