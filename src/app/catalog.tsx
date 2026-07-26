import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { goBack } from "@/lib/navigation";
import { ExamRequestCard } from "@/components/exam-request-card";
import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { RevealView } from "@/components/motion/reveal-view";
import { SkeletonBlock } from "@/components/motion/skeleton-block";
import { RequestTrackingOverview } from "@/components/request-tracking-overview";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { stagger, Timings } from "@/constants/motion";
import { MaxContentWidth, Radius, Shadows, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useExamCatalog } from "@/hooks/use-exam-catalog";
import { useExamEnrollment } from "@/hooks/use-exam-enrollment";
import { useExamRequests } from "@/hooks/use-exam-requests";
import { useTheme } from "@/hooks/use-theme";
import {
  matchesRequestTrackingFilter,
  summarizeRequestTracking,
} from "@/learning/exam-request-tracking";
import type { RequestTrackingFilter } from "@/learning/exam-request-tracking";
import type { Exam } from "@/types/exam";
import type { ExamRequest } from "@/types/exam-request";

type CatalogTab = "search" | "mine" | "requests";

interface CatalogTabButtonProps {
  label: string;
  selected: boolean;
  badgeCount?: number;
  onPress: () => void;
}

interface ExamCatalogCardProps {
  exam: Exam;
  enrolled: boolean;
  onToggleEnrollment: () => void;
  onStart: () => void;
}

// 시험 검색 텍스트 정규화
function normalizeSearchText(value: string): string {
  return value.trim().toLocaleLowerCase("ko-KR");
}

// 시험 검색어 일치 여부 판별
function matchesExam(exam: Exam, query: string): boolean {
  if (query.length === 0) return true;
  return [
    exam.title,
    exam.shortTitle,
    exam.description,
    exam.subjects.join(" "),
  ]
    .join(" ")
    .toLocaleLowerCase("ko-KR")
    .includes(query);
}

// 시험 요청 검색어 일치 여부 판별
function matchesRequest(request: ExamRequest, query: string): boolean {
  if (query.length === 0) return true;
  return [request.examName, request.organization, request.level]
    .join(" ")
    .toLocaleLowerCase("ko-KR")
    .includes(query);
}

// 카탈로그 상단 탭 버튼
function CatalogTabButton({
  label,
  selected,
  badgeCount = 0,
  onPress,
}: CatalogTabButtonProps) {
  const theme = useTheme();

  const reduceMotion = useReducedMotion();
  const selectProgress = useSharedValue(selected ? 1 : 0);

  // 선택 탭 전환 시 배경 보간 진행값 갱신
  useEffect(() => {
    const target = selected ? 1 : 0;
    selectProgress.value = reduceMotion
      ? target
      : withTiming(target, Timings.fast);
  }, [reduceMotion, selectProgress, selected]);

  const pillStyle = useAnimatedStyle(
    () => ({
      backgroundColor: interpolateColor(
        selectProgress.value,
        [0, 1],
        ["transparent", theme.backgroundElement],
      ),
    }),
    [theme.backgroundElement],
  );

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={styles.tabSlot}
    >
      <Animated.View style={[styles.tabButton, pillStyle]}>
        <ThemedText
          type="smallBold"
          style={{ color: selected ? theme.primary : theme.textSecondary }}
        >
          {label}
        </ThemedText>
        {badgeCount > 0 && (
          <View style={[styles.tabBadge, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.tabBadgeText}>{badgeCount}</ThemedText>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

// 시험 맞춤 세션 구성 화면 진입
function startExam(examId: string, diagnostic = false) {
  router.push({
    pathname: "./session-builder/[examId]",
    params: diagnostic ? { examId, intent: "diagnostic" } : { examId },
  });
}

// 시험 카탈로그 학습·등록 카드
function ExamCatalogCard({
  exam,
  enrolled,
  onToggleEnrollment,
  onStart,
}: ExamCatalogCardProps) {
  const theme = useTheme();

  return (
    <ThemedView type="backgroundElement" style={styles.examCard}>
      <View style={styles.examInfo}>
        <View
          style={[
            styles.examIcon,
            {
              backgroundColor: enrolled
                ? theme.primarySoft
                : theme.backgroundSelected,
            },
          ]}
        >
          <ThemedText style={styles.examEmoji}>{exam.icon}</ThemedText>
        </View>
        <View style={styles.examCopy}>
          <View style={styles.examTitleRow}>
            <ThemedText type="smallBold" style={styles.examTitle}>
              {exam.title}
            </ThemedText>
            {enrolled && (
              <View
                style={[
                  styles.enrolledBadge,
                  { backgroundColor: theme.successSoft },
                ]}
              >
                <ThemedText type="smallBold" style={{ color: theme.success }}>
                  내 시험
                </ThemedText>
              </View>
            )}
          </View>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {exam.description}
          </ThemedText>
          <View style={styles.subjectRow}>
            {exam.subjects.slice(0, 2).map((subject) => (
              <View
                key={subject}
                style={[
                  styles.subjectChip,
                  { backgroundColor: theme.backgroundSelected },
                ]}
              >
                <ThemedText type="small" themeColor="textSecondary">
                  {subject}
                </ThemedText>
              </View>
            ))}
          </View>
        </View>
      </View>
      <View style={styles.examActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            enrolled
              ? `${exam.title} 내 시험에서 삭제`
              : `${exam.title} 내 시험에 추가`
          }
          onPress={onToggleEnrollment}
          style={({ pressed }) => [
            styles.enrollmentButton,
            {
              backgroundColor: enrolled
                ? theme.backgroundSelected
                : theme.primarySoft,
            },
            pressed && styles.pressed,
          ]}
        >
          <SymbolView
            tintColor={enrolled ? theme.textSecondary : theme.primary}
            name={{
              ios: enrolled ? "minus.circle" : "plus.circle.fill",
              android: enrolled ? "remove_circle_outline" : "add_circle",
              web: enrolled ? "remove_circle_outline" : "add_circle",
            }}
            size={18}
          />
          <ThemedText
            type="smallBold"
            style={{ color: enrolled ? theme.textSecondary : theme.primary }}
          >
            {enrolled ? "내 시험에서 삭제" : "내 시험에 추가"}
          </ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${exam.title} ${
            enrolled ? "맞춤 학습 구성" : "빠른 진단 준비"
          }`}
          onPress={onStart}
          style={({ pressed }) => [
            styles.startButton,
            { backgroundColor: theme.primary },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText type="smallBold" style={{ color: theme.onPrimary }}>
            {enrolled ? "맞춤 학습" : "빠른 진단"}
          </ThemedText>
          <SymbolView
            tintColor={theme.onPrimary}
            name={{
              ios: "play.fill",
              android: "play_arrow",
              web: "play_arrow",
            }}
            size={17}
          />
        </Pressable>
      </View>
    </ThemedView>
  );
}

// 시험 검색·요청 화면
export default function CatalogScreen() {
  const params = useLocalSearchParams<{ tab?: CatalogTab }>();
  const [selectedTab, setSelectedTab] = useState<CatalogTab | null>(null);
  const [searchText, setSearchText] = useState("");
  const [requestFilter, setRequestFilter] =
    useState<RequestTrackingFilter>("all");
  const [discoveredRequests, setDiscoveredRequests] = useState<ExamRequest[]>(
    [],
  );
  const { user, isConfigured } = useAuth();
  const {
    exams,
    isLoading: isCatalogLoading,
    errorMessage: catalogErrorMessage,
    reload: reloadCatalog,
  } = useExamCatalog();
  const { examIds, addExam, toggleExam } = useExamEnrollment();
  const {
    requests,
    isLoading: isRequestsLoading,
    errorMessage,
    toggleVote,
    searchRequests,
  } = useExamRequests();
  const theme = useTheme();
  const searchQuery = normalizeSearchText(searchText);
  const activeTab =
    selectedTab ??
    (params.tab === "requests"
      ? "requests"
      : params.tab === "mine"
        ? "mine"
        : "search");
  const filteredExams = useMemo(
    () => exams.filter((exam) => matchesExam(exam, searchQuery)),
    [exams, searchQuery],
  );
  const filteredRequests = useMemo(
    () =>
      (searchQuery.length >= 2 ? discoveredRequests : requests).filter(
        (request) => matchesRequest(request, searchQuery),
      ),
    [discoveredRequests, requests, searchQuery],
  );
  const myExams = useMemo(
    () => exams.filter((exam) => examIds.includes(exam.id)),
    [examIds, exams],
  );
  const requestSummary = useMemo(
    () => summarizeRequestTracking(requests),
    [requests],
  );
  const trackedRequests = useMemo(
    () =>
      requests.filter((request) =>
        matchesRequestTrackingFilter(request, requestFilter),
      ),
    [requestFilter, requests],
  );
  const hasSearchText = searchQuery.length > 0;
  const isLoading = isCatalogLoading || isRequestsLoading;

  // 시험 요청 공감 인증·처리
  const voteRequest = (requestId: string) => {
    if (isConfigured && user == null) {
      router.push("/login");
      return;
    }
    void toggleVote(requestId);
  };

  // 시험 등록 상태 기반 첫 진단·맞춤 학습 진입
  const startCatalogExam = (examId: string, enrolled: boolean) => {
    if (!enrolled) addExam(examId);
    startExam(examId, !enrolled);
  };

  // 공개 시험 내 시험 추가·학습 진입
  const startPublishedRequest = (examId: string) => {
    addExam(examId);
    startExam(examId, true);
  };

  // 검색어 기반 전체 시험 요청 조회
  useEffect(() => {
    if (searchQuery.length < 2) return;
    let active = true;
    const timer = setTimeout(() => {
      void searchRequests(searchQuery).then((result) => {
        if (active) setDiscoveredRequests(result);
      });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [searchQuery, searchRequests]);

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이전 화면"
            onPress={() => goBack()}
            hitSlop={Spacing.two}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: theme.backgroundElement },
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
              size={22}
            />
          </Pressable>
          <View style={styles.topTitle}>
            <ThemedText type="smallBold">시험 카탈로그</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              찾고, 없으면 요청하세요
            </ThemedText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="새 시험 요청"
            onPress={() => {
              setSelectedTab(null);
              router.push("/exam-request");
            }}
            hitSlop={Spacing.two}
            style={({ pressed }) => [
              styles.iconButton,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              tintColor={theme.onPrimary}
              name={{
                ios: "plus",
                android: "add",
                web: "add",
              }}
              size={22}
            />
          </Pressable>
        </View>

        <View
          accessibilityRole="tablist"
          style={[styles.tabs, { backgroundColor: theme.backgroundSelected }]}
        >
          <CatalogTabButton
            label="시험 찾기"
            selected={activeTab === "search"}
            onPress={() => setSelectedTab("search")}
          />
          <CatalogTabButton
            label="내 시험"
            selected={activeTab === "mine"}
            badgeCount={examIds.length}
            onPress={() => setSelectedTab("mine")}
          />
          <CatalogTabButton
            label="내 요청"
            selected={activeTab === "requests"}
            badgeCount={requests.length}
            onPress={() => setSelectedTab("requests")}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {activeTab === "search" ? (
            <>
              <RevealView variant="zoom" duration={360}>
                <View style={[styles.hero, { backgroundColor: theme.primary }]}>
                  <View style={styles.heroCopy}>
                    <ThemedText type="smallBold" style={styles.heroEyebrow}>
                      원하는 시험부터 시작
                    </ThemedText>
                    <ThemedText style={styles.heroTitle}>
                      준비 중인 시험을{"\n"}검색해 보세요
                    </ThemedText>
                    <ThemedText type="small" style={styles.heroDescription}>
                      현재 {exams.length}개 시험 · 요청이 모이면 새 문제은행
                      준비
                    </ThemedText>
                  </View>
                  <View style={styles.heroIcon}>
                    <ThemedText style={styles.heroEmoji}>🎯</ThemedText>
                  </View>
                </View>
              </RevealView>

              <View
                style={[
                  styles.searchBox,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: theme.border,
                  },
                ]}
              >
                <SymbolView
                  tintColor={theme.textSecondary}
                  name={{
                    ios: "magnifyingglass",
                    android: "search",
                    web: "search",
                  }}
                  size={20}
                />
                <TextInput
                  accessibilityLabel="시험 검색"
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="시험명, 과목, 주관기관 검색"
                  placeholderTextColor={theme.textSecondary}
                  selectionColor={theme.primary}
                  returnKeyType="search"
                  style={[styles.searchInput, { color: theme.text }]}
                />
                {searchText.length > 0 && (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="검색어 지우기"
                    onPress={() => setSearchText("")}
                    hitSlop={Spacing.two}
                  >
                    <SymbolView
                      tintColor={theme.textSecondary}
                      name={{
                        ios: "xmark.circle.fill",
                        android: "cancel",
                        web: "cancel",
                      }}
                      size={20}
                    />
                  </Pressable>
                )}
              </View>

              {isLoading ? (
                <View style={styles.examList}>
                  {[0, 1, 2].map((placeholderIndex) => (
                    <SkeletonBlock
                      key={placeholderIndex}
                      height={132}
                      radius={Radius.medium}
                    />
                  ))}
                </View>
              ) : catalogErrorMessage != null ? (
                <View
                  style={[
                    styles.loadError,
                    { backgroundColor: theme.dangerSoft },
                  ]}
                >
                  <SymbolView
                    tintColor={theme.danger}
                    name={{
                      ios: "wifi.exclamationmark",
                      android: "wifi_off",
                      web: "wifi_off",
                    }}
                    size={24}
                  />
                  <ThemedText type="smallBold" style={{ color: theme.danger }}>
                    {catalogErrorMessage}
                  </ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => void reloadCatalog()}
                    style={({ pressed }) => [
                      styles.retryButton,
                      { backgroundColor: theme.backgroundElement },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{ color: theme.danger }}
                    >
                      다시 불러오기
                    </ThemedText>
                  </Pressable>
                </View>
              ) : (
                <>
                  <View style={styles.sectionHeader}>
                    <View>
                      <ThemedText style={styles.sectionTitle}>
                        {hasSearchText ? "검색 결과" : "학습 가능한 시험"}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {filteredExams.length}개 시험을 바로 학습 가능
                      </ThemedText>
                    </View>
                  </View>

                  {filteredExams.length > 0 && (
                    <View style={styles.examList}>
                      {filteredExams.map((exam, index) => (
                        <RevealView key={exam.id} delay={stagger(index, 50)}>
                          <ExamCatalogCard
                            exam={exam}
                            enrolled={examIds.includes(exam.id)}
                            onToggleEnrollment={() => toggleExam(exam.id)}
                            onStart={() =>
                              startCatalogExam(
                                exam.id,
                                examIds.includes(exam.id),
                              )
                            }
                          />
                        </RevealView>
                      ))}
                    </View>
                  )}

                  {hasSearchText && filteredRequests.length > 0 && (
                    <View style={styles.requestMatches}>
                      <View>
                        <ThemedText style={styles.sectionTitle}>
                          이미 요청된 시험
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          같은 요청에 공감하면 우선순위 판단에 반영돼요
                        </ThemedText>
                      </View>
                      {filteredRequests.map((request) => (
                        <ExamRequestCard
                          key={request.id}
                          request={request}
                          compact
                          onToggleVote={() => voteRequest(request.id)}
                        />
                      ))}
                    </View>
                  )}

                  {hasSearchText && filteredExams.length === 0 && (
                    <View
                      style={[
                        styles.requestCta,
                        {
                          backgroundColor: theme.primarySoft,
                          borderColor: theme.primary,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.requestIcon,
                          { backgroundColor: theme.backgroundElement },
                        ]}
                      >
                        <SymbolView
                          tintColor={theme.primary}
                          name={{
                            ios: "sparkles",
                            android: "auto_awesome",
                            web: "auto_awesome",
                          }}
                          size={24}
                        />
                      </View>
                      <View style={styles.requestCopy}>
                        <ThemedText type="smallBold">
                          찾는 시험이 아직 없나요?
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          “{searchText.trim()}” 시험을 요청 목록에 추가하고 진행
                          상태를 받아보세요.
                        </ThemedText>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                          setSelectedTab(null);
                          router.push({
                            pathname: "/exam-request",
                            params: { name: searchText.trim() },
                          });
                        }}
                        style={({ pressed }) => [
                          styles.requestButton,
                          { backgroundColor: theme.primary },
                          pressed && styles.pressed,
                        ]}
                      >
                        <ThemedText
                          type="smallBold"
                          style={{ color: theme.onPrimary }}
                        >
                          이 시험 요청하기
                        </ThemedText>
                        <SymbolView
                          tintColor={theme.onPrimary}
                          name={{
                            ios: "arrow.right",
                            android: "arrow_forward",
                            web: "arrow_forward",
                          }}
                          size={17}
                        />
                      </Pressable>
                    </View>
                  )}
                </>
              )}
            </>
          ) : activeTab === "mine" ? (
            <>
              <View style={styles.requestTabHeader}>
                <View>
                  <ThemedText type="subtitle">내 시험</ThemedText>
                  <ThemedText themeColor="textSecondary">
                    준비 중인 시험을 전환하거나 학습 목록에서 관리하세요.
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setSelectedTab("search")}
                  style={({ pressed }) => [
                    styles.addRequestButton,
                    { backgroundColor: theme.primary },
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    tintColor={theme.onPrimary}
                    name={{
                      ios: "plus",
                      android: "add",
                      web: "add",
                    }}
                    size={18}
                  />
                  <ThemedText
                    type="smallBold"
                    style={{ color: theme.onPrimary }}
                  >
                    시험 추가
                  </ThemedText>
                </Pressable>
              </View>

              {myExams.length > 0 ? (
                <View style={styles.examList}>
                  {myExams.map((exam, index) => (
                    <RevealView key={exam.id} delay={stagger(index, 50)}>
                      <ExamCatalogCard
                        exam={exam}
                        enrolled
                        onToggleEnrollment={() => toggleExam(exam.id)}
                        onStart={() => startCatalogExam(exam.id, true)}
                      />
                    </RevealView>
                  ))}
                </View>
              ) : (
                <ThemedView type="backgroundElement" style={styles.emptyCard}>
                  <View
                    style={[
                      styles.emptyIcon,
                      { backgroundColor: theme.primarySoft },
                    ]}
                  >
                    <ThemedText style={styles.emptyEmoji}>🗂️</ThemedText>
                  </View>
                  <ThemedText type="smallBold">
                    준비 중인 시험을 추가해 주세요
                  </ThemedText>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.emptyDescription}
                  >
                    시험을 추가하면 홈에서 빠르게 전환하고 학습률·복습 일정을
                    시험별로 관리할 수 있어요.
                  </ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setSelectedTab("search")}
                    style={({ pressed }) => [
                      styles.emptyButton,
                      { backgroundColor: theme.primary },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{ color: theme.onPrimary }}
                    >
                      시험 찾아보기
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              )}
            </>
          ) : (
            <>
              <View style={styles.requestTabHeader}>
                <View>
                  <ThemedText type="subtitle">내 시험 요청</ThemedText>
                  <ThemedText themeColor="textSecondary">
                    직접 등록한 요청과 공감한 공개 요청의 진행 상황을
                    확인하세요.
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setSelectedTab(null);
                    router.push("/exam-request");
                  }}
                  style={({ pressed }) => [
                    styles.addRequestButton,
                    { backgroundColor: theme.primary },
                    pressed && styles.pressed,
                  ]}
                >
                  <SymbolView
                    tintColor={theme.onPrimary}
                    name={{ ios: "plus", android: "add", web: "add" }}
                    size={18}
                  />
                  <ThemedText
                    type="smallBold"
                    style={{ color: theme.onPrimary }}
                  >
                    새 요청
                  </ThemedText>
                </Pressable>
              </View>

              {errorMessage != null && (
                <ThemedText type="small" style={{ color: theme.danger }}>
                  {errorMessage}
                </ThemedText>
              )}

              {requests.length > 0 ? (
                <>
                  <RequestTrackingOverview
                    summary={requestSummary}
                    selectedFilter={requestFilter}
                    onSelectFilter={setRequestFilter}
                  />
                  {trackedRequests.length > 0 ? (
                    <View style={styles.requestList}>
                      {trackedRequests.map((request, index) => (
                        <RevealView key={request.id} delay={stagger(index, 50)}>
                          <ExamRequestCard
                            request={request}
                            onToggleVote={() => voteRequest(request.id)}
                            onManage={() =>
                              router.push({
                                pathname: "/request/[requestId]",
                                params: { requestId: request.id },
                              })
                            }
                            onStartPublishedExam={startPublishedRequest}
                          />
                        </RevealView>
                      ))}
                    </View>
                  ) : (
                    <ThemedView
                      type="backgroundElement"
                      style={styles.filteredEmptyCard}
                    >
                      <ThemedText style={styles.filteredEmptyEmoji}>
                        🧹
                      </ThemedText>
                      <View style={styles.filteredEmptyCopy}>
                        <ThemedText type="smallBold">
                          이 상태의 내 요청이 없어요
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          다른 상태를 선택하면 전체 진행 상황을 볼 수 있어요.
                        </ThemedText>
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        onPress={() => setRequestFilter("all")}
                        style={({ pressed }) => [
                          styles.resetFilterButton,
                          { backgroundColor: theme.primarySoft },
                          pressed && styles.pressed,
                        ]}
                      >
                        <ThemedText
                          type="smallBold"
                          style={{ color: theme.primary }}
                        >
                          전체 보기
                        </ThemedText>
                      </Pressable>
                    </ThemedView>
                  )}
                </>
              ) : (
                <ThemedView type="backgroundElement" style={styles.emptyCard}>
                  <View
                    style={[
                      styles.emptyIcon,
                      { backgroundColor: theme.primarySoft },
                    ]}
                  >
                    <ThemedText style={styles.emptyEmoji}>📮</ThemedText>
                  </View>
                  <ThemedText type="smallBold">
                    아직 내 시험 요청이 없어요
                  </ThemedText>
                  <ThemedText
                    type="small"
                    themeColor="textSecondary"
                    style={styles.emptyDescription}
                  >
                    공부하고 싶은 시험을 요청하거나 승인된 공개 요청에 공감하면
                    진행 상황을 여기에서 볼 수 있어요.
                  </ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      setSelectedTab(null);
                      router.push("/exam-request");
                    }}
                    style={({ pressed }) => [
                      styles.emptyButton,
                      { backgroundColor: theme.primary },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText
                      type="smallBold"
                      style={{ color: theme.onPrimary }}
                    >
                      첫 시험 요청하기
                    </ThemedText>
                  </Pressable>
                </ThemedView>
              )}

              <View
                style={[
                  styles.localNotice,
                  { backgroundColor: theme.backgroundSelected },
                ]}
              >
                <SymbolView
                  tintColor={theme.textSecondary}
                  name={{
                    ios: isConfigured ? "person.crop.circle" : "iphone",
                    android: isConfigured ? "account_circle" : "smartphone",
                    web: isConfigured ? "account_circle" : "smartphone",
                  }}
                  size={18}
                />
                <ThemedText type="small" themeColor="textSecondary">
                  {isConfigured
                    ? user != null
                      ? "내 요청과 공개 요청 공감 상태가 연결된 계정에 동기화돼요."
                      : "로그인하면 내 요청과 공개 요청 공감 상태를 여러 기기에서 확인할 수 있어요."
                    : "현재 내 요청은 이 기기에 안전하게 저장돼요."}
                </ThemedText>
              </View>
            </>
          )}
        </ScrollView>
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
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === "web" ? Spacing.four : Spacing.two,
    paddingBottom: Spacing.three,
  },
  topTitle: {
    flex: 1,
    gap: Spacing.half,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  tabs: {
    flexDirection: "row",
    marginHorizontal: Spacing.four,
    padding: Spacing.one,
    borderRadius: Radius.medium,
  },
  tabSlot: {
    flex: 1,
  },
  tabButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
    borderRadius: Radius.small,
  },
  tabBadge: {
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.pill,
  },
  tabBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    lineHeight: 14,
    fontWeight: 700,
  },
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  hero: {
    minHeight: 178,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  heroCopy: {
    flex: 1,
    gap: Spacing.two,
  },
  heroEyebrow: {
    color: "rgba(255, 255, 255, 0.74)",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    lineHeight: 34,
    fontWeight: 700,
  },
  heroDescription: {
    color: "rgba(255, 255, 255, 0.78)",
  },
  heroIcon: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 44,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    transform: [{ rotate: "8deg" }],
  },
  heroEmoji: {
    fontSize: 41,
    lineHeight: 52,
  },
  searchBox: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  searchInput: {
    minWidth: 0,
    flex: 1,
    paddingVertical: Spacing.two,
    fontSize: 15,
    lineHeight: 22,
  },
  centerText: {
    paddingVertical: Spacing.five,
    textAlign: "center",
  },
  loadError: {
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.four,
    borderRadius: Radius.medium,
  },
  retryButton: {
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: 700,
  },
  examList: {
    gap: Spacing.three,
  },
  examCard: {
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  examInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  examIcon: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  examEmoji: {
    fontSize: 25,
    lineHeight: 34,
  },
  examCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.one,
  },
  examTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  examTitle: {
    minWidth: 0,
    flex: 1,
  },
  enrolledBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  subjectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.one,
    paddingTop: Spacing.half,
  },
  subjectChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Radius.pill,
  },
  examActions: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  enrollmentButton: {
    minHeight: 42,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
    borderRadius: Radius.medium,
  },
  startButton: {
    minHeight: 42,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.one,
    borderRadius: Radius.medium,
  },
  requestMatches: {
    gap: Spacing.three,
  },
  requestCta: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.large,
  },
  requestIcon: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  requestCopy: {
    gap: Spacing.one,
  },
  requestButton: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    borderRadius: Radius.medium,
  },
  requestTabHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  addRequestButton: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
  },
  requestList: {
    gap: Spacing.three,
  },
  filteredEmptyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  filteredEmptyEmoji: {
    fontSize: 24,
    lineHeight: 32,
  },
  filteredEmptyCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  resetFilterButton: {
    minHeight: 38,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
  },
  emptyCard: {
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.five,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.one,
    borderRadius: 34,
  },
  emptyEmoji: {
    fontSize: 31,
    lineHeight: 40,
  },
  emptyDescription: {
    maxWidth: 420,
    textAlign: "center",
  },
  emptyButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.medium,
  },
  localNotice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  pressed: {
    opacity: 0.7,
  },
});
