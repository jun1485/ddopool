import {
  DarkTheme,
  DefaultTheme,
  router,
  Stack,
  ThemeProvider,
  usePathname,
} from "expo-router";
import type { ErrorBoundaryProps, Href } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AnimatedSplashOverlay } from "@/components/animated-icon";
import { PageHead } from "@/components/page-head";
import { Durations } from "@/constants/motion";
import { useExamEnrollment } from "@/hooks/use-exam-enrollment";
import { useResolvedColorScheme } from "@/hooks/use-theme";
import { configureStudyNotificationHandler } from "@/notifications/study-reminder";
import { subscribeToNotificationRouting } from "@/notifications/notification-routing";
import { AuthProvider } from "@/providers/auth-provider";
import { ExamCatalogProvider } from "@/providers/exam-catalog-provider";
import { ExamEnrollmentProvider } from "@/providers/exam-enrollment-provider";
import { ExamRequestProvider } from "@/providers/exam-request-provider";
import { NetworkProvider, OfflineBanner } from "@/providers/network-provider";
import { NotificationProvider } from "@/providers/notification-provider";
import { SettingsProvider } from "@/providers/settings-provider";

SplashScreen.preventAutoHideAsync();

// 모달 화면 아래에서 올라오는 전환 옵션
const MODAL_SCREEN_OPTIONS = {
  presentation: "modal",
  animation: "slide_from_bottom",
  animationDuration: Durations.base,
} as const;

// 루트 화면 오류 복구 안내
export function ErrorBoundary({ retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.errorContainer}>
      <View style={styles.errorIcon}>
        <Text style={styles.errorEmoji}>😿</Text>
      </View>
      <Text style={styles.errorTitle}>앱을 불러오지 못했어요</Text>
      <Text style={styles.errorDescription}>
        학습 기록은 그대로 유지돼요. 앱을 다시 시작해 주세요.
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={retry}
        style={({ pressed }) => [
          styles.restartButton,
          pressed && styles.pressed,
        ]}
      >
        <Text style={styles.restartButtonText}>앱 다시 시작</Text>
      </Pressable>
    </View>
  );
}

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
      pathname === "/login" ||
      pathname === "/auth/callback" ||
      pathname === "/+not-found";
    if (!onboardingCompleted && !isOnboardingFlow)
      router.replace("/onboarding");
    if (onboardingCompleted && pathname === "/onboarding") router.replace("/");
  }, [isEnrollmentLoading, onboardingCompleted, pathname]);

  // 포그라운드 학습 리마인더 표시 준비
  useEffect(() => {
    void configureStudyNotificationHandler();
  }, []);

  // 알림 선택·콜드 스타트 화면 이동 연결
  useEffect(() => {
    if (isEnrollmentLoading || !onboardingCompleted) return;
    let unsubscribe: () => void = () => undefined;
    let active = true;
    void subscribeToNotificationRouting((url) => {
      router.navigate(url as Href);
    }).then((removeListener) => {
      if (active) unsubscribe = removeListener;
      else removeListener();
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, [isEnrollmentLoading, onboardingCompleted]);

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      {/* 화면이 자체 지정하지 않을 때의 기본 문서 제목·설명 */}
      <PageHead />
      <AnimatedSplashOverlay />
      <View style={styles.app}>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right",
            animationDuration: Durations.base,
            gestureEnabled: true,
          }}
        >
          <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
          <Stack.Screen name="catalog" />
          <Stack.Screen name="login" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="notifications" />
          <Stack.Screen name="progress" />
          <Stack.Screen name="activity" />
          <Stack.Screen name="review-library" />
          <Stack.Screen name="study-plan-settings" />
          <Stack.Screen name="session-builder/[examId]" />
          <Stack.Screen
            name="quiz/[examId]"
            options={{ animation: "fade_from_bottom" }}
          />
          <Stack.Screen name="exam-request" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="question-report" options={MODAL_SCREEN_OPTIONS} />
          <Stack.Screen name="settings" options={MODAL_SCREEN_OPTIONS} />
        </Stack>
        <OfflineBanner />
      </View>
    </ThemeProvider>
  );
}

// 루트 앱 설정 제공
export default function RootLayout() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <NetworkProvider>
          <ExamCatalogProvider>
            <ExamEnrollmentProvider>
              <ExamRequestProvider>
                <NotificationProvider>
                  <AppLayout />
                </NotificationProvider>
              </ExamRequestProvider>
            </ExamEnrollmentProvider>
          </ExamCatalogProvider>
        </NetworkProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  app: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
    backgroundColor: "#F4F5F9",
  },
  errorIcon: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#FDE8EC",
  },
  errorEmoji: {
    fontSize: 36,
    lineHeight: 44,
  },
  errorTitle: {
    color: "#15181F",
    fontSize: 22,
    lineHeight: 30,
    fontWeight: 700,
  },
  errorDescription: {
    maxWidth: 420,
    color: "#6B7280",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  restartButton: {
    minWidth: 180,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: "#5B4BE0",
  },
  restartButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  pressed: {
    opacity: 0.72,
  },
});
