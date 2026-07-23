import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
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

import type { ExamRequestStatusHistoryRow } from "../../../packages/contracts/src";

import { ExamRequestCard } from "@/components/exam-request-card";
import { RequestStatusTimeline } from "@/components/request-status-timeline";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Radius, Shadows, Spacing } from "@/constants/theme";
import { useExamRequests } from "@/hooks/use-exam-requests";
import { useTheme } from "@/hooks/use-theme";
import { ExamRequest } from "@/types/exam-request";

interface DetailFieldProps {
  label: string;
  value: string;
  placeholder: string;
  editable: boolean;
  multiline?: boolean;
  keyboardType?: "default" | "url";
  onChangeText: (value: string) => void;
}

interface RequestDetailFormProps {
  request: ExamRequest;
  history: ExamRequestStatusHistoryRow[];
}

// 시험 요청 상세 입력 필드
function DetailField({
  label,
  value,
  placeholder,
  editable,
  multiline = false,
  keyboardType = "default",
  onChangeText,
}: DetailFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.field}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        selectionColor={theme.primary}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "url" ? "none" : "sentences"}
        multiline={multiline}
        textAlignVertical={multiline ? "top" : "center"}
        style={[
          styles.input,
          multiline && styles.textarea,
          !editable && styles.readOnlyInput,
          {
            color: theme.text,
            backgroundColor: editable
              ? theme.backgroundElement
              : theme.backgroundSelected,
            borderColor: theme.border,
          },
        ]}
      />
    </View>
  );
}

// 시험 요청 정보 보완 폼
function RequestDetailForm({ request, history }: RequestDetailFormProps) {
  const {
    updateRequest,
    cancelRequest,
    toggleVote,
    canManageRequestDetails,
    errorMessage,
  } = useExamRequests();
  const [organization, setOrganization] = useState(request.organization);
  const [level, setLevel] = useState(request.level);
  const [officialUrl, setOfficialUrl] = useState(request.officialUrl);
  const [reason, setReason] = useState(request.reason);
  const [isSaving, setIsSaving] = useState(false);
  const [isCancelConfirming, setIsCancelConfirming] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const theme = useTheme();
  const editable =
    canManageRequestDetails &&
    (request.status === "requested" || request.status === "triage");
  const canSave = organization.trim().length > 0 && !isSaving && editable;

  // 시험 요청 정보 저장
  const saveRequest = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setSuccessMessage(null);
    const saved = await updateRequest(request.id, {
      examName: request.examName,
      organization: organization.trim(),
      level: level.trim(),
      officialUrl: officialUrl.trim(),
      reason: reason.trim(),
    });
    setIsSaving(false);
    if (saved) setSuccessMessage("보완한 정보가 저장됐어요.");
  };

  // 시험 요청 취소 확정
  const confirmCancel = async () => {
    const cancelled = await cancelRequest(request.id);
    if (cancelled) setIsCancelConfirming(false);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardView}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="이전 화면"
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
            name={{
              ios: "chevron.left",
              android: "arrow_back",
              web: "arrow_back",
            }}
            size={21}
          />
        </Pressable>
        <View style={styles.topTitle}>
          <ThemedText type="smallBold">요청 상세</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            진행 상태와 제출 정보를 관리하세요
          </ThemedText>
        </View>
        <View style={styles.closeButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ExamRequestCard
          request={request}
          onToggleVote={() => void toggleVote(request.id)}
        />
        <RequestStatusTimeline status={request.status} history={history} />

        <View
          style={[
            styles.statusNotice,
            {
              backgroundColor: editable
                ? theme.primarySoft
                : theme.backgroundSelected,
            },
          ]}
        >
          <SymbolView
            tintColor={editable ? theme.primary : theme.textSecondary}
            name={{
              ios: editable ? "pencil.circle.fill" : "lock.fill",
              android: editable ? "edit" : "lock",
              web: editable ? "edit" : "lock",
            }}
            size={20}
          />
          <ThemedText
            type="small"
            style={{
              color: editable ? theme.primary : theme.textSecondary,
              flex: 1,
            }}
          >
            {editable
              ? "검토 전까지 주관 기관, 등급, 공식 링크와 요청 사유를 보완할 수 있어요."
              : canManageRequestDetails
                ? "제작 단계가 시작된 요청은 정보가 잠겨요. 추가 변경은 운영 검토가 필요합니다."
                : "서버 요청 수정·취소 API가 연결되면 이 화면에서 정보를 보완할 수 있어요."}
          </ThemedText>
        </View>

        <ThemedView type="backgroundElement" style={styles.formCard}>
          <View style={styles.fixedField}>
            <ThemedText type="smallBold">시험명</ThemedText>
            <View
              style={[
                styles.fixedValue,
                { backgroundColor: theme.backgroundSelected },
              ]}
            >
              <ThemedText>{request.examName}</ThemedText>
            </View>
          </View>
          <DetailField
            label="주관 기관"
            value={organization}
            onChangeText={setOrganization}
            placeholder="시험 주관 기관"
            editable={editable}
          />
          <DetailField
            label="등급·과목"
            value={level}
            onChangeText={setLevel}
            placeholder="필기, 1급, 희망 과목"
            editable={editable}
          />
          <DetailField
            label="공식 안내 링크"
            value={officialUrl}
            onChangeText={setOfficialUrl}
            placeholder="https://"
            editable={editable}
            keyboardType="url"
          />
          <DetailField
            label="공부하려는 이유·보완 정보"
            value={reason}
            onChangeText={setReason}
            placeholder="시험 일정이나 필요한 학습 범위"
            editable={editable}
            multiline
          />
        </ThemedView>

        {(successMessage ?? errorMessage) != null && (
          <View
            style={[
              styles.messageBox,
              {
                backgroundColor:
                  successMessage != null ? theme.successSoft : theme.dangerSoft,
              },
            ]}
          >
            <SymbolView
              tintColor={successMessage != null ? theme.success : theme.danger}
              name={{
                ios:
                  successMessage != null
                    ? "checkmark.circle.fill"
                    : "exclamationmark.circle.fill",
                android: successMessage != null ? "check_circle" : "error",
                web: successMessage != null ? "check_circle" : "error",
              }}
              size={18}
            />
            <ThemedText
              type="small"
              style={{
                color: successMessage != null ? theme.success : theme.danger,
              }}
            >
              {successMessage ?? errorMessage}
            </ThemedText>
          </View>
        )}

        {editable && (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: !canSave }}
              disabled={!canSave}
              onPress={() => void saveRequest()}
              style={({ pressed }) => [
                styles.saveButton,
                {
                  backgroundColor: canSave
                    ? theme.primary
                    : theme.backgroundSelected,
                },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText
                type="smallBold"
                style={{
                  color: canSave ? theme.onPrimary : theme.textSecondary,
                }}
              >
                {isSaving ? "정보 저장 중..." : "보완 정보 저장"}
              </ThemedText>
            </Pressable>

            {!isCancelConfirming ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsCancelConfirming(true)}
                style={({ pressed }) => [
                  styles.cancelLink,
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.danger }}>
                  이 시험 요청 취소
                </ThemedText>
              </Pressable>
            ) : (
              <View
                style={[
                  styles.cancelCard,
                  { backgroundColor: theme.dangerSoft },
                ]}
              >
                <View style={styles.cancelCopy}>
                  <ThemedText type="smallBold" style={{ color: theme.danger }}>
                    요청을 취소할까요?
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    취소 후에는 공감 집계에서 제외되며 다시 수정할 수 없어요.
                  </ThemedText>
                </View>
                <View style={styles.cancelActions}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setIsCancelConfirming(false)}
                    style={({ pressed }) => [
                      styles.cancelButton,
                      { backgroundColor: theme.backgroundElement },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText type="smallBold">계속 유지</ThemedText>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void confirmCancel()}
                    style={({ pressed }) => [
                      styles.cancelButton,
                      { backgroundColor: theme.danger },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{ color: theme.onPrimary }}
                    >
                      요청 취소
                    </ThemedText>
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// 시험 요청 상세 관리 화면
export default function ExamRequestDetailScreen() {
  const params = useLocalSearchParams<{ requestId: string }>();
  const { requests, isLoading, loadRequestHistory } = useExamRequests();
  const [history, setHistory] = useState<ExamRequestStatusHistoryRow[]>([]);
  const request = requests.find((item) => item.id === params.requestId);
  const theme = useTheme();

  // 요청 상태 변경 이력 로드
  useEffect(() => {
    if (request == null) return;
    let active = true;
    void loadRequestHistory(request.id).then((items) => {
      if (active) setHistory(items);
    });
    return () => {
      active = false;
    };
  }, [loadRequestHistory, request]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {request != null ? (
          <RequestDetailForm request={request} history={history} />
        ) : (
          <View style={styles.notFound}>
            <View
              style={[
                styles.notFoundIcon,
                { backgroundColor: theme.primarySoft },
              ]}
            >
              <ThemedText style={styles.notFoundEmoji}>🔎</ThemedText>
            </View>
            <ThemedText type="smallBold">
              {isLoading ? "요청을 불러오는 중..." : "요청을 찾지 못했어요"}
            </ThemedText>
            {!isLoading && (
              <Pressable
                accessibilityRole="button"
                onPress={() => router.back()}
                style={({ pressed }) => [
                  styles.notFoundButton,
                  { backgroundColor: theme.primary },
                  pressed && styles.pressed,
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
                  요청 목록으로 돌아가기
                </ThemedText>
              </Pressable>
            )}
          </View>
        )}
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
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  statusNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  formCard: {
    gap: Spacing.four,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  fixedField: {
    gap: Spacing.two,
  },
  fixedValue: {
    minHeight: 50,
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    minHeight: 50,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
    fontSize: 16,
    lineHeight: 22,
  },
  textarea: {
    minHeight: 112,
    paddingTop: Spacing.three,
  },
  readOnlyInput: {
    opacity: 0.72,
  },
  messageBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  saveButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  cancelLink: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelCard: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  cancelCopy: {
    gap: Spacing.one,
  },
  cancelActions: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  cancelButton: {
    minHeight: 44,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    padding: Spacing.four,
  },
  notFoundIcon: {
    width: 70,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 35,
  },
  notFoundEmoji: {
    fontSize: 32,
    lineHeight: 40,
  },
  notFoundButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.medium,
  },
  pressed: {
    opacity: 0.72,
  },
});
