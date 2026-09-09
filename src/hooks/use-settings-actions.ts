import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  invalidateLearningExtras,
  settleLearningExtras,
} from "@/sync/learning-extras";
import { supabase } from "@/lib/supabase";
import {
  chooseLearningBackup,
  restoreLearningBackup,
  shareLearningBackup,
} from "@/storage/learning-backup-file";
import Constants from "expo-constants";
import { router } from "expo-router";
import { useState } from "react";
import { Platform } from "react-native";

import { useAuth } from "@/hooks/use-auth";
import { useLearningSyncStatus } from "@/hooks/use-learning-sync-status";
import { useSettings } from "@/hooks/use-settings";
import { openSupportEmail } from "@/lib/external-links";
import type { StudyReminderResult } from "@/notifications/study-reminder";
import { updateStudyReminder } from "@/notifications/study-reminder";
import { clearAchievements } from "@/storage/achievement-store";
import { clearActiveQuizSession } from "@/storage/active-quiz-session-store";
import { clearBookmarks } from "@/storage/bookmark-store";
import { clearCustomSessionPresets } from "@/storage/custom-session-preset-store";
import { createLearningDataExport } from "@/storage/learning-data-export";
import { clearLearningSessionHistory } from "@/storage/learning-session-history-store";
import { clearMockExamHistory } from "@/storage/mock-exam-history-store";
import { clearPendingLearningAttempts } from "@/storage/pending-learning-attempt-store";
import { clearSrsCards } from "@/storage/srs-store";
import { clearDailyStats } from "@/storage/stats-store";
import { clearStudyTarget } from "@/storage/study-target-store";
import { clearWrongAnswerNotes } from "@/storage/wrong-answer-note-store";
import { invalidateRemoteLearningHydration } from "@/sync/hydrate-remote-learning-data";
import { invalidateLearningAttemptSync } from "@/sync/learning-attempt-sync";
import { clearLearningSyncOutbox } from "@/sync/learning-sync-outbox";
import { clearLocalLearningMigration } from "@/sync/migrate-local-learning-data";

// 학습 리마인더 처리 결과 문구 생성
function getReminderResultMessage(result: StudyReminderResult): string {
  if (result === "scheduled")
    return "미학습일에 하루 최대 4회 알려드려요. 한 문제를 풀면 오늘 알림은 멈춰요.";
  if (result === "disabled") return "학습 리마인더를 껐어요.";
  if (result === "denied")
    return "알림 권한이 꺼져 있어 기기 설정에서 허용이 필요해요.";
  if (result === "unsupported")
    return "이 브라우저는 알림을 지원하지 않아요. 아이폰은 홈 화면에 추가한 또풀에서 열어 주세요.";
  return "리마인더를 변경하지 못했어요. 다시 시도해 주세요.";
}

// 설정 변경·기록 관리 동작 제공
export function useSettingsActions() {
  // 요청 숨김·작성자 차단 전체 해제
  const resetRequestVisibility = async () => {
    if (supabase == null) return;
    try {
      const { error } = await supabase.rpc("reset_request_visibility");
      if (error) throw error;
      reloadLocalData();
    } catch {
      setInformationMessage(
        "숨김 설정을 해제하지 못했어요. 다시 시도해 주세요.",
      );
    }
  };
  const { settings, updateSettings, resetSettings } = useSettings();
  const { user, isConfigured, deleteAccount, reloadLocalData } = useAuth();
  const {
    pendingCount,
    pendingAttemptCount,
    failedEnqueueCount,
    isSyncing,
    syncMessage,
    isSyncAvailable,
    synchronize,
  } = useLearningSyncStatus();
  const [resetArmed, setResetArmed] = useState(false);
  const [resetDone, setResetDone] = useState(false);
  const [reminderUpdating, setReminderUpdating] = useState(false);
  const [reminderMessage, setReminderMessage] = useState<string | null>(null);
  const [pendingBackup, setPendingBackup] = useState<string | null>(null);
  const [exportingData, setExportingData] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [accountDeleteMessage, setAccountDeleteMessage] = useState<
    string | null
  >(null);
  const [informationMessage, setInformationMessage] = useState<string | null>(
    null,
  );
  const canSynchronize = user != null && isSyncAvailable && !isSyncing;
  const pendingChangeCount = pendingCount + pendingAttemptCount;
  const syncIssueCount = pendingChangeCount + failedEnqueueCount;

  // 사용자 계정 삭제 2단계 확인 처리
  const handleDeleteAccountPress = async () => {
    if (user == null || deletingAccount) return;
    if (!deleteArmed) {
      setDeleteArmed(true);
      setAccountDeleteMessage(
        "계정과 서버 학습 기록이 모두 삭제돼요. 한 번 더 눌러 확정해 주세요.",
      );
      return;
    }
    setDeletingAccount(true);
    setAccountDeleteMessage(null);
    let deleted = false;
    try {
      deleted = await deleteAccount();
    } finally {
      setDeletingAccount(false);
    }
    if (deleted) {
      router.replace("/onboarding");
      return;
    }
    setDeleteArmed(false);
    setAccountDeleteMessage(
      "삭제하지 못했어요. 로그인과 학습 기록은 유지됐으니 다시 시도해 주세요.",
    );
  };

  // 설정 고객 문의 메일 열기
  const handleSupportPress = async () => {
    setInformationMessage(null);
    try {
      const opened = await openSupportEmail();
      if (!opened) setInformationMessage("문의 이메일을 준비 중이에요.");
    } catch {
      setInformationMessage("메일 앱을 열지 못했어요. 다시 시도해 주세요.");
    }
  };

  // 학습 리마인더 사용 상태 변경
  const handleReminderToggle = async (enabled: boolean) => {
    if (reminderUpdating) return;
    setReminderUpdating(true);
    try {
      const result = await updateStudyReminder(
        enabled,
        settings.studyReminderHour,
      );
      if (!enabled || result === "scheduled" || result === "disabled")
        updateSettings({ studyReminderEnabled: enabled });
      if (result === "denied") updateSettings({ studyReminderEnabled: false });
      setReminderMessage(getReminderResultMessage(result));
    } catch {
      setReminderMessage("알림 설정을 변경하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setReminderUpdating(false);
    }
  };

  // 학습 리마인더 시간 변경
  const selectReminderHour = async (hour: number) => {
    if (!settings.studyReminderEnabled) {
      updateSettings({ studyReminderHour: hour });
      return;
    }
    setReminderUpdating(true);
    try {
      const result = await updateStudyReminder(
        true,
        hour,
        Platform.OS !== "web",
      );
      if (
        result === "scheduled" ||
        (Platform.OS === "web" &&
          (result === "disabled" || result === "denied" || supabase == null))
      )
        updateSettings({ studyReminderHour: hour });
      setReminderMessage(getReminderResultMessage(result));
    } catch {
      setReminderMessage("알림 설정을 변경하지 못했어요. 다시 시도해 주세요.");
    } finally {
      setReminderUpdating(false);
    }
  };

  // 학습 기록 수동 동기화
  const handleSyncPress = async () => {
    if (canSynchronize) await synchronize();
  };

  // 개인 학습 데이터 JSON 내보내기
  const handleDataExport = async () => {
    if (exportingData) return;
    setExportingData(true);
    setExportMessage(null);

    try {
      const json = await createLearningDataExport(
        Constants.expoConfig?.version ?? "1.0.0",
        Date.now(),
      );
      await shareLearningBackup(json);
      setExportMessage("백업 파일 저장 화면을 열었어요.");
    } catch {
      setExportMessage("학습 데이터를 내보내지 못했어요. 다시 시도해 주세요.");
    } finally {
      setExportingData(false);
    }
  };

  // 백업 복원 전 교체 확인
  const handleDataImport = async () => {
    if (user != null || exportingData) return;
    setExportingData(true);
    try {
      if (pendingBackup == null) {
        const json = await chooseLearningBackup();
        setPendingBackup(json);
        if (json != null)
          setExportMessage(
            "현재 비회원 기록을 교체합니다. 필요하면 먼저 내보낸 뒤 다시 눌러 복원을 확정해 주세요.",
          );
      } else {
        await restoreLearningBackup(pendingBackup);
        setPendingBackup(null);
        reloadLocalData();
      }
    } catch {
      setExportMessage(
        "복원하지 못했어요. 백업 형식과 동기화 대기 기록을 확인해 주세요.",
      );
    } finally {
      setExportingData(false);
    }
  };

  // 앱 설정·학습 리마인더 기본값 복원
  const handleResetSettings = async () => {
    try {
      await updateStudyReminder(false, settings.studyReminderHour);
      resetSettings();
      setReminderMessage("설정과 학습 리마인더가 기본값으로 복원됐어요.");
    } catch {
      setReminderMessage("기본값을 복원하지 못했어요. 다시 시도해 주세요.");
    }
  };

  // 학습 데이터 초기화 2단계 확인 처리
  const handleResetPress = async () => {
    if (!resetArmed) {
      setResetArmed(true);
      setResetDone(false);
      return;
    }
    try {
      invalidateLearningExtras();
      await settleLearningExtras();
      invalidateRemoteLearningHydration();
      invalidateLearningAttemptSync();
      await Promise.all([
        clearSrsCards(),
        clearDailyStats(),
        clearBookmarks(),
        clearAchievements(),
        clearActiveQuizSession(),
        clearCustomSessionPresets(),
        clearLearningSessionHistory(),
        clearMockExamHistory(),
        clearWrongAnswerNotes(),
        clearStudyTarget(),
        clearLearningSyncOutbox(),
        clearPendingLearningAttempts(),
        clearLocalLearningMigration(),
      ]);
      await AsyncStorage.removeItem("exam-loop:learning-extras-baseline:v1");
      setResetArmed(false);
      setResetDone(true);
    } catch {
      setInformationMessage(
        "일부 기기 기록을 정리하지 못했어요. 다시 시도해 주세요.",
      );
      setResetDone(false);
    }
  };

  return {
    resetRequestVisibility,
    settings,
    updateSettings,
    user,
    isConfigured,
    pendingCount,
    pendingAttemptCount,
    failedEnqueueCount,
    isSyncing,
    syncMessage,
    isSyncAvailable,
    resetArmed,
    resetDone,
    reminderUpdating,
    reminderMessage,
    exportingData,
    exportMessage,
    deleteArmed,
    deletingAccount,
    accountDeleteMessage,
    informationMessage,
    canSynchronize,
    pendingChangeCount,
    syncIssueCount,
    pendingBackup,
    handleDeleteAccountPress,
    handleSupportPress,
    handleReminderToggle,
    selectReminderHour,
    handleSyncPress,
    handleDataExport,
    handleDataImport,
    handleResetSettings,
    handleResetPress,
  };
}
