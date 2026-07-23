import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Radius, Shadows, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useExamCatalog } from "@/hooks/use-exam-catalog";
import { useTheme } from "@/hooks/use-theme";
import { examPlatformApi } from "@/repositories/exam-platform-api";
import { QuestionReportCategory } from "@/types/question-report";

const REPORT_OPTIONS: {
  category: QuestionReportCategory;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    category: "wrong-answer",
    label: "정답이 잘못됐어요",
    description: "표시된 정답이 맞지 않거나 여러 답이 가능해요",
    icon: "🎯",
  },
  {
    category: "unclear",
    label: "문제·해설이 불명확해요",
    description: "문장이나 해설만으로 의미를 이해하기 어려워요",
    icon: "💭",
  },
  {
    category: "typo",
    label: "오탈자가 있어요",
    description: "문제, 보기 또는 해설의 글자가 잘못됐어요",
    icon: "✍️",
  },
  {
    category: "outdated",
    label: "내용이 오래됐어요",
    description: "법령, 제도 또는 시험 기준이 변경된 것 같아요",
    icon: "🕒",
  },
  {
    category: "other",
    label: "다른 문제가 있어요",
    description: "위 항목에 없는 문제를 직접 알려주세요",
    icon: "💬",
  },
];

// 문제 오류 신고 작성 화면
export default function QuestionReportScreen() {
  const params = useLocalSearchParams<{ questionId: string }>();
  const { user, isConfigured } = useAuth();
  const { findQuestion, findExam } = useExamCatalog();
  const [category, setCategory] =
    useState<QuestionReportCategory>("wrong-answer");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const theme = useTheme();
  const question = findQuestion(params.questionId);
  const exam = question == null ? undefined : findExam(question.examId);
  const requiresLogin = isConfigured && user == null;
  const canSubmit = question != null && !isSubmitting;

  // 문제 오류 신고 제출
  const submitReport = async () => {
    if (!canSubmit || question == null) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const categoryLabel =
        REPORT_OPTIONS.find((option) => option.category === category)?.label ??
        "기타";
      await examPlatformApi.reportQuestion(
        question.id,
        `[${categoryLabel}] ${details.trim()}`.trim(),
      );
      setIsSubmitted(true);
    } catch {
      setErrorMessage("신고를 저장하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.successSafeArea}>
          <View
            style={[styles.successIcon, { backgroundColor: theme.successSoft }]}
          >
            <SymbolView
              tintColor={theme.success}
              name={{
                ios: "checkmark.circle.fill",
                android: "check_circle",
                web: "check_circle",
              }}
              size={44}
            />
          </View>
          <View style={styles.successCopy}>
            <ThemedText type="subtitle" style={styles.successTitle}>
              신고가 접수됐어요
            </ThemedText>
            <ThemedText
              themeColor="textSecondary"
              style={styles.successDescription}
            >
              검토 결과에 따라 문제 수정 또는 비노출 처리가 진행돼요. 학습
              품질을 높이는 데 도움을 주셔서 감사합니다.
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.doneButton,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
              학습으로 돌아가기
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.topBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="문제 신고 닫기"
              onPress={() => router.back()}
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
              <ThemedText type="smallBold">문제 오류 신고</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                검토에 필요한 내용을 알려주세요
              </ThemedText>
            </View>
            <View style={styles.closeButton} />
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {question != null ? (
              <ThemedView type="backgroundElement" style={styles.questionCard}>
                <View style={styles.questionMeta}>
                  <View
                    style={[
                      styles.examBadge,
                      { backgroundColor: theme.primarySoft },
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{ color: theme.primary }}
                    >
                      {exam?.icon} {exam?.shortTitle ?? "시험"}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    {question.subject}
                  </ThemedText>
                </View>
                <ThemedText style={styles.prompt}>{question.prompt}</ThemedText>
              </ThemedView>
            ) : (
              <View
                style={[styles.errorBox, { backgroundColor: theme.dangerSoft }]}
              >
                <ThemedText type="small" style={{ color: theme.danger }}>
                  신고할 문제 정보를 찾지 못했어요.
                </ThemedText>
              </View>
            )}

            <View style={styles.section}>
              <View>
                <ThemedText style={styles.sectionTitle}>
                  어떤 문제가 있나요?
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  가장 가까운 항목 한 개를 선택해 주세요
                </ThemedText>
              </View>
              <View style={styles.optionList}>
                {REPORT_OPTIONS.map((option) => {
                  const selected = category === option.category;
                  return (
                    <Pressable
                      key={option.category}
                      accessibilityRole="radio"
                      accessibilityState={{ selected }}
                      onPress={() => setCategory(option.category)}
                      style={({ pressed }) => [
                        styles.option,
                        {
                          backgroundColor: selected
                            ? theme.primarySoft
                            : theme.backgroundElement,
                          borderColor: selected ? theme.primary : theme.border,
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <ThemedText style={styles.optionEmoji}>
                        {option.icon}
                      </ThemedText>
                      <View style={styles.optionCopy}>
                        <ThemedText type="smallBold">{option.label}</ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          {option.description}
                        </ThemedText>
                      </View>
                      <View
                        style={[
                          styles.radio,
                          {
                            borderColor: selected
                              ? theme.primary
                              : theme.border,
                          },
                        ]}
                      >
                        {selected && (
                          <View
                            style={[
                              styles.radioFill,
                              { backgroundColor: theme.primary },
                            ]}
                          />
                        )}
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.section}>
              <View>
                <ThemedText style={styles.sectionTitle}>상세 내용</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  어떤 부분을 고치면 좋을지 자유롭게 적어주세요
                </ThemedText>
              </View>
              <TextInput
                accessibilityLabel="문제 오류 상세 내용"
                value={details}
                onChangeText={setDetails}
                placeholder="예: 2번 보기도 정답이 될 수 있는 이유가 있습니다"
                placeholderTextColor={theme.textSecondary}
                selectionColor={theme.primary}
                multiline
                textAlignVertical="top"
                style={[
                  styles.textarea,
                  {
                    color: theme.text,
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}
              />
            </View>

            <View
              style={[
                styles.notice,
                {
                  backgroundColor: requiresLogin
                    ? theme.primarySoft
                    : theme.backgroundSelected,
                },
              ]}
            >
              <SymbolView
                tintColor={requiresLogin ? theme.primary : theme.textSecondary}
                name={{
                  ios: requiresLogin
                    ? "person.crop.circle.badge.plus"
                    : "shield.checkered",
                  android: requiresLogin ? "person_add" : "verified_user",
                  web: requiresLogin ? "person_add" : "verified_user",
                }}
                size={19}
              />
              <ThemedText
                type="small"
                style={{
                  color: requiresLogin ? theme.primary : theme.textSecondary,
                }}
              >
                {requiresLogin
                  ? "로그인하면 신고 처리 상태를 계정에 안전하게 연결할 수 있어요."
                  : "신고가 누적된 문제는 검토 대상으로 분류되며, 관리자 확인 전까지 정답이 자동 변경되지는 않아요."}
              </ThemedText>
            </View>

            {errorMessage != null && (
              <View
                style={[styles.errorBox, { backgroundColor: theme.dangerSoft }]}
              >
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {errorMessage}
                </ThemedText>
              </View>
            )}
          </ScrollView>

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
              accessibilityState={{
                disabled: !canSubmit,
              }}
              disabled={!canSubmit}
              onPress={() =>
                requiresLogin ? router.push("/login") : void submitReport()
              }
              style={({ pressed }) => [
                styles.submitButton,
                {
                  backgroundColor: !canSubmit
                    ? theme.backgroundSelected
                    : theme.primary,
                },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{
                  color: !canSubmit ? theme.textSecondary : theme.onPrimary,
                }}
              >
                {isSubmitting
                  ? "신고 저장 중..."
                  : requiresLogin
                    ? "로그인하고 신고하기"
                    : "문제 검토 요청 보내기"}
              </ThemedText>
              {!isSubmitting && (
                <SymbolView
                  tintColor={!canSubmit ? theme.textSecondary : theme.onPrimary}
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
  questionCard: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  questionMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  examBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  prompt: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: 700,
  },
  section: {
    gap: Spacing.three,
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 27,
    fontWeight: 700,
  },
  optionList: {
    gap: Spacing.two,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  optionEmoji: {
    fontSize: 22,
    lineHeight: 28,
  },
  optionCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  radio: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: Radius.pill,
  },
  radioFill: {
    width: 12,
    height: 12,
    borderRadius: Radius.pill,
  },
  textarea: {
    minHeight: 120,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    fontSize: 16,
    lineHeight: 23,
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  errorBox: {
    padding: Spacing.three,
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
  successSafeArea: {
    width: "100%",
    maxWidth: MaxContentWidth,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.four,
    padding: Spacing.four,
  },
  successIcon: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 44,
  },
  successCopy: {
    alignItems: "center",
    gap: Spacing.two,
  },
  successTitle: {
    fontSize: 29,
    lineHeight: 38,
    fontWeight: 700,
  },
  successDescription: {
    maxWidth: 430,
    textAlign: "center",
  },
  doneButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.five,
    borderRadius: Radius.medium,
  },
  pressed: {
    opacity: 0.72,
  },
});
