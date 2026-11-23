import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useExamCatalog } from "@/hooks/use-exam-catalog";

interface RefreshContextValue {
  // 당겨서 새로고침할 때마다 늘어나는 번호, 처음은 0
  refreshKey: number;
  refreshing: boolean;
  refresh: () => void;
}

// 새로고침 표시를 최소한 보여 줄 시간
const MIN_SPIN_MS = 600;

const RefreshContext = createContext<RefreshContextValue | null>(null);

// 당겨서 새로고침 공용 상태
export function RefreshProvider({ children }: { children: ReactNode }) {
  const { reload } = useExamCatalog();
  const [refreshKey, setRefreshKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 시험 목록 다시 받기와 새로고침 표시 종료
  const refresh = useCallback(() => {
    if (refreshing) return;
    const startedAt = Date.now();
    setRefreshing(true);
    setRefreshKey((key) => key + 1);
    void reload().finally(() => {
      timer.current = setTimeout(
        () => setRefreshing(false),
        Math.max(MIN_SPIN_MS - (Date.now() - startedAt), 0),
      );
    });
  }, [refreshing, reload]);

  useEffect(
    () => () => {
      if (timer.current != null) clearTimeout(timer.current);
    },
    [],
  );

  const value = useMemo(
    () => ({ refreshKey, refreshing, refresh }),
    [refreshKey, refreshing, refresh],
  );
  return (
    <RefreshContext.Provider value={value}>{children}</RefreshContext.Provider>
  );
}

// 당겨서 새로고침 상태 접근
export function useRefresh(): RefreshContextValue {
  const value = useContext(RefreshContext);
  if (value == null) throw new Error("RefreshProvider 밖에서 useRefresh 호출");
  return value;
}
