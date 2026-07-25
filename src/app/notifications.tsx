import type { NotificationRow } from "../../packages/contracts/src";
import { router, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback } from "react";
import { Platform, ScrollView, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { MaxContentWidth, Radius, Shadows, Spacing } from "@/constants/theme";
import { useNotifications } from "@/hooks/use-notifications";
import { useTheme } from "@/hooks/use-theme";

// 알림 생성 시각 표시
function formatNotificationDate(createdAt: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(createdAt));
}

// 알림 유형별 표시 내용 생성
function getNotificationContent(notification: NotificationRow): {
  title: string;
  description: string;
  emoji: string;
} {
  const examName = notification.payload.display_name ?? "요청한 시험";
  return notification.type === "exam_published"
    ? {
        title: `${examName} 학습이 열렸어요`,
        description: "내 시험에 추가하고 새 문제은행 학습을 시작해 보세요.",
        emoji: "🎉",
      }
    : {
        title: `${examName} 요청 소식이 도착했어요`,
        description:
          "상세 화면에서 운영 검토와 문제 준비 단계를 확인해 보세요.",
        emoji: "📮",
      };
}

// 인앱 알림 목록 화면
export default function NotificationsScreen() {
  const {
    notifications,
    unreadCount,
    isLoading,
    errorMessage,
    reload,
    markAsRead,
  } = useNotifications();
  const theme = useTheme();

  // 화면 포커스 시 알림 갱신
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  // 모든 알림 읽음 처리
  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(
      (notification) => notification.read_at == null,
    );
    await Promise.all(
      unreadNotifications.map((notification) => markAsRead(notification.id)),
    );
  };

  // 알림 대상 화면 진입
  const openNotification = async (notification: NotificationRow) => {
    if (notification.read_at == null) await markAsRead(notification.id);
    if (
      notification.type === "request_status_changed" &&
      notification.payload.request_id != null
    ) {
      router.push({
        pathname: "/request/[requestId]",
        params: { requestId: notification.payload.request_id },
      });
      return;
    }
    router.push("/catalog");
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="이전 화면"
            onPress={() => router.back()}
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
            <ThemedText type="smallBold">알림</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              요청과 시험 공개 소식
            </ThemedText>
          </View>
          {unreadCount > 0 ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void markAllAsRead()}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <ThemedText type="smallBold" style={{ color: theme.primary }}>
                모두 읽음
              </ThemedText>
            </Pressable>
          ) : (
            <View style={styles.iconButton} />
          )}
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <View>
              <ThemedText type="subtitle">새로운 소식</ThemedText>
              <ThemedText themeColor="textSecondary">
                {unreadCount > 0
                  ? `읽지 않은 알림 ${unreadCount}개`
                  : "새로 확인할 알림이 없어요"}
              </ThemedText>
            </View>
            <View
              style={[
                styles.headerIcon,
                { backgroundColor: theme.primarySoft },
              ]}
            >
              <SymbolView
                tintColor={theme.primary}
                name={{
                  ios: "bell.fill",
                  android: "notifications",
                  web: "notifications",
                }}
                size={26}
              />
            </View>
          </View>

          {errorMessage != null && (
            <View
              style={[styles.errorBox, { backgroundColor: theme.dangerSoft }]}
            >
              <ThemedText type="small" style={{ color: theme.danger }}>
                {errorMessage}
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => void reload()}
              >
                <ThemedText type="smallBold" style={{ color: theme.danger }}>
                  다시 시도
                </ThemedText>
              </Pressable>
            </View>
          )}

          {isLoading && notifications.length === 0 ? (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.loadingText}
            >
              알림을 불러오는 중...
            </ThemedText>
          ) : notifications.length > 0 ? (
            <View style={styles.notificationList}>
              {notifications.map((notification, index) => {
                const content = getNotificationContent(notification);
                const unread = notification.read_at == null;
                return (
                  <Animated.View
                    key={notification.id}
                    entering={FadeInDown.delay(index * 45).duration(260)}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={content.title}
                      onPress={() => void openNotification(notification)}
                      style={({ pressed }) => [
                        styles.notificationCard,
                        {
                          backgroundColor: unread
                            ? theme.primarySoft
                            : theme.backgroundElement,
                          borderColor: unread ? theme.primary : theme.border,
                        },
                        pressed && styles.pressed,
                      ]}
                    >
                      <View
                        style={[
                          styles.notificationIcon,
                          { backgroundColor: theme.backgroundElement },
                        ]}
                      >
                        <ThemedText style={styles.notificationEmoji}>
                          {content.emoji}
                        </ThemedText>
                      </View>
                      <View style={styles.notificationCopy}>
                        <View style={styles.notificationTitleRow}>
                          <ThemedText
                            type="smallBold"
                            style={styles.notificationTitle}
                          >
                            {content.title}
                          </ThemedText>
                          {unread && (
                            <View
                              style={[
                                styles.unreadDot,
                                { backgroundColor: theme.primary },
                              ]}
                            />
                          )}
                        </View>
                        <ThemedText type="small" themeColor="textSecondary">
                          {content.description}
                        </ThemedText>
                        <ThemedText
                          type="small"
                          themeColor="textSecondary"
                          style={styles.notificationDate}
                        >
                          {formatNotificationDate(notification.created_at)}
                        </ThemedText>
                      </View>
                      <SymbolView
                        tintColor={theme.textSecondary}
                        name={{
                          ios: "chevron.right",
                          android: "chevron_right",
                          web: "chevron_right",
                        }}
                        size={18}
                      />
                    </Pressable>
                  </Animated.View>
                );
              })}
            </View>
          ) : (
            <ThemedView type="backgroundElement" style={styles.emptyCard}>
              <View
                style={[
                  styles.emptyIcon,
                  { backgroundColor: theme.primarySoft },
                ]}
              >
                <ThemedText style={styles.emptyEmoji}>🔔</ThemedText>
              </View>
              <ThemedText type="smallBold">
                아직 도착한 알림이 없어요
              </ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.emptyDescription}
              >
                시험 요청 상태가 바뀌거나 새 문제은행이 공개되면 이곳에서
                알려드려요.
              </ThemedText>
            </ThemedView>
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
    minHeight: 68,
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
  content: {
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
    paddingTop: Spacing.two,
  },
  headerIcon: {
    width: 54,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  loadingText: {
    paddingVertical: Spacing.five,
    textAlign: "center",
  },
  notificationList: {
    gap: Spacing.two,
  },
  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  notificationIcon: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  notificationEmoji: {
    fontSize: 25,
    lineHeight: 32,
  },
  notificationCopy: {
    minWidth: 0,
    flex: 1,
    gap: Spacing.one,
  },
  notificationTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  notificationTitle: {
    minWidth: 0,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
  notificationDate: {
    paddingTop: Spacing.half,
    fontSize: 12,
    lineHeight: 16,
  },
  emptyCard: {
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.five,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  emptyIcon: {
    width: 70,
    height: 70,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.one,
    borderRadius: 35,
  },
  emptyEmoji: {
    fontSize: 32,
    lineHeight: 40,
  },
  emptyDescription: {
    maxWidth: 420,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.72,
  },
});
