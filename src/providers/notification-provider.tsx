import type { NotificationRow } from "../../packages/contracts/src";
import { AppState } from "react-native";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import { examPlatformApi } from "@/repositories/exam-platform-api";
import { subscribeLocalNotifications } from "@/repositories/local-notification-store";

interface NotificationContextValue {
  notifications: NotificationRow[];
  unreadCount: number;
  isLoading: boolean;
  errorMessage: string | null;
  reload: () => Promise<void>;
  markAsRead: (notificationId: number) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(
  null,
);

// 인앱 알림 상태 제공
export function NotificationProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 인앱 알림 목록 갱신
  const reload = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (isSupabaseConfigured && user == null) setNotifications([]);
      else setNotifications(await examPlatformApi.listMyNotifications());
    } catch {
      setErrorMessage("알림을 불러오지 못했어요.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // 인앱 알림 초기 로드
  useEffect(() => {
    let active = true;

    // 저장 알림 목록 반영
    const hydrate = async () => {
      try {
        const storedNotifications =
          isSupabaseConfigured && user == null
            ? []
            : await examPlatformApi.listMyNotifications();
        if (active) setNotifications(storedNotifications);
      } catch {
        if (active) setErrorMessage("알림을 불러오지 못했어요.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, [user]);

  // 로컬 알림 변경 즉시 반영
  useEffect(
    () =>
      isSupabaseConfigured
        ? undefined
        : subscribeLocalNotifications(setNotifications),
    [],
  );

  // 앱 복귀 시 인앱 알림 목록 갱신
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void reload();
    });
    return () => subscription.remove();
  }, [reload]);

  // 인앱 알림 읽음 처리
  const markAsRead = useCallback(async (notificationId: number) => {
    try {
      await examPlatformApi.markNotificationRead(notificationId);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? { ...notification, read_at: new Date().toISOString() }
            : notification,
        ),
      );
    } catch {
      setErrorMessage("알림 읽음 상태를 변경하지 못했어요.");
    }
  }, []);

  const unreadCount = useMemo(
    () =>
      notifications.filter((notification) => notification.read_at == null)
        .length,
    [notifications],
  );
  const value = useMemo(
    () => ({
      notifications,
      unreadCount,
      isLoading,
      errorMessage,
      reload,
      markAsRead,
    }),
    [errorMessage, isLoading, markAsRead, notifications, reload, unreadCount],
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// 인앱 알림 상태 사용
export function useNotificationContext(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (context == null)
    throw new Error("NotificationProvider 내부에서 사용해야 합니다.");
  return context;
}
