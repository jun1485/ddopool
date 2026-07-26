import * as Linking from "expo-linking";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";
import Animated, {
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Radius, Shadows, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";

type CallbackStatus = "loading" | "recovery" | "authenticated" | "failed";

// 인증 메일 딥링크 복귀 화면
export default function AuthCallbackScreen() {
  const callbackUrl = Linking.useURL();
  const { completeAuthCallback, updatePassword, message, clearMessage } =
    useAuth();
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const [status, setStatus] = useState<CallbackStatus>("loading");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canSubmit =
    password.length > 0 && password === passwordConfirmation && !isSubmitting;

  // 인증 딥링크 세션 반영
  useEffect(() => {
    let active = true;

    // 현재 인증 딥링크 처리
    const resolveCallback = async () => {
      const url = callbackUrl ?? (await Linking.getInitialURL());
      if (url == null) {
        if (active) setStatus("failed");
        return;
      }
      const result = await completeAuthCallback(url);
      if (active) setStatus(result);
    };

    void resolveCallback();
    return () => {
      active = false;
    };
  }, [callbackUrl, completeAuthCallback]);

  // 복구 세션 비밀번호 저장
  const submitPassword = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    const updated = await updatePassword(password);
    setIsSubmitting(false);
    if (updated) router.replace("/");
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View
          entering={reduceMotion ? undefined : FadeInDown.duration(320)}
          style={styles.content}
        >
          <View
            style={[
              styles.icon,
              {
                backgroundColor:
                  status === "failed" ? theme.dangerSoft : theme.primarySoft,
              },
            ]}
          >
            <SymbolView
              tintColor={status === "failed" ? theme.danger : theme.primary}
              name={{
                ios:
                  status === "failed"
                    ? "exclamationmark.triangle.fill"
                    : "lock.shield.fill",
                android: status === "failed" ? "error" : "verified_user",
                web: status === "failed" ? "error" : "verified_user",
              }}
              size={36}
            />
          </View>

          <View style={styles.copy}>
            <ThemedText type="subtitle" style={styles.title}>
              {status === "loading"
                ? "인증 링크 확인 중"
                : status === "recovery"
                  ? "새 비밀번호 설정"
                  : status === "authenticated"
                    ? "이메일 인증 완료"
                    : "인증 링크 확인 실패"}
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.description}>
              {status === "loading"
                ? "잠시만 기다려 주세요."
                : status === "recovery"
                  ? "다른 곳에서 사용하지 않는 새 비밀번호를 입력해 주세요."
                  : status === "authenticated"
                    ? "계정 인증이 완료됐어요. 이제 학습 기록을 동기화할 수 있어요."
                    : "링크가 만료됐을 수 있어요. 로그인 화면에서 메일을 다시 요청해 주세요."}
            </ThemedText>
          </View>

          {status === "recovery" && (
            <ThemedView type="backgroundElement" style={styles.form}>
              <TextInput
                accessibilityLabel="새 비밀번호"
                value={password}
                onChangeText={(value) => {
                  setPassword(value);
                  clearMessage();
                }}
                placeholder="새 비밀번호"
                placeholderTextColor={theme.textSecondary}
                selectionColor={theme.primary}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                secureTextEntry
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderColor: theme.border,
                    backgroundColor: theme.background,
                  },
                ]}
              />
              <TextInput
                accessibilityLabel="새 비밀번호 확인"
                value={passwordConfirmation}
                onChangeText={(value) => {
                  setPasswordConfirmation(value);
                  clearMessage();
                }}
                placeholder="새 비밀번호 확인"
                placeholderTextColor={theme.textSecondary}
                selectionColor={theme.primary}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="new-password"
                secureTextEntry
                style={[
                  styles.input,
                  {
                    color: theme.text,
                    borderColor:
                      passwordConfirmation.length === 0 ||
                      password === passwordConfirmation
                        ? theme.border
                        : theme.danger,
                    backgroundColor: theme.background,
                  },
                ]}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit }}
                disabled={!canSubmit}
                onPress={() => void submitPassword()}
                style={({ pressed }) => [
                  styles.button,
                  {
                    backgroundColor: canSubmit
                      ? theme.primary
                      : theme.backgroundSelected,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={{
                    color: canSubmit ? theme.onPrimary : theme.textSecondary,
                  }}
                >
                  {isSubmitting ? "변경 중..." : "비밀번호 변경"}
                </ThemedText>
              </Pressable>
            </ThemedView>
          )}

          {message != null && status !== "loading" && (
            <ThemedText
              type="small"
              style={{
                color: status === "failed" ? theme.danger : theme.success,
              }}
            >
              {message}
            </ThemedText>
          )}

          {(status === "authenticated" || status === "failed") && (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                router.replace(status === "failed" ? "/login" : "/")
              }
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: theme.primary },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                {status === "failed" ? "로그인 화면으로" : "학습으로 돌아가기"}
              </ThemedText>
            </Pressable>
          )}
        </Animated.View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
  },
  safeArea: {
    flex: 1,
    width: "100%",
    maxWidth: MaxContentWidth,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.four,
    padding: Spacing.four,
  },
  icon: {
    width: 76,
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.pill,
  },
  copy: {
    alignItems: "center",
    gap: Spacing.two,
  },
  title: {
    textAlign: "center",
  },
  description: {
    maxWidth: 480,
    textAlign: "center",
  },
  form: {
    width: "100%",
    maxWidth: 480,
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  button: {
    minWidth: 180,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.medium,
  },
  pressed: {
    opacity: 0.72,
  },
});
