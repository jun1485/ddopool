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
import { configureStudyNotificationHandler } from "@/notifications/study-reminder";
import { ExamCatalogProvider } from "@/providers/exam-catalog-provider";
import { AuthProvider } from "@/providers/auth-provider";
import { ExamEnrollmentProvider } from "@/providers/exam-enrollment-provider";
import { ExamRequestProvider } from "@/providers/exam-request-provider";
import { NotificationProvider } from "@/providers/notification-provider";
import { SettingsProvider } from "@/providers/settings-provider";

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

  // 포그라운드 학습 리마인더 표시 준비
  useEffect(() => {
    void configureStudyNotificationHandler();
  }, []);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <AnimatedSplashOverlay />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade_from_bottom",
          gestureEnabled: true,
        }}
      >
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="catalog" />
        <Stack.Screen name="login" options={{ presentation: "modal" }} />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="progress" />
        <Stack.Screen name="activity" />
        <Stack.Screen name="review-library" />
        <Stack.Screen name="study-plan-settings" />
        <Stack.Screen name="session-builder/[examId]" />
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
