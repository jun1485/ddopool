import { RefreshControl, type RefreshControlProps } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { useRefresh } from "@/providers/refresh-provider";

// 화면을 아래로 당기면 새로고침하는 기기 기본 표시
export function PullRefreshControl(
  props: Omit<RefreshControlProps, "refreshing" | "onRefresh">,
) {
  const { refreshing, refresh } = useRefresh();
  const theme = useTheme();
  return (
    <RefreshControl
      {...props}
      refreshing={refreshing}
      onRefresh={refresh}
      tintColor={theme.primary}
      colors={[theme.primary]}
      progressBackgroundColor={theme.backgroundElement}
    />
  );
}
