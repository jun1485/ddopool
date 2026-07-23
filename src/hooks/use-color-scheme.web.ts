import { useSyncExternalStore } from "react";
import { useColorScheme as useRNColorScheme } from "react-native";

// 웹 정적 렌더링 이후 화면 색상 모드 동기화
export function useColorScheme() {
  const hasHydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const colorScheme = useRNColorScheme();

  return hasHydrated ? colorScheme : "light";
}
