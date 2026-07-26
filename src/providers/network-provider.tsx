import NetInfo from "@react-native-community/netinfo";
import {
  createContext,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { Radius, Shadows, Spacing } from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import { learningSyncApi } from "@/repositories/learning-sync-api";
import { flushMigratedLearningData } from "@/sync/migrate-local-learning-data";

interface NetworkContextValue {
  isOffline: boolean;
}

const NetworkContext = createContext<NetworkContextValue | null>(null);

// 네트워크 상태와 온라인 복귀 동기화 제공
export function NetworkProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [isOffline, setIsOffline] = useState(false);
  const initializedRef = useRef(false);
  const wasOfflineRef = useRef(false);

  // 네트워크 상태 변경·온라인 복귀 처리
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const nextOffline =
        state.isConnected === false || state.isInternetReachable === false;
      setIsOffline(nextOffline);

      if (!initializedRef.current) {
        initializedRef.current = true;
        wasOfflineRef.current = nextOffline;
        return;
      }

      if (
        wasOfflineRef.current &&
        !nextOffline &&
        user != null &&
        learningSyncApi != null
      )
        void flushMigratedLearningData(learningSyncApi, user.id).catch(
          () => undefined,
        );
      wasOfflineRef.current = nextOffline;
    });
    return unsubscribe;
  }, [user]);

  return (
    <NetworkContext.Provider value={{ isOffline }}>
      {children}
    </NetworkContext.Provider>
  );
}

// 현재 오프라인 상태 사용
function useNetworkStatus(): NetworkContextValue {
  const context = useContext(NetworkContext);
  if (context == null)
    throw new Error("NetworkProvider 내부에서 사용해야 합니다.");
  return context;
}

// 전역 오프라인 안내 배너 표시
export function OfflineBanner() {
  const { isOffline } = useNetworkStatus();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  if (!isOffline) return null;

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.banner,
        {
          top: insets.top + Spacing.one,
          backgroundColor: theme.warningSoft,
          borderColor: theme.warning,
        },
      ]}
    >
      <ThemedText type="smallBold" style={{ color: theme.warning }}>
        오프라인 모드 · 연결되면 학습 기록을 자동 동기화해요
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    right: Spacing.three,
    left: Spacing.three,
    zIndex: 100,
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
    ...Shadows.soft,
  },
});
