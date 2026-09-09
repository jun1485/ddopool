import { useEffect, useState } from "react";
import { Button, StyleSheet, View } from "react-native";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { ThemedText } from "./themed-text";
import {
  getWebReminderAvailability,
  prepareWebReminder,
  updateWebReminder,
  type WebReminderAvailability,
} from "@/notifications/web-reminder";

// 웹 알림 연결 안내와 동의 처리
export function WebReminderControls() {
  const theme = useTheme();
  const { user } = useAuth();
  const { settings, updateSettings } = useSettings();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [availability, setAvailability] =
    useState<WebReminderAvailability | null>(null);
  const [serviceReady, setServiceReady] = useState(false);
  useEffect(() => {
    let active = true;
    void prepareWebReminder().then((ready) => {
      if (!active) return;
      setAvailability(getWebReminderAvailability());
      setServiceReady(ready);
    });
    return () => {
      active = false;
    };
  }, []);
  // 웹 알림 연결 상태 변경
  const change = async (enabled: boolean) => {
    if (busy || (enabled && (availability !== "ready" || !serviceReady)))
      return;
    setBusy(true);
    const result = await updateWebReminder(
      enabled,
      settings.studyReminderHour,
      true,
    );
    if (result === "scheduled" || result === "disabled")
      updateSettings({ studyReminderEnabled: enabled });
    setMessage(
      result === "scheduled"
        ? "웹 알림이 연결됐어요. 오늘 한 문제를 풀면 오늘 알림은 멈춰요."
        : result === "disabled"
          ? "웹 알림을 껐어요."
          : result === "unsupported"
            ? "아이폰은 홈 화면에 추가한 또풀에서 다시 열어 주세요."
            : result === "denied"
              ? "기기 설정에서 또풀 알림을 허용해 주세요."
              : "연결하지 못했어요. 로그인과 알림 서비스 준비 상태를 확인해 주세요.",
    );
    setBusy(false);
  };
  return (
    <View style={styles.container}>
      <View style={[styles.guide, { backgroundColor: theme.primarySoft }]}>
        <ThemedText type="smallBold">아이폰에서 알림 받기</ThemedText>
        <ThemedText type="small">1. iOS 16.4 이상에서 Safari로 접속</ThemedText>
        <ThemedText type="small">
          2. 공유 → 홈 화면에 추가 → 웹 앱으로 열기 활성화
        </ThemedText>
        <ThemedText type="small">
          3. 홈 화면의 또풀 실행 → 로그인 → 아래 알림 받기 선택
        </ThemedText>
      </View>
      <ThemedText type="small">
        선택한 시간부터 최대 4회 · 오후 9시부터 마감 알림
      </ThemedText>
      {availability === "install-required" && (
        <ThemedText type="small" style={{ color: theme.warning }}>
          현재 Safari에서 열려 있어요. 홈 화면에 추가한 또풀에서 다시 열어
          주세요.
        </ThemedText>
      )}
      {availability === "unsupported" && (
        <ThemedText type="small" style={{ color: theme.warning }}>
          이 환경에서는 웹 알림을 사용할 수 없어요. HTTPS 주소와 iOS 16.4
          이상인지 확인해 주세요.
        </ThemedText>
      )}
      {!user && (
        <ThemedText type="small">
          웹 알림을 연결하려면 먼저 로그인해 주세요.
        </ThemedText>
      )}
      <Button
        title="웹 알림 받기"
        color={theme.primary}
        disabled={busy || !user || availability !== "ready" || !serviceReady}
        onPress={() => void change(true)}
      />
      <Button
        title="웹 알림 끄기"
        color={theme.primary}
        disabled={busy}
        onPress={() => void change(false)}
      />
      {!!message && (
        <ThemedText accessibilityLiveRegion="polite" type="small">
          {message}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: Spacing.twoHalf, marginTop: Spacing.three },
  guide: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
});
