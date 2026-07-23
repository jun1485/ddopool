import {
  DarkTheme,
  DefaultTheme,
  router,
  Stack,
  ThemeProvider,
  usePathname,
} from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { useExamEnrollment } from "@/hooks/use-exam-enrollment";
import { useResolvedColorScheme } from "@/hooks/use-theme";
import { ExamCatalogProvider } from "@/providers/exam-catalog-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ExamEnrollmentProvider } from "@/providers/exam-enrollment-provider";
import { ExamRequestProvider } from "@/providers/exam-request-provider";
import { NotificationProvider } from "@/providers/notification-provider";
import { SettingsProvider } from "@/providers/settings-provider";
import { migrateLocalLearningData } from "@/sync/migrate-local-learning-data";

SplashScreen.preventAutoHideAsync();

// 앱 화면 테마·라우팅 구성
function AppLayout() {
  const colorScheme = useResolvedColorScheme();
  const pathname = usePathname();
  const { onboardingCompleted, isLoading: isEnrollmentLoading } =
    useExamEnrollment();

  // 첫 시험 선택 화면 진입 제어
  useEffect(() => {
    if (isEnrollmentLoading) return;
    const isOnboardingFlow =
      pathname === "/onboarding" ||
      pathname === "/exam-request" ||
      pathname === "/login";
    if (!onboardingCompleted && !isOnboardingFlow)
      router.replace("/onboarding");
    if (onboardingCompleted && pathname === "/onboarding") router.replace("/");
  }, [isEnrollmentLoading, onboardingCompleted, pathname]);

  // 기존 로컬 학습 기록 동기화 대기열 이관
  useEffect(() => {
    if (!isEnrollmentLoading) void migrateLocalLearningData();
  }, [isEnrollmentLoading]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <AnimatedSplashOverlay />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="catalog" />
        <Stack.Screen name="login" options={{ presentation: "modal" }} />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="exam-request" options={{ presentation: "modal" }} />
        <Stack.Screen
          name="question-report"
          options={{ presentation: "modal" }}
        />
        <Stack.Screen name="settings" options={{ presentation: "modal" }} />
      </Stack>
    </ThemeProvider>
  );
}

// 루트 앱 설정 제공
export default function RootLayout() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <ExamCatalogProvider>
          <ExamEnrollmentProvider>
            <ExamRequestProvider>
              <NotificationProvider>
                <AppLayout />
              </NotificationProvider>
            </ExamRequestProvider>
          </ExamEnrollmentProvider>
        </ExamCatalogProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}
