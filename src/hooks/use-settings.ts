import { useSettingsContext } from "@/providers/settings-provider";

// 앱 설정 상태 연결
export function useSettings() {
  return useSettingsContext();
}
