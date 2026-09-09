import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { LegalConsentLinks } from "@/components/legal-consent-links";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { PageHead } from "@/components/page-head";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Radius, Shadows, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { goBack } from "@/lib/navigation";

type AuthMode = "sign-in" | "sign-up";

const AUTH_MODES: { value: AuthMode; label: string }[] = [
  { value: "sign-in", label: "로그인" },
  { value: "sign-up", label: "회원가입" },
];

// 이메일 로그인·회원가입 화면
export default function LoginScreen() {
  const {
    user,
    isConfigured,
    message,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    resendConfirmation,
    clearMessage,
  } = useAuth();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const canSubmit =
    isConfigured &&
    email.trim().length > 0 &&
    password.length > 0 &&
    (mode === "sign-in" || accepted) &&
    !isSubmitting;
  const canRequestEmail =
    isConfigured && email.trim().length > 0 && !isSubmitting;
  const isSuccessMessage =
    message?.includes("보냈어요") === true ||
    message?.includes("확인 링크") === true;

  // 인증 모드 전환
  const selectMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setAccepted(false);
    clearMessage();
  };

  // 이메일 인증 제출
  const submitAuth = async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    try {
      const result =
        mode === "sign-in"
          ? await signIn(email.trim(), password)
          : await signUp(email.trim(), password, accepted);
      if (result === "authenticated") goBack();
    } finally {
      setIsSubmitting(false);
    }
  };

  // 비밀번호 재설정 메일 요청
  const sendPasswordReset = async () => {
    if (!canRequestEmail) return;
    setIsSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  // 회원가입 인증 메일 재요청
  const sendConfirmationAgain = async () => {
    if (!canRequestEmail) return;
    setIsSubmitting(true);
    try {
      await resendConfirmation(email.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  if (user != null) {
    return (
      <ThemedView style={styles.container}>
        <PageHead title="로그인" noIndex />
        <SafeAreaView style={styles.accountSafeArea}>
          <View
            style={[styles.accountIcon, { backgroundColor: theme.successSoft }]}
          >
            <SymbolView
              tintColor={theme.success}
              name={{
                ios: "person.crop.circle.fill.badge.checkmark",
                android: "account_circle",
                web: "account_circle",
              }}
              size={46}
            />
          </View>
          <View style={styles.accountCopy}>
            <ThemedText type="subtitle" style={styles.accountTitle}>
              계정이 연결돼 있어요
            </ThemedText>
            <ThemedText themeColor="textSecondary">{user.email}</ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => goBack()}
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
              학습으로 돌아가기
            </ThemedText>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => void signOut()}
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="smallBold" style={{ color: theme.danger }}>
              로그아웃
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <PageHead title="로그인" noIndex />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="계정 화면 닫기"
              onPress={() => goBack()}
              hitSlop={Spacing.two}
              style={({ pressed }) => [
                styles.closeButton,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                tintColor={theme.text}
                name={{ ios: "xmark", android: "close", web: "close" }}
                size={20}
              />
            </Pressable>
            <ThemedText type="smallBold">계정 연결</ThemedText>
            <View style={styles.closeButton} />
          </View>

          <Animated.ScrollView
            entering={reduceMotion ? undefined : FadeInDown.duration(320)}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.hero}>
              <ThemedText type="subtitle" style={styles.heroTitle}>
                어디서든 학습을{"\n"}이어서 하세요
              </ThemedText>
              <ThemedText
                themeColor="textSecondary"
                style={styles.heroDescription}
              >
                계정을 연결하면 내 시험, 풀이 기록, 복습 일정과 저장 문제를 여러
                기기에서 동기화할 수 있어요.
              </ThemedText>
            </View>

            {!isConfigured && (
              <View
                style={[
                  styles.configNotice,
                  { backgroundColor: theme.warningSoft },
                ]}
              >
                <SymbolView
                  tintColor={theme.warning}
                  name={{
                    ios: "wrench.and.screwdriver.fill",
                    android: "build",
                    web: "build",
                  }}
                  size={20}
                />
                <View style={styles.configCopy}>
                  <ThemedText type="smallBold" style={{ color: theme.warning }}>
                    계정 서버 연결 준비 중
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    계정 연결 기능을 준비하고 있어요. 지금은 로그인 없이 학습할
                    수 있고, 기록은 이 기기에 저장돼요.
                  </ThemedText>
                </View>
              </View>
            )}

            <View
              style={[
                styles.modeTabs,
                { backgroundColor: theme.backgroundSelected },
              ]}
            >
              {AUTH_MODES.map(({ value, label }) => {
                const selected = mode === value;
                return (
                  <Pressable
                    key={value}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    onPress={() => selectMode(value)}
                    style={({ pressed }) => [
                      styles.modeTab,
                      selected && {
                        backgroundColor: theme.backgroundElement,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{
                        color: selected ? theme.primary : theme.textSecondary,
                      }}
                    >
                      {label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <ThemedView type="backgroundElement" style={styles.formCard}>
              <View style={styles.field}>
                <ThemedText type="smallBold">이메일</ThemedText>
                <TextInput
                  accessibilityLabel="이메일"
                  value={email}
                  onChangeText={(value) => {
                    setEmail(value);
                    clearMessage();
                  }}
                  placeholder="name@example.com"
                  placeholderTextColor={theme.textSecondary}
                  selectionColor={theme.primary}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  keyboardType="email-address"
                  style={[
                    styles.input,
                    {
                      color: theme.text,
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                    },
                  ]}
                />
              </View>
              <View style={styles.field}>
                <ThemedText type="smallBold">비밀번호</ThemedText>
                <View
                  style={[
                    styles.passwordField,
                    {
                      borderColor: theme.border,
                      backgroundColor: theme.background,
                    },
                  ]}
                >
                  <TextInput
                    accessibilityLabel="비밀번호"
                    value={password}
                    onChangeText={(value) => {
                      setPassword(value);
                      clearMessage();
                    }}
                    placeholder="비밀번호 입력"
                    placeholderTextColor={theme.textSecondary}
                    selectionColor={theme.primary}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete={
                      mode === "sign-in" ? "current-password" : "new-password"
                    }
                    secureTextEntry={!passwordVisible}
                    style={[styles.passwordInput, { color: theme.text }]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      passwordVisible ? "비밀번호 숨기기" : "비밀번호 보기"
                    }
                    onPress={() => setPasswordVisible((current) => !current)}
                    hitSlop={Spacing.two}
                  >
                    <SymbolView
                      tintColor={theme.textSecondary}
                      name={{
                        ios: passwordVisible ? "eye.slash" : "eye",
                        android: passwordVisible
                          ? "visibility_off"
                          : "visibility",
                        web: passwordVisible ? "visibility_off" : "visibility",
                      }}
                      size={20}
                    />
                  </Pressable>
                </View>
              </View>

              {message != null && (
                <View
                  style={[
                    styles.messageBox,
                    {
                      backgroundColor: message.includes("확인 링크")
                        ? theme.successSoft
                        : isSuccessMessage
                          ? theme.successSoft
                          : theme.dangerSoft,
                    },
                  ]}
                >
                  <ThemedText
                    type="small"
                    style={{
                      color: isSuccessMessage ? theme.success : theme.danger,
                    }}
                  >
                    {message}
                  </ThemedText>
                </View>
              )}

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSubmit }}
                disabled={!canSubmit}
                onPress={() => void submitAuth()}
                style={({ pressed }) => [
                  styles.primaryButton,
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
                  {isSubmitting
                    ? "처리 중..."
                    : mode === "sign-in"
                      ? "로그인하고 동기화"
                      : "계정 만들기"}
                </ThemedText>
                {!isSubmitting && (
                  <SymbolView
                    tintColor={
                      canSubmit ? theme.onPrimary : theme.textSecondary
                    }
                    name={{
                      ios: "arrow.right",
                      android: "arrow_forward",
                      web: "arrow_forward",
                    }}
                    size={18}
                  />
                )}
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: !canRequestEmail }}
                disabled={!canRequestEmail}
                onPress={() =>
                  void (mode === "sign-in"
                    ? sendPasswordReset()
                    : sendConfirmationAgain())
                }
                style={({ pressed }) => [
                  styles.secondaryAction,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={{
                    color: canRequestEmail
                      ? theme.primary
                      : theme.textSecondary,
                  }}
                >
                  {mode === "sign-in"
                    ? "비밀번호를 잊으셨나요?"
                    : "인증 메일 다시 보내기"}
                </ThemedText>
              </Pressable>

              {mode === "sign-up" && (
                <>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: accepted }}
                    aria-checked={accepted}
                    onPress={() => setAccepted((value) => !value)}
                  >
                    <ThemedText>
                      {accepted ? "☑" : "☐"} 만 14세 이상이며 이용약관과
                      개인정보처리방침에 동의합니다.
                    </ThemedText>
                  </Pressable>
                  <LegalConsentLinks />
                </>
              )}
            </ThemedView>

            <View style={styles.guestNotice}>
              <SymbolView
                tintColor={theme.textSecondary}
                name={{
                  ios: "iphone",
                  android: "smartphone",
                  web: "smartphone",
                }}
                size={18}
              />
              <ThemedText type="small" themeColor="textSecondary">
                로그인하지 않아도 모든 학습 기능을 사용할 수 있으며, 기록은 이
                기기에 안전하게 유지돼요.
              </ThemedText>
            </View>
          </Animated.ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === "web" ? Spacing.four : Spacing.two,
    paddingBottom: Spacing.three,
  },
  closeButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  hero: {
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  heroTitle: {
    textAlign: "center",
    fontSize: 30,
    lineHeight: 40,
    fontWeight: 700,
  },
  heroDescription: {
    maxWidth: 470,
    textAlign: "center",
  },
  configNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  configCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  modeTabs: {
    flexDirection: "row",
    padding: Spacing.one,
    borderRadius: Radius.medium,
  },
  modeTab: {
    minHeight: 42,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.small,
  },
  formCard: {
    gap: Spacing.four,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  passwordField: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  passwordInput: {
    minWidth: 0,
    flex: 1,
    paddingVertical: Spacing.two,
    fontSize: 15,
    lineHeight: 22,
  },
  messageBox: {
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  primaryButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.medium,
  },
  secondaryAction: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  guestNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  accountSafeArea: {
    width: "100%",
    maxWidth: MaxContentWidth,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.four,
    padding: Spacing.four,
  },
  accountIcon: {
    width: 92,
    height: 92,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 46,
  },
  accountCopy: {
    alignItems: "center",
    gap: Spacing.two,
  },
  accountTitle: {
    fontSize: 27,
    lineHeight: 38,
    fontWeight: 700,
  },
  signOutButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
  },
  pressed: {
    opacity: 0.72,
  },
});
