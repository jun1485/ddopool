import { useEffect, useState } from "react";
import { toDateKey } from "@/storage/stats-store";
import { useSettingsActions } from "@/hooks/use-settings-actions";
import { WebReminderControls } from "@/components/web-reminder-controls";
import Constants from "expo-constants";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Platform, StyleSheet, Switch, View } from "react-native";
import Animated, {
  FadeInDown,
  useReducedMotion,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { PageHead } from "@/components/page-head";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Radius, Shadows, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { goBack } from "@/lib/navigation";
import {
  formatStudyReminderTime,
  STUDY_REMINDER_HOURS,
} from "@/notifications/study-reminder";
import {
  DAILY_GOAL_OPTIONS,
  MOCK_DURATION_OPTIONS,
  SESSION_SIZE_OPTIONS,
  THEME_OPTIONS,
  WEEKLY_GOAL_OPTIONS,
} from "@/storage/settings-store";

// 설정 화면
export default function SettingsScreen() {
  const theme = useTheme();
  const [today, setToday] = useState(() => toDateKey(Date.now()));
  // 자정 이후 휴식 버튼 날짜 갱신
  useEffect(() => {
    const timer = setInterval(() => setToday(toDateKey(Date.now())), 60_000);
    return () => clearInterval(timer);
  }, []);
  const reduceMotion = useReducedMotion();
  const {
    resetRequestVisibility,
    settings,
    updateSettings,
    user,
    isConfigured,
    failedEnqueueCount,
    isSyncing,
    syncMessage,
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
  } = useSettingsActions();
  return (
    <ThemedView style={styles.container}>
      <PageHead title="설정" noIndex />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View>
            <ThemedText type="subtitle">설정</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              나에게 맞는 학습 환경을 만들어요
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="설정 닫기"
            onPress={() => goBack()}
            hitSlop={Spacing.two}
            style={({ pressed }) => [
              styles.closeButton,
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              tintColor={theme.text}
              name={{ ios: "xmark", android: "close", web: "close" }}
              size={19}
            />
          </Pressable>
        </View>

        <Animated.ScrollView
          entering={reduceMotion ? undefined : FadeInDown.duration(320)}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <SymbolView
                  tintColor={theme.primary}
                  name={{
                    ios: "person.crop.circle.fill",
                    android: "account_circle",
                    web: "account_circle",
                  }}
                  size={18}
                />
              </View>
              <ThemedText type="smallBold">계정</ThemedText>
            </View>
            <ThemedView type="backgroundElement" style={styles.sectionCard}>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push("/login")}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <View style={styles.row}>
                  <View style={styles.rowTexts}>
                    <ThemedText>
                      {user != null ? "연결된 계정" : "학습 계정 연결"}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {user?.email ??
                        (isConfigured
                          ? "로그인하고 여러 기기에서 기록 동기화"
                          : "서버 설정 전에도 로컬 학습은 계속 가능")}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.accountBadge,
                      {
                        backgroundColor:
                          user != null
                            ? theme.successSoft
                            : theme.backgroundSelected,
                      },
                    ]}
                  >
                    <SymbolView
                      tintColor={
                        user != null ? theme.success : theme.textSecondary
                      }
                      name={{
                        ios:
                          user != null
                            ? "checkmark.circle.fill"
                            : "chevron.right",
                        android:
                          user != null ? "check_circle" : "chevron_right",
                        web: user != null ? "check_circle" : "chevron_right",
                      }}
                      size={19}
                    />
                  </View>
                </View>
              </Pressable>

              {user != null && (
                <>
                  <View
                    style={[
                      styles.separator,
                      { backgroundColor: theme.border },
                    ]}
                  />
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={
                      deleteArmed ? "계정 삭제 최종 확인" : "계정 삭제"
                    }
                    accessibilityState={{ disabled: deletingAccount }}
                    disabled={deletingAccount}
                    onPress={() => void handleDeleteAccountPress()}
                    style={({ pressed }) => pressed && styles.pressed}
                  >
                    <View style={styles.row}>
                      <View style={styles.rowTexts}>
                        <ThemedText style={{ color: theme.danger }}>
                          {deletingAccount
                            ? "계정 삭제 중..."
                            : deleteArmed
                              ? "한 번 더 누르면 계정이 삭제돼요"
                              : "계정 삭제"}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          계정, 학습 기록, 요청, 공감과 신고 기록 전체 삭제
                        </ThemedText>
                      </View>
                      <SymbolView
                        tintColor={theme.danger}
                        name={{
                          ios: "person.crop.circle.badge.minus",
                          android: "person_remove",
                          web: "person_remove",
                        }}
                        size={19}
                      />
                    </View>
                  </Pressable>
                  {accountDeleteMessage != null && (
                    <View style={styles.exportMessage}>
                      <ThemedText
                        type="small"
                        style={{
                          color: deleteArmed ? theme.warning : theme.danger,
                        }}
                      >
                        {accountDeleteMessage}
                      </ThemedText>
                    </View>
                  )}
                </>
              )}
            </ThemedView>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: theme.warningSoft },
                ]}
              >
                <SymbolView
                  tintColor={theme.warning}
                  name={{
                    ios: "bell.badge.fill",
                    android: "notifications_active",
                    web: "notifications_active",
                  }}
                  size={18}
                />
              </View>
              <ThemedText type="smallBold">학습 리마인더</ThemedText>
            </View>
            <ThemedView type="backgroundElement" style={styles.sectionCard}>
              <View style={styles.row}>
                <View style={styles.rowTexts}>
                  <ThemedText>매일 학습 알림</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {Platform.OS === "web"
                      ? "아래에서 웹 알림을 연결해 주세요"
                      : settings.studyReminderEnabled
                        ? `${formatStudyReminderTime(settings.studyReminderHour)}부터 최대 ${settings.reminderDailyLimit}회 · 오후 9시부터 마감 알림 · 풀이 후 중단`
                        : "필요할 때만 직접 켜는 선택형 알림"}
                  </ThemedText>
                </View>
                {Platform.OS !== "web" && (
                  <Switch
                    accessibilityLabel="매일 학습 알림"
                    accessibilityState={{
                      disabled: reminderUpdating,
                    }}
                    disabled={reminderUpdating}
                    value={settings.studyReminderEnabled}
                    onValueChange={(value) => void handleReminderToggle(value)}
                    trackColor={{
                      false: theme.backgroundSelected,
                      true: theme.primary,
                    }}
                  />
                )}
              </View>

              <View
                style={[styles.separator, { backgroundColor: theme.border }]}
              />

              <View style={styles.blockRow}>
                <View style={styles.rowTexts}>
                  <ThemedText>알림 시간</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    생활 패턴에 맞는 시간 선택
                  </ThemedText>
                </View>
                <View style={styles.chipRow}>
                  {STUDY_REMINDER_HOURS.map((hour) => {
                    const isSelected = settings.studyReminderHour === hour;
                    return (
                      <Pressable
                        key={hour}
                        accessibilityRole="radio"
                        accessibilityState={{
                          checked: isSelected,
                          disabled: reminderUpdating,
                        }}
                        disabled={reminderUpdating}
                        onPress={() => void selectReminderHour(hour)}
                        style={({ pressed }) => pressed && styles.pressed}
                      >
                        <View
                          style={[
                            styles.chip,
                            {
                              backgroundColor: isSelected
                                ? theme.primary
                                : theme.backgroundSelected,
                            },
                          ]}
                        >
                          <ThemedText
                            type="smallBold"
                            style={{
                              color: isSelected
                                ? theme.onPrimary
                                : theme.textSecondary,
                            }}
                          >
                            {formatStudyReminderTime(hour)}
                          </ThemedText>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View style={styles.blockRow}>
                <ThemedText>하루 최대 알림</ThemedText>
                <View style={styles.chipRow}>
                  {[1, 2, 4].map((limit) => (
                    <Pressable
                      key={limit}
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: settings.reminderDailyLimit === limit,
                      }}
                      onPress={() =>
                        updateSettings({ reminderDailyLimit: limit })
                      }
                      style={styles.chip}
                    >
                      <ThemedText>
                        {limit}회
                        {settings.reminderDailyLimit === limit ? " ✓" : ""}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
                <ThemedText>조용한 시간 시작</ThemedText>
                <View style={styles.chipRow}>
                  {[21, 23, 24].map((hour) => (
                    <Pressable
                      key={hour}
                      accessibilityRole="radio"
                      accessibilityState={{
                        checked: settings.reminderQuietHour === hour,
                      }}
                      onPress={() =>
                        updateSettings({ reminderQuietHour: hour })
                      }
                      style={styles.chip}
                    >
                      <ThemedText>
                        {hour === 24 ? "자정" : hour + "시"}
                        {settings.reminderQuietHour === hour ? " ✓" : ""}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
                <Pressable
                  accessibilityRole="button"
                  style={styles.chip}
                  onPress={() =>
                    updateSettings({
                      reminderPausedDate:
                        settings.reminderPausedDate === today
                          ? ""
                          : toDateKey(Date.now()),
                    })
                  }
                >
                  <ThemedText>
                    {settings.reminderPausedDate === today
                      ? "오늘 알림 다시 받기"
                      : "오늘은 알림 쉬기"}
                  </ThemedText>
                </Pressable>
                <ThemedText type="small" themeColor="textSecondary">
                  설정 시간부터 순서대로 보내며, 조용한 시간 이후에는 보내지
                  않아요. 쉬기는 내일 자동으로 끝나요.
                </ThemedText>
              </View>
              <WebReminderControls />
              {reminderMessage != null && (
                <>
                  <View
                    style={[
                      styles.separator,
                      { backgroundColor: theme.border },
                    ]}
                  />
                  <View style={styles.row}>
                    <ThemedText
                      type="small"
                      style={{
                        color:
                          reminderMessage.includes("예약") ||
                          reminderMessage.includes("복원")
                            ? theme.success
                            : theme.warning,
                      }}
                    >
                      {reminderMessage}
                    </ThemedText>
                  </View>
                </>
              )}
            </ThemedView>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <SymbolView
                  tintColor={theme.primary}
                  name={{
                    ios: "paintpalette.fill",
                    android: "palette",
                    web: "palette",
                  }}
                  size={18}
                />
              </View>
              <ThemedText type="smallBold">화면</ThemedText>
            </View>
            <ThemedView type="backgroundElement" style={styles.sectionCard}>
              <View style={styles.blockRow}>
                <View style={styles.rowTexts}>
                  <ThemedText>화면 테마</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    시스템 설정을 따르거나 직접 선택
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.segmentGroup,
                    { backgroundColor: theme.backgroundSelected },
                  ]}
                >
                  {THEME_OPTIONS.map((option) => {
                    const isSelected =
                      settings.themePreference === option.value;
                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}
                        aria-checked={isSelected}
                        onPress={() =>
                          updateSettings({ themePreference: option.value })
                        }
                        style={({ pressed }) => [
                          styles.segment,
                          isSelected && {
                            backgroundColor: theme.backgroundElement,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <ThemedText
                          type="smallBold"
                          style={{
                            color: isSelected
                              ? theme.primary
                              : theme.textSecondary,
                          }}
                        >
                          {option.label}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ThemedView>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: theme.successSoft },
                ]}
              >
                <SymbolView
                  tintColor={theme.success}
                  name={{
                    ios: "target",
                    android: "track_changes",
                    web: "track_changes",
                  }}
                  size={18}
                />
              </View>
              <ThemedText type="smallBold">학습 목표</ThemedText>
            </View>
            <ThemedView type="backgroundElement" style={styles.sectionCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="시험일 학습 계획 설정"
                onPress={() => router.push("./study-plan-settings")}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <View style={styles.row}>
                  <View style={styles.rowTexts}>
                    <ThemedText>시험일 학습 계획</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      남은 기간과 문제 수로 하루 권장량 계산
                    </ThemedText>
                  </View>
                  <SymbolView
                    tintColor={theme.primary}
                    name={{
                      ios: "calendar.badge.clock",
                      android: "event_upcoming",
                      web: "event_upcoming",
                    }}
                    size={20}
                  />
                </View>
              </Pressable>

              <View
                style={[styles.separator, { backgroundColor: theme.border }]}
              />

              <View style={styles.blockRow}>
                <View style={styles.rowTexts}>
                  <ThemedText>하루 목표</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    홈에서 매일 진행률 표시
                  </ThemedText>
                </View>
                <View style={styles.chipRow}>
                  {DAILY_GOAL_OPTIONS.map((goal) => {
                    const isSelected = settings.dailyGoal === goal;
                    return (
                      <Pressable
                        key={goal}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}
                        aria-checked={isSelected}
                        onPress={() => updateSettings({ dailyGoal: goal })}
                        style={({ pressed }) => pressed && styles.pressed}
                      >
                        <View
                          style={[
                            styles.chip,
                            {
                              backgroundColor: isSelected
                                ? theme.primary
                                : theme.backgroundSelected,
                            },
                          ]}
                        >
                          <ThemedText
                            type="smallBold"
                            style={{
                              color: isSelected
                                ? theme.onPrimary
                                : theme.textSecondary,
                            }}
                          >
                            {goal}
                          </ThemedText>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View
                style={[styles.separator, { backgroundColor: theme.border }]}
              />

              <View style={styles.blockRow}>
                <View style={styles.rowTexts}>
                  <ThemedText>주간 목표</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    월요일부터 일요일까지 풀 문제 수
                  </ThemedText>
                </View>
                <View style={styles.chipRow}>
                  {WEEKLY_GOAL_OPTIONS.map((goal) => {
                    const isSelected = settings.weeklyGoal === goal;
                    return (
                      <Pressable
                        key={goal}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}
                        aria-checked={isSelected}
                        onPress={() => updateSettings({ weeklyGoal: goal })}
                        style={({ pressed }) => pressed && styles.pressed}
                      >
                        <View
                          style={[
                            styles.chip,
                            {
                              backgroundColor: isSelected
                                ? theme.primary
                                : theme.backgroundSelected,
                            },
                          ]}
                        >
                          <ThemedText
                            type="smallBold"
                            style={{
                              color: isSelected
                                ? theme.onPrimary
                                : theme.textSecondary,
                            }}
                          >
                            {goal}
                          </ThemedText>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View
                style={[styles.separator, { backgroundColor: theme.border }]}
              />

              <View style={styles.blockRow}>
                <View style={styles.rowTexts}>
                  <ThemedText>세션 문항 수</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    한 번에 풀 문제 수
                  </ThemedText>
                </View>
                <View style={styles.chipRow}>
                  {SESSION_SIZE_OPTIONS.map((size) => {
                    const isSelected = settings.sessionSize === size;
                    return (
                      <Pressable
                        key={size}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}
                        aria-checked={isSelected}
                        onPress={() => updateSettings({ sessionSize: size })}
                        style={({ pressed }) => pressed && styles.pressed}
                      >
                        <View
                          style={[
                            styles.chip,
                            {
                              backgroundColor: isSelected
                                ? theme.primary
                                : theme.backgroundSelected,
                            },
                          ]}
                        >
                          <ThemedText
                            type="smallBold"
                            style={{
                              color: isSelected
                                ? theme.onPrimary
                                : theme.textSecondary,
                            }}
                          >
                            {size}
                          </ThemedText>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              <View
                style={[styles.separator, { backgroundColor: theme.border }]}
              />

              <View style={styles.blockRow}>
                <View style={styles.rowTexts}>
                  <ThemedText>모의고사 제한 시간</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    시간이 끝나면 답안 자동 제출
                  </ThemedText>
                </View>
                <View style={styles.chipRow}>
                  {MOCK_DURATION_OPTIONS.map((minutes) => {
                    const isSelected = settings.mockDurationMinutes === minutes;
                    return (
                      <Pressable
                        key={minutes}
                        accessibilityRole="radio"
                        accessibilityState={{ checked: isSelected }}
                        aria-checked={isSelected}
                        onPress={() =>
                          updateSettings({ mockDurationMinutes: minutes })
                        }
                        style={({ pressed }) => pressed && styles.pressed}
                      >
                        <View
                          style={[
                            styles.chip,
                            {
                              backgroundColor: isSelected
                                ? theme.primary
                                : theme.backgroundSelected,
                            },
                          ]}
                        >
                          <ThemedText
                            type="smallBold"
                            style={{
                              color: isSelected
                                ? theme.onPrimary
                                : theme.textSecondary,
                            }}
                          >
                            {minutes}분
                          </ThemedText>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            </ThemedView>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: theme.warningSoft },
                ]}
              >
                <SymbolView
                  tintColor={theme.warning}
                  name={{
                    ios: "slider.horizontal.3",
                    android: "tune",
                    web: "tune",
                  }}
                  size={18}
                />
              </View>
              <ThemedText type="smallBold">문제 구성</ThemedText>
            </View>
            <ThemedView type="backgroundElement" style={styles.sectionCard}>
              <View style={styles.row}>
                <View style={styles.rowTexts}>
                  <ThemedText>맞춤 문제 추천</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    복습 일정과 취약 과목을 우선해 문제 구성
                  </ThemedText>
                </View>
                <Switch
                  accessibilityLabel="맞춤 문제 추천"
                  value={settings.personalizedQuestionsEnabled}
                  onValueChange={(value) =>
                    updateSettings({ personalizedQuestionsEnabled: value })
                  }
                  trackColor={{
                    false: theme.backgroundSelected,
                    true: theme.primary,
                  }}
                />
              </View>
              <View
                style={[styles.separator, { backgroundColor: theme.border }]}
              />
              <View style={styles.row}>
                <View style={styles.rowTexts}>
                  <ThemedText>문제 순서 섞기</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    매 세션 새로운 순서로 출제
                  </ThemedText>
                </View>
                <Switch
                  accessibilityLabel="문제 순서 섞기"
                  value={settings.shuffleQuestionsEnabled}
                  onValueChange={(value) =>
                    updateSettings({ shuffleQuestionsEnabled: value })
                  }
                  trackColor={{
                    false: theme.backgroundSelected,
                    true: theme.primary,
                  }}
                />
              </View>
              <View
                style={[styles.separator, { backgroundColor: theme.border }]}
              />
              <View style={styles.row}>
                <View style={styles.rowTexts}>
                  <ThemedText>보기 순서 섞기</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    위치 대신 내용을 기억하도록 구성
                  </ThemedText>
                </View>
                <Switch
                  accessibilityLabel="보기 순서 섞기"
                  value={settings.shuffleChoicesEnabled}
                  onValueChange={(value) =>
                    updateSettings({ shuffleChoicesEnabled: value })
                  }
                  trackColor={{
                    false: theme.backgroundSelected,
                    true: theme.primary,
                  }}
                />
              </View>
              <View
                style={[styles.separator, { backgroundColor: theme.border }]}
              />
              <View style={styles.row}>
                <View style={styles.rowTexts}>
                  <ThemedText>정답 해설 표시</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    채점 직후 핵심 해설 제공
                  </ThemedText>
                </View>
                <Switch
                  accessibilityLabel="정답 해설 표시"
                  value={settings.explanationEnabled}
                  onValueChange={(value) =>
                    updateSettings({ explanationEnabled: value })
                  }
                  trackColor={{
                    false: theme.backgroundSelected,
                    true: theme.primary,
                  }}
                />
              </View>
              {Platform.OS === "web" && (
                <>
                  <View
                    style={[
                      styles.separator,
                      { backgroundColor: theme.border },
                    ]}
                  />
                  <View style={styles.row}>
                    <View style={styles.rowTexts}>
                      <ThemedText>키보드 빠른 조작</ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        숫자키와 Enter로 문제 풀이
                      </ThemedText>
                    </View>
                    <Switch
                      accessibilityLabel="키보드 빠른 조작"
                      value={settings.keyboardShortcutsEnabled}
                      onValueChange={(value) =>
                        updateSettings({ keyboardShortcutsEnabled: value })
                      }
                      trackColor={{
                        false: theme.backgroundSelected,
                        true: theme.primary,
                      }}
                    />
                  </View>
                </>
              )}
            </ThemedView>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: theme.dangerSoft },
                ]}
              >
                <SymbolView
                  tintColor={theme.danger}
                  name={{
                    ios: "waveform",
                    android: "vibration",
                    web: "vibration",
                  }}
                  size={18}
                />
              </View>
              <ThemedText type="smallBold">피드백</ThemedText>
            </View>
            <ThemedView type="backgroundElement" style={styles.sectionCard}>
              <View style={styles.row}>
                <View style={styles.rowTexts}>
                  <ThemedText>햅틱 피드백</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {Platform.OS === "web"
                      ? "브라우저와 기기에 따라 동작하지 않을 수 있어요"
                      : "정답과 오답을 진동으로 구분"}
                  </ThemedText>
                </View>
                <Switch
                  accessibilityLabel="햅틱 피드백"
                  value={settings.hapticsEnabled}
                  onValueChange={(value) =>
                    updateSettings({ hapticsEnabled: value })
                  }
                  trackColor={{
                    false: theme.backgroundSelected,
                    true: theme.primary,
                  }}
                />
              </View>
            </ThemedView>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: theme.backgroundSelected },
                ]}
              >
                <SymbolView
                  tintColor={theme.textSecondary}
                  name={{
                    ios: "externaldrive.fill",
                    android: "database",
                    web: "database",
                  }}
                  size={18}
                />
              </View>
              <ThemedText type="smallBold">데이터</ThemedText>
            </View>
            <ThemedView type="backgroundElement" style={styles.sectionCard}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="학습 기록 지금 동기화"
                accessibilityState={{ disabled: !canSynchronize }}
                disabled={!canSynchronize}
                onPress={() => void handleSyncPress()}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <View style={styles.row}>
                  <View style={styles.rowTexts}>
                    <ThemedText>오프라인 동기화 대기</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {isSyncing
                        ? "학습 기록을 안전하게 합치는 중..."
                        : failedEnqueueCount > 0
                          ? `${failedEnqueueCount}개 변경 사항을 대기열에 저장하지 못했어요`
                          : pendingChangeCount > 0
                            ? user != null
                              ? `${pendingChangeCount}개 변경 사항 · 눌러서 지금 전송`
                              : `${pendingChangeCount}개 변경 사항 · 계정 연결 후 자동 전송`
                            : user != null
                              ? "최신 기록 확인을 위해 눌러서 동기화"
                              : "비회원 기록과 로그인 계정 기록은 따로 보관해요"}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.syncBadge,
                      {
                        backgroundColor:
                          syncIssueCount > 0
                            ? theme.warningSoft
                            : theme.successSoft,
                      },
                    ]}
                  >
                    <SymbolView
                      tintColor={
                        syncIssueCount > 0 ? theme.warning : theme.success
                      }
                      name={{
                        ios:
                          syncIssueCount > 0
                            ? "arrow.triangle.2.circlepath"
                            : "checkmark.icloud.fill",
                        android: syncIssueCount > 0 ? "sync" : "cloud_done",
                        web: syncIssueCount > 0 ? "sync" : "cloud_done",
                      }}
                      size={19}
                    />
                    <ThemedText
                      type="smallBold"
                      style={{
                        color:
                          syncIssueCount > 0 ? theme.warning : theme.success,
                      }}
                    >
                      {syncIssueCount}
                    </ThemedText>
                  </View>
                </View>
              </Pressable>

              {syncMessage != null && (
                <>
                  <View
                    style={[
                      styles.separator,
                      { backgroundColor: theme.border },
                    ]}
                  />
                  <View style={styles.row}>
                    <ThemedText
                      type="small"
                      style={{
                        color: syncMessage.includes("최신")
                          ? theme.success
                          : theme.warning,
                      }}
                    >
                      {syncMessage}
                    </ThemedText>
                  </View>
                </>
              )}

              <View
                style={[styles.separator, { backgroundColor: theme.border }]}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="개인 학습 데이터 JSON 내보내기"
                accessibilityState={{ disabled: exportingData }}
                disabled={exportingData}
                onPress={() => void handleDataExport()}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <View style={styles.row}>
                  <View style={styles.rowTexts}>
                    <ThemedText>
                      {exportingData
                        ? "백업 만드는 중..."
                        : "학습 데이터 내보내기"}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      인증 정보와 문제 원문을 제외한 JSON 백업
                    </ThemedText>
                  </View>
                  <SymbolView
                    tintColor={theme.textSecondary}
                    name={{
                      ios: "square.and.arrow.up",
                      android: "file_upload",
                      web: "file_upload",
                    }}
                    size={19}
                  />
                </View>
              </Pressable>

              {user != null && (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => void resetRequestVisibility()}
                >
                  <View style={styles.row}>
                    <ThemedText>요청 숨김·작성자 차단 전체 해제</ThemedText>
                  </View>
                </Pressable>
              )}
              <Pressable
                accessibilityRole="button"
                disabled={user != null || exportingData}
                onPress={() => void handleDataImport()}
              >
                <View style={styles.row}>
                  <View style={styles.rowTexts}>
                    <ThemedText>
                      {pendingBackup == null
                        ? "백업 파일 가져오기"
                        : "현재 기록 교체·복원 확정"}
                    </ThemedText>
                    <ThemedText type="small">
                      로그아웃 상태에서 비회원 기록에 복원합니다. 계정 기록은
                      교체하지 않습니다.
                    </ThemedText>
                  </View>
                </View>
              </Pressable>

              {exportMessage != null && (
                <View style={styles.exportMessage}>
                  <ThemedText
                    type="small"
                    style={{
                      color: exportMessage.includes("못했어요")
                        ? theme.danger
                        : theme.success,
                    }}
                  >
                    {exportMessage}
                  </ThemedText>
                </View>
              )}

              <View
                style={[styles.separator, { backgroundColor: theme.border }]}
              />

              <Pressable
                accessibilityRole="button"
                onPress={() => void handleResetSettings()}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <View style={styles.row}>
                  <View style={styles.rowTexts}>
                    <ThemedText>설정 기본값 복원</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      학습 기록은 유지돼요
                    </ThemedText>
                  </View>
                  <SymbolView
                    tintColor={theme.textSecondary}
                    name={{
                      ios: "arrow.counterclockwise",
                      android: "restart_alt",
                      web: "restart_alt",
                    }}
                    size={19}
                  />
                </View>
              </Pressable>

              <View
                style={[styles.separator, { backgroundColor: theme.border }]}
              />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  resetArmed
                    ? "학습 데이터 초기화 최종 확인"
                    : "이 기기 학습 데이터 초기화"
                }
                onPress={handleResetPress}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <View style={styles.row}>
                  <View style={styles.rowTexts}>
                    <ThemedText style={{ color: theme.danger }}>
                      {resetArmed
                        ? "한 번 더 누르면 삭제됩니다"
                        : user != null
                          ? "이 기기 학습 데이터 초기화"
                          : "이 기기 학습 데이터 초기화"}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {resetDone
                        ? "이 기기 기록을 비웠어요. 계정의 서버 기록은 동기화 시 다시 내려옵니다."
                        : user != null
                          ? "서버 기록은 유지되며 다음 동기화 때 다시 복원될 수 있어요"
                          : "복습 일정, 저장 문제와 학습 통계가 모두 삭제돼요"}
                    </ThemedText>
                  </View>
                  <SymbolView
                    tintColor={theme.danger}
                    name={{
                      ios: "trash",
                      android: "delete_outline",
                      web: "delete_outline",
                    }}
                    size={19}
                  />
                </View>
              </Pressable>
            </ThemedView>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionTitleRow}>
              <View
                style={[
                  styles.sectionIcon,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <SymbolView
                  tintColor={theme.primary}
                  name={{
                    ios: "info.circle.fill",
                    android: "info",
                    web: "info",
                  }}
                  size={18}
                />
              </View>
              <ThemedText type="smallBold">정보</ThemedText>
            </View>
            <ThemedView type="backgroundElement" style={styles.sectionCard}>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="개인정보처리방침 열기"
                onPress={() => router.push("/privacy")}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <View style={styles.row}>
                  <ThemedText>개인정보처리방침</ThemedText>
                  <SymbolView
                    tintColor={theme.textSecondary}
                    name={{
                      ios: "arrow.up.right",
                      android: "open_in_new",
                      web: "open_in_new",
                    }}
                    size={18}
                  />
                </View>
              </Pressable>
              <View
                style={[styles.separator, { backgroundColor: theme.border }]}
              />
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="이용약관 열기"
                onPress={() => router.push("/terms")}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <View style={styles.row}>
                  <ThemedText>이용약관</ThemedText>
                  <SymbolView
                    tintColor={theme.textSecondary}
                    name={{
                      ios: "arrow.up.right",
                      android: "open_in_new",
                      web: "open_in_new",
                    }}
                    size={18}
                  />
                </View>
              </Pressable>
              <View
                style={[styles.separator, { backgroundColor: theme.border }]}
              />
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="문의 메일 보내기"
                onPress={() => void handleSupportPress()}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <View style={styles.row}>
                  <View style={styles.rowTexts}>
                    <ThemedText>문의하기</ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      메일 앱에서 문의 내용 작성
                    </ThemedText>
                  </View>
                  <SymbolView
                    tintColor={theme.textSecondary}
                    name={{
                      ios: "envelope.fill",
                      android: "mail",
                      web: "mail",
                    }}
                    size={18}
                  />
                </View>
              </Pressable>
              {informationMessage != null && (
                <View style={styles.exportMessage}>
                  <ThemedText type="small" style={{ color: theme.warning }}>
                    {informationMessage}
                  </ThemedText>
                </View>
              )}
            </ThemedView>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.appMark}>
              <ThemedText style={styles.appMarkText}>또</ThemedText>
            </View>
            <View style={styles.infoText}>
              <ThemedText type="smallBold">또풀</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                버전 {Constants.expoConfig?.version ?? "1.0.0"} · 로컬 우선 학습
              </ThemedText>
            </View>
          </View>
        </Animated.ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    minWidth: 0,
  },
  safeArea: {
    flex: 1,
    width: "100%",
    minWidth: 0,
    maxWidth: MaxContentWidth,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.three,
  },
  closeButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
    backgroundColor: "rgba(127, 127, 127, 0.09)",
  },
  content: {
    minWidth: 0,
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.five,
  },
  section: {
    gap: Spacing.two,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.one,
  },
  sectionIcon: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.small,
  },
  sectionCard: {
    borderRadius: Radius.medium,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    ...Shadows.card,
  },
  blockRow: {
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  rowTexts: {
    flex: 1,
    gap: Spacing.half,
  },
  segmentGroup: {
    flexDirection: "row",
    gap: Spacing.one,
    padding: Spacing.one,
    borderRadius: Radius.medium,
  },
  segment: {
    flex: 1,
    alignItems: "center",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  chip: {
    minWidth: 44,
    alignItems: "center",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.twoHalf,
    borderRadius: Radius.pill,
  },
  separator: {
    height: 1,
  },
  syncBadge: {
    minWidth: 54,
    minHeight: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  exportMessage: {
    paddingBottom: Spacing.two,
  },
  accountBadge: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.pill,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.three,
  },
  appMark: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
    backgroundColor: "#51434F",
  },
  appMarkText: {
    color: "#FFFFFF",
    fontSize: 19,
    lineHeight: 26,
    fontWeight: 800,
  },
  infoText: {
    gap: Spacing.half,
  },
  pressed: {
    opacity: 0.72,
  },
});
