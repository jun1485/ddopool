import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Radius, Shadows, Spacing } from "@/constants/theme";
import { useExamCatalog } from "@/hooks/use-exam-catalog";
import { useExamEnrollment } from "@/hooks/use-exam-enrollment";
import { useSettings } from "@/hooks/use-settings";
import { useTheme } from "@/hooks/use-theme";

const DAILY_GOALS = [10, 20, 30] as const;

// 첫 학습 시험·목표 선택 화면
export default function OnboardingScreen() {
  const { exams, isLoading } = useExamCatalog();
  const { examIds, completeOnboarding } = useExamEnrollment();
  const { settings, updateSettings } = useSettings();
  const [selectedExamIds, setSelectedExamIds] = useState<string[]>(examIds);
  const [dailyGoal, setDailyGoal] = useState(settings.dailyGoal);
  const [searchText, setSearchText] = useState("");
  const theme = useTheme();
  const searchQuery = searchText.trim().toLocaleLowerCase("ko-KR");
  const filteredExams = useMemo(
    () =>
      exams.filter((exam) =>
        [exam.title, exam.shortTitle, exam.description, exam.subjects.join(" ")]
          .join(" ")
          .toLocaleLowerCase("ko-KR")
          .includes(searchQuery),
      ),
    [exams, searchQuery],
  );

  // 준비 시험 선택 전환
  const toggleExam = (examId: string) => {
    setSelectedExamIds((current) =>
      current.includes(examId)
        ? current.filter((id) => id !== examId)
        : [...current, examId],
    );
  };

  // 첫 학습 설정 완료
  const finishOnboarding = () => {
    if (selectedExamIds.length === 0) return;
    updateSettings({ dailyGoal });
    completeOnboarding(selectedExamIds);
    router.replace("/");
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.brand}>
            <View
              style={[styles.brandIcon, { backgroundColor: theme.primarySoft }]}
            >
              <ThemedText style={styles.brandEmoji}>∞</ThemedText>
            </View>
            <ThemedText type="smallBold" style={{ color: theme.primary }}>
              EXAM LOOP
            </ThemedText>
          </View>

          <Animated.View
            entering={FadeInDown.duration(350)}
            style={styles.hero}
          >
            <ThemedText type="subtitle" style={styles.heroTitle}>
              어떤 시험을{"\n"}준비하고 있나요?
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.heroCopy}>
              준비 중인 시험을 고르면 문제와 복습 일정을 내 목표에 맞춰 구성해
              드려요. 여러 개를 선택해도 괜찮아요.
            </ThemedText>
          </Animated.View>

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
              accessibilityLabel="준비 시험 검색"
              value={searchText}
              onChangeText={setSearchText}
              placeholder="시험명이나 과목으로 검색"
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

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <ThemedText style={styles.sectionTitle}>준비할 시험</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {selectedExamIds.length > 0
                    ? `${selectedExamIds.length}개 선택됨`
                    : "한 개 이상 선택해 주세요"}
                </ThemedText>
              </View>
              {selectedExamIds.length > 0 && (
                <View
                  style={[
                    styles.countBadge,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <ThemedText style={styles.countText}>
                    {selectedExamIds.length}
                  </ThemedText>
                </View>
              )}
            </View>

            {isLoading ? (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.loadingText}
              >
                시험 목록을 불러오는 중...
              </ThemedText>
            ) : filteredExams.length > 0 ? (
              <View style={styles.examList}>
                {filteredExams.map((exam, index) => {
                  const selected = selectedExamIds.includes(exam.id);
                  return (
                    <Animated.View
                      key={exam.id}
                      entering={FadeInDown.delay(index * 55).duration(280)}
                    >
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        accessibilityLabel={`${exam.title} 선택`}
                        onPress={() => toggleExam(exam.id)}
                        style={({ pressed }) => [
                          styles.examCard,
                          {
                            backgroundColor: selected
                              ? theme.primarySoft
                              : theme.backgroundElement,
                            borderColor: selected
                              ? theme.primary
                              : theme.border,
                          },
                          pressed && styles.pressed,
                        ]}
                      >
                        <View
                          style={[
                            styles.examIcon,
                            {
                              backgroundColor: selected
                                ? theme.backgroundElement
                                : theme.backgroundSelected,
                            },
                          ]}
                        >
                          <ThemedText style={styles.examEmoji}>
                            {exam.icon}
                          </ThemedText>
                        </View>
                        <View style={styles.examCopy}>
                          <ThemedText type="smallBold">{exam.title}</ThemedText>
                          <ThemedText
                            type="small"
                            themeColor="textSecondary"
                            numberOfLines={2}
                          >
                            {exam.description}
                          </ThemedText>
                        </View>
                        <View
                          style={[
                            styles.check,
                            {
                              backgroundColor: selected
                                ? theme.primary
                                : "transparent",
                              borderColor: selected
                                ? theme.primary
                                : theme.border,
                            },
                          ]}
                        >
                          {selected && (
                            <SymbolView
                              tintColor={theme.onPrimary}
                              name={{
                                ios: "checkmark",
                                android: "check",
                                web: "check",
                              }}
                              size={16}
                            />
                          )}
                        </View>
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            ) : (
              <View
                style={[
                  styles.requestCard,
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
                      ios: "paperplane.fill",
                      android: "send",
                      web: "send",
                    }}
                    size={22}
                  />
                </View>
                <View style={styles.requestCopy}>
                  <ThemedText type="smallBold">
                    “{searchText.trim()}” 시험이 아직 없어요
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    추가 요청을 보내면 검토·문제 준비 상태를 확인할 수 있어요.
                  </ThemedText>
                </View>
                <Pressable
                  accessibilityRole="button"
                  onPress={() =>
                    router.push({
                      pathname: "/exam-request",
                      params: {
                        name: searchText.trim(),
                        returnTo: "onboarding",
                      },
                    })
                  }
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
                </Pressable>
              </View>
            )}
          </View>

          <View style={styles.section}>
            <View>
              <ThemedText style={styles.sectionTitle}>
                하루 학습 목표
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                부담 없이 매일 이어갈 수 있는 양을 골라보세요
              </ThemedText>
            </View>
            <View style={styles.goalRow}>
              {DAILY_GOALS.map((goal) => {
                const selected = dailyGoal === goal;
                return (
                  <Pressable
                    key={goal}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => setDailyGoal(goal)}
                    style={({ pressed }) => [
                      styles.goalButton,
                      {
                        backgroundColor: selected
                          ? theme.primary
                          : theme.backgroundElement,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                      pressed && styles.pressed,
                    ]}
                  >
                    <ThemedText
                      style={[
                        styles.goalValue,
                        { color: selected ? theme.onPrimary : theme.text },
                      ]}
                    >
                      {goal}
                    </ThemedText>
                    <ThemedText
                      type="small"
                      style={{
                        color: selected
                          ? "rgba(255, 255, 255, 0.76)"
                          : theme.textSecondary,
                      }}
                    >
                      문제
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: selectedExamIds.length === 0 }}
            disabled={selectedExamIds.length === 0}
            onPress={finishOnboarding}
            style={({ pressed }) => [
              styles.startButton,
              {
                backgroundColor:
                  selectedExamIds.length > 0
                    ? theme.primary
                    : theme.backgroundSelected,
              },
              pressed && styles.pressed,
            ]}
          >
            <ThemedText
              type="smallBold"
              style={{
                color:
                  selectedExamIds.length > 0
                    ? theme.onPrimary
                    : theme.textSecondary,
              }}
            >
              내 학습 시작하기
            </ThemedText>
            <SymbolView
              tintColor={
                selectedExamIds.length > 0
                  ? theme.onPrimary
                  : theme.textSecondary
              }
              name={{
                ios: "arrow.right",
                android: "arrow_forward",
                web: "arrow_forward",
              }}
              size={18}
            />
          </Pressable>
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
  content: {
    paddingHorizontal: Spacing.four,
    paddingTop: Platform.OS === "web" ? Spacing.four : Spacing.two,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  brandIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.small,
  },
  brandEmoji: {
    color: "#6657E8",
    fontSize: 25,
    lineHeight: 29,
    fontWeight: 700,
  },
  hero: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  heroTitle: {
    fontSize: 36,
    lineHeight: 46,
    fontWeight: 700,
  },
  heroCopy: {
    maxWidth: 560,
  },
  searchBox: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  searchInput: {
    minWidth: 0,
    flex: 1,
    paddingVertical: Spacing.two,
    fontSize: 16,
    lineHeight: 22,
  },
  section: {
    gap: Spacing.three,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 19,
    lineHeight: 27,
    fontWeight: 700,
  },
  countBadge: {
    minWidth: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  countText: {
    color: "#FFFFFF",
    fontSize: 14,
    lineHeight: 18,
    fontWeight: 700,
  },
  loadingText: {
    paddingVertical: Spacing.four,
    textAlign: "center",
  },
  examList: {
    gap: Spacing.two,
  },
  examCard: {
    minHeight: 84,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  examIcon: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  examEmoji: {
    fontSize: 24,
    lineHeight: 31,
  },
  examCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.half,
  },
  check: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: Radius.pill,
  },
  requestCard: {
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.four,
    borderWidth: 1,
    borderRadius: Radius.large,
  },
  requestIcon: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  requestCopy: {
    alignItems: "center",
    gap: Spacing.one,
  },
  requestButton: {
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    borderRadius: Radius.medium,
  },
  goalRow: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  goalButton: {
    minHeight: 76,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  goalValue: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: 700,
  },
  startButton: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    marginTop: Spacing.two,
    borderRadius: Radius.medium,
  },
  pressed: {
    opacity: 0.72,
  },
});
