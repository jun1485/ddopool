import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { AnimatedProgressBar } from "@/components/motion/animated-progress-bar";
import { ExamRequestCard } from "@/components/exam-request-card";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { PageHead } from "@/components/page-head";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Radius, Shadows, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useExamRequests } from "@/hooks/use-exam-requests";
import { useTheme } from "@/hooks/use-theme";
import {
  countExamRequestDetails,
  EXAM_REQUEST_LIMITS,
  validateExamRequestInput,
} from "@/learning/exam-request-validation";
import { ExamRequest } from "@/types/exam-request";

interface FormFieldProps {
  label: string;
  value: string;
  placeholder: string;
  required?: boolean;
  multiline?: boolean;
  keyboardType?: "default" | "url";
  maxLength: number;
  error?: string;
  onChangeText: (value: string) => void;
}

// 시험 요청 입력 필드
function FormField({
  label,
  value,
  placeholder,
  required = false,
  multiline = false,
  keyboardType = "default",
  maxLength,
  error,
  onChangeText,
}: FormFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <View style={styles.fieldLabel}>
        <ThemedText type="smallBold">{label}</ThemedText>
        {required && (
          <ThemedText type="smallBold" style={{ color: theme.danger }}>
            *
          </ThemedText>
        )}
      </View>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        selectionColor={theme.primary}
        keyboardType={keyboardType}
        maxLength={maxLength}
        accessibilityHint={error ?? `${maxLength}자까지 입력 가능`}
        autoCapitalize={keyboardType === "url" ? "none" : "sentences"}
        autoCorrect={keyboardType !== "url"}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[
          styles.input,
          multiline && styles.textarea,
          {
            color: theme.text,
            backgroundColor: theme.backgroundElement,
            borderColor: error == null ? theme.border : theme.danger,
          },
        ]}
      />
      <View style={styles.fieldMeta}>
        <ThemedText
          type="small"
          style={[styles.fieldError, { color: theme.danger }]}
        >
          {error ?? ""}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {value.length}/{maxLength}
        </ThemedText>
      </View>
    </View>
  );
}

// 시험 추가 요청 작성 화면
export default function ExamRequestScreen() {
  const params = useLocalSearchParams<{
    name?: string;
    returnTo?: "onboarding";
  }>();
  const [examName, setExamName] = useState(params.name ?? "");
  const [organization, setOrganization] = useState("");
  const [level, setLevel] = useState("");
  const [officialUrl, setOfficialUrl] = useState("");
  const [reason, setReason] = useState("");
  const [validationMessage, setValidationMessage] = useState<string | null>(
    null,
  );
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [discoveredRequestSearch, setDiscoveredRequestSearch] = useState<{
    query: string;
    requests: ExamRequest[];
  }>({ query: "", requests: [] });
  const {
    createRequest,
    errorMessage,
    findSimilarRequests,
    searchRequests,
    toggleVote,
  } = useExamRequests();
  const { user, isConfigured } = useAuth();
  const theme = useTheme();
  const requestInput = useMemo(
    () => ({
      examName: examName.trim(),
      organization: organization.trim(),
      level: level.trim(),
      officialUrl: officialUrl.trim(),
      reason: reason.trim(),
    }),
    [examName, level, officialUrl, organization, reason],
  );
  const validation = useMemo(
    () => validateExamRequestInput(requestInput),
    [requestInput],
  );
  const detailCount = countExamRequestDetails(requestInput);
  const localSimilarRequests = useMemo(
    () => findSimilarRequests(examName),
    [examName, findSimilarRequests],
  );
  const similarRequests = useMemo(
    () => [
      ...new Map(
        [
          ...localSimilarRequests,
          ...(discoveredRequestSearch.query === examName.trim()
            ? discoveredRequestSearch.requests
            : []),
        ].map((request) => [request.id, request]),
      ).values(),
    ],
    [discoveredRequestSearch, examName, localSimilarRequests],
  );
  const canSubmit =
    (!isConfigured || user != null) && !isSubmitting;
  const requiresLogin = isConfigured && user == null;

  // 유사 시험 요청 공감 인증·처리
  const voteSimilarRequest = (requestId: string) => {
    if (requiresLogin) {
      router.push("/login");
      return;
    }
    void toggleVote(requestId);
  };

  // 시험명 기반 전체 유사 요청 조회
  useEffect(() => {
    const query = examName.trim();
    if (query.length < 2) return;
    let active = true;
    const timer = setTimeout(() => {
      void searchRequests(query).then((result) => {
        if (active) setDiscoveredRequestSearch({ query, requests: result });
      });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [examName, searchRequests]);

  // 시험 요청 제출
  const submitRequest = async () => {
    if (!canSubmit) return;
    setValidationAttempted(true);
    if (!validation.isValid) {
      setValidationMessage("입력한 시험 정보를 다시 확인해 주세요.");
      return;
    }
    if (similarRequests.length > 0) {
      setValidationMessage(
        "비슷한 요청이 이미 있어요. 먼저 기존 요청을 확인해 주세요.",
      );
      return;
    }

    setValidationMessage(null);
    setIsSubmitting(true);
    const request = await createRequest(requestInput);
    setIsSubmitting(false);
    if (request == null) return;
    if (params.returnTo === "onboarding") {
      router.dismissTo("/onboarding");
      return;
    }
    router.dismissTo({ pathname: "/catalog", params: { tab: "requests" } });
  };

  return (
    <ThemedView style={styles.container}>
      <PageHead
        title="시험 요청"
        description="원하는 시험이 없을 때 개설을 요청하고 수요를 모으는 화면."
      />
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="요청 작성 닫기"
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
            <View style={styles.topTitle}>
              <ThemedText type="smallBold">새 시험 요청</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                검토에 필요한 정보를 알려주세요
              </ThemedText>
            </View>
            <View style={styles.closeButton} />
          </View>

          <Animated.ScrollView
            entering={FadeInDown.duration(320)}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.hero, { backgroundColor: theme.primarySoft }]}>
              <View
                style={[
                  styles.heroIcon,
                  { backgroundColor: theme.backgroundElement },
                ]}
              >
                <ThemedText style={styles.heroEmoji}>🧭</ThemedText>
              </View>
              <View style={styles.heroCopy}>
                <ThemedText type="smallBold">
                  없는 시험은 요청할 수 있어요
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  요청은 검토 목록에 쌓이며, 수요와 자료 확보 가능성을 바탕으로
                  문제은행 추가 여부가 결정돼요.
                </ThemedText>
              </View>
            </View>

            {requiresLogin && (
              <View
                style={[
                  styles.authNotice,
                  { backgroundColor: theme.warningSoft },
                ]}
              >
                <View
                  style={[
                    styles.authIcon,
                    { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  <SymbolView
                    tintColor={theme.warning}
                    name={{
                      ios: "person.crop.circle.badge.exclamationmark",
                      android: "person",
                      web: "person",
                    }}
                    size={23}
                  />
                </View>
                <View style={styles.heroCopy}>
                  <ThemedText type="smallBold" style={{ color: theme.warning }}>
                    요청 상태를 받으려면 로그인이 필요해요
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    계정을 연결하면 투표와 요청 진행 상태가 여러 기기에
                    동기화돼요.
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => router.push("/login")}
                  style={({ pressed }) => [
                    styles.authButton,
                    { backgroundColor: theme.warning },
                    pressed && styles.pressed,
                  ]}
                >
                  <ThemedText
                    type="smallBold"
                    style={{ color: theme.onPrimary }}
                  >
                    로그인
                  </ThemedText>
                </Pressable>
              </View>
            )}

            <ThemedView type="backgroundElement" style={styles.formCard}>
              <FormField
                label="시험명"
                required
                value={examName}
                onChangeText={(value) => {
                  setExamName(value);
                  setValidationMessage(null);
                }}
                placeholder="예: 정보처리기사 필기"
                maxLength={EXAM_REQUEST_LIMITS.examName}
                error={
                  validationAttempted ? validation.errors.examName : undefined
                }
              />
              <FormField
                label="주관 기관 (선택)"
                value={organization}
                onChangeText={(value) => {
                  setOrganization(value);
                  setValidationMessage(null);
                }}
                placeholder="예: 한국산업인력공단"
                maxLength={EXAM_REQUEST_LIMITS.organization}
                error={
                  validationAttempted
                    ? validation.errors.organization
                    : undefined
                }
              />
              <FormField
                label="등급·과목"
                value={level}
                onChangeText={(value) => {
                  setLevel(value);
                  setValidationMessage(null);
                }}
                placeholder="예: 필기, 1급, 데이터 분석"
                maxLength={EXAM_REQUEST_LIMITS.level}
                error={
                  validationAttempted ? validation.errors.level : undefined
                }
              />
              <FormField
                label="공식 안내 링크"
                value={officialUrl}
                onChangeText={(value) => {
                  setOfficialUrl(value);
                  setValidationMessage(null);
                }}
                placeholder="https://"
                keyboardType="url"
                maxLength={EXAM_REQUEST_LIMITS.officialUrl}
                error={
                  validationAttempted
                    ? validation.errors.officialUrl
                    : undefined
                }
              />
              <FormField
                label="공부하려는 이유"
                value={reason}
                onChangeText={(value) => {
                  setReason(value);
                  setValidationMessage(null);
                }}
                placeholder="시험 일정이나 필요한 학습 범위를 알려주세요"
                multiline
                maxLength={EXAM_REQUEST_LIMITS.reason}
                error={
                  validationAttempted ? validation.errors.reason : undefined
                }
              />
            </ThemedView>

            <View
              style={[
                styles.qualityCard,
                { backgroundColor: theme.primarySoft },
              ]}
            >
              <View style={styles.qualityTop}>
                <View style={styles.qualityCopy}>
                  <ThemedText type="smallBold" style={{ color: theme.primary }}>
                    요청 정보 {detailCount}/4
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {detailCount === 4
                      ? "검토에 필요한 정보가 충분해요."
                      : "공식 정보가 많을수록 빠르게 검토할 수 있어요."}
                  </ThemedText>
                </View>
                <SymbolView
                  tintColor={theme.primary}
                  name={{
                    ios: detailCount === 4 ? "checkmark.seal.fill" : "doc.text",
                    android: detailCount === 4 ? "verified" : "description",
                    web: detailCount === 4 ? "verified" : "description",
                  }}
                  size={21}
                />
              </View>
              <AnimatedProgressBar
                progress={(detailCount / 4)}
                height={7}
                color={theme.primary}
                trackColor={theme.backgroundElement}
              />
            </View>

            {similarRequests.length > 0 && (
              <View style={styles.similarSection}>
                <View style={styles.similarTitle}>
                  <View
                    style={[
                      styles.similarIcon,
                      { backgroundColor: theme.warningSoft },
                    ]}
                  >
                    <SymbolView
                      tintColor={theme.warning}
                      name={{
                        ios: "doc.on.doc.fill",
                        android: "content_copy",
                        web: "content_copy",
                      }}
                      size={18}
                    />
                  </View>
                  <View style={styles.similarCopy}>
                    <ThemedText type="smallBold">
                      비슷한 요청이 이미 있어요
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      중복 등록 대신 공감하면 수요가 합산돼요.
                    </ThemedText>
                  </View>
                </View>
                {similarRequests.map((request) => (
                  <ExamRequestCard
                    key={request.id}
                    request={request}
                    compact
                    onToggleVote={() => voteSimilarRequest(request.id)}
                  />
                ))}
              </View>
            )}

            {(validationMessage ?? errorMessage) != null && (
              <View
                style={[styles.errorBox, { backgroundColor: theme.dangerSoft }]}
              >
                <SymbolView
                  tintColor={theme.danger}
                  name={{
                    ios: "exclamationmark.circle.fill",
                    android: "error",
                    web: "error",
                  }}
                  size={18}
                />
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {validationMessage ?? errorMessage}
                </ThemedText>
              </View>
            )}

            <View style={[styles.privacyNotice, { borderColor: theme.border }]}>
              <SymbolView
                tintColor={theme.textSecondary}
                name={{
                  ios: "info.circle",
                  android: "info",
                  web: "info",
                }}
                size={18}
              />
              <ThemedText type="small" themeColor="textSecondary">
                개인 정보나 유료 자료 링크는 입력하지 마세요. 공식 시험 정보만
                검토에 사용돼요.
              </ThemedText>
            </View>
          </Animated.ScrollView>

          <View
            style={[
              styles.bottomBar,
              {
                backgroundColor: theme.background,
                borderColor: theme.border,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSubmit }}
              disabled={!canSubmit}
              onPress={() => void submitRequest()}
              style={({ pressed }) => [
                styles.submitButton,
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
                {isSubmitting ? "요청 저장 중..." : "시험 추가 요청 보내기"}
              </ThemedText>
              {!isSubmitting && (
                <SymbolView
                  tintColor={canSubmit ? theme.onPrimary : theme.textSecondary}
                  name={{
                    ios: "paperplane.fill",
                    android: "send",
                    web: "send",
                  }}
                  size={18}
                />
              )}
            </Pressable>
          </View>
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
    gap: Spacing.three,
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
  topTitle: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.half,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
    gap: Spacing.four,
  },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
  },
  heroIcon: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  heroEmoji: {
    fontSize: 26,
    lineHeight: 34,
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  authNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  authIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  authButton: {
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
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
  fieldLabel: {
    flexDirection: "row",
    gap: Spacing.one,
  },
  fieldMeta: {
    minHeight: 18,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  fieldError: {
    flex: 1,
  },
  input: {
    minHeight: 50,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  textarea: {
    minHeight: 112,
    paddingTop: Spacing.three,
  },
  qualityCard: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  qualityTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  qualityCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  similarSection: {
    gap: Spacing.three,
  },
  similarTitle: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  similarIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.small,
  },
  similarCopy: {
    flex: 1,
    gap: Spacing.half,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  privacyNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  bottomBar: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Platform.OS === "ios" ? Spacing.one : Spacing.three,
    borderTopWidth: 1,
  },
  submitButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderRadius: Radius.medium,
  },
  pressed: {
    opacity: 0.7,
  },
});
