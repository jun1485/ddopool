import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

// 네이티브 시작 화면 종료
export function AnimatedSplashOverlay() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return null;
}
