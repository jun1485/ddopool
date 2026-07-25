import type { User } from "@supabase/supabase-js";
import { AppState } from "react-native";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { learningSyncApi } from "@/repositories/learning-sync-api";
import { clearActiveQuizSession } from "@/storage/active-quiz-session-store";
import { clearAchievements } from "@/storage/achievement-store";
import { clearBookmarks } from "@/storage/bookmark-store";
import { clearExamEnrollment } from "@/storage/exam-enrollment-store";
import {
  clearPendingLearningAttempts,
  loadPendingLearningAttempts,
} from "@/storage/pending-learning-attempt-store";
import { clearSrsCards } from "@/storage/srs-store";
import { clearDailyStats } from "@/storage/stats-store";
import { clearStudyTarget } from "@/storage/study-target-store";
import { clearWrongAnswerNotes } from "@/storage/wrong-answer-note-store";
import {
  hydrateRemoteLearningData,
  invalidateRemoteLearningHydration,
} from "@/sync/hydrate-remote-learning-data";
import { invalidateLearningAttemptSync } from "@/sync/learning-attempt-sync";
import { clearLearningSyncOutbox } from "@/sync/learning-sync-outbox";
import {
  clearLocalLearningMigration,
  flushMigratedLearningData,
} from "@/sync/migrate-local-learning-data";

// 인증 사용자 정보
export interface AuthUser {
  id: string;
  email: string;
}

export type AuthActionResult =
  | "authenticated"
  | "confirmation-required"
  | "failed";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isConfigured: boolean;
  message: string | null;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string) => Promise<AuthActionResult>;
  signOut: () => Promise<void>;
  clearMessage: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// Supabase 사용자 앱 정보 변환
function toAuthUser(user: User): AuthUser {
  return { id: user.id, email: user.email ?? "" };
}

// 인증 세션 사용자 일치 여부 조회
async function isActiveUser(userId: string): Promise<boolean> {
  if (supabase == null) return false;
  const { data, error } = await supabase.auth.getSession();
  return error == null && data.session?.user.id === userId;
}

// 로그인 후 대기 기록 전송·서버 학습 상태 병합
async function synchronizeLearningData(userId: string): Promise<void> {
  if (learningSyncApi == null || !(await isActiveUser(userId))) return;
  const result = await flushMigratedLearningData(learningSyncApi, userId);
  if (
    result.pendingCount > 0 ||
    (await loadPendingLearningAttempts()).length > 0 ||
    !(await isActiveUser(userId))
  )
    return;
  await hydrateRemoteLearningData(learningSyncApi);
}

// 계정 소유 로컬 학습 상태 초기화
async function clearAccountLearningData(): Promise<void> {
  invalidateRemoteLearningHydration();
  invalidateLearningAttemptSync();
  await Promise.all([
    clearLearningSyncOutbox(),
    clearLocalLearningMigration(),
    clearPendingLearningAttempts(),
    clearExamEnrollment(),
    clearSrsCards(),
    clearDailyStats(),
    clearAchievements(),
    clearBookmarks(),
    clearActiveQuizSession(),
    clearStudyTarget(),
    clearWrongAnswerNotes(),
  ]);
}

// 사용자 인증 상태 제공
export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(supabase != null);
  const [message, setMessage] = useState<string | null>(null);

  // 저장 인증 세션 초기 로드
  useEffect(() => {
    const client = supabase;
    if (client == null) return;
    let active = true;

    // 저장 인증 사용자 반영
    const hydrate = async () => {
      const { data } = await client.auth.getSession();
      if (!active) return;
      const sessionUser =
        data.session == null ? null : toAuthUser(data.session.user);
      activeUserIdRef.current = sessionUser?.id ?? null;
      setUser(sessionUser);
      setIsLoading(false);
      if (data.session != null)
        void synchronizeLearningData(data.session.user.id).catch(
          () => undefined,
        );
    };

    void hydrate();
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      const sessionUser = session == null ? null : toAuthUser(session.user);
      const previousUserId = activeUserIdRef.current;
      activeUserIdRef.current = sessionUser?.id ?? null;
      setUser(sessionUser);
      setIsLoading(false);
      if (event === "SIGNED_OUT") {
        void clearAccountLearningData().catch(() => undefined);
        return;
      }
      if (
        event === "SIGNED_IN" &&
        session != null &&
        previousUserId != null &&
        previousUserId !== session.user.id
      ) {
        void clearAccountLearningData()
          .then(() => synchronizeLearningData(session.user.id))
          .catch(() => undefined);
        return;
      }
      if (event === "SIGNED_IN" && session != null)
        setTimeout(() => {
          void synchronizeLearningData(session.user.id).catch(() => undefined);
        }, 0);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  // 앱 복귀 시 계정 학습 기록 동기화
  useEffect(() => {
    if (user == null || learningSyncApi == null) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active")
        void synchronizeLearningData(user.id).catch(() => undefined);
    });
    return () => subscription.remove();
  }, [user]);

  // 이메일 로그인
  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      if (supabase == null) {
        setMessage("계정 서버 설정 후 로그인할 수 있어요.");
        return "failed";
      }
      setMessage(null);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error != null) {
        setMessage("이메일 또는 비밀번호를 다시 확인해 주세요.");
        return "failed";
      }
      return "authenticated";
    },
    [],
  );

  // 이메일 회원가입
  const signUp = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      if (supabase == null) {
        setMessage("계정 서버 설정 후 가입할 수 있어요.");
        return "failed";
      }
      setMessage(null);
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error != null) {
        setMessage("가입 정보를 처리하지 못했어요. 입력값을 확인해 주세요.");
        return "failed";
      }
      if (data.session == null) {
        setMessage("이메일로 보낸 확인 링크를 열면 가입이 완료돼요.");
        return "confirmation-required";
      }
      return "authenticated";
    },
    [],
  );

  // 사용자 로그아웃
  const signOut = useCallback(async () => {
    if (supabase == null) return;
    const { error } = await supabase.auth.signOut();
    if (error != null) {
      setMessage("로그아웃하지 못했어요. 다시 시도해 주세요.");
      return;
    }
    activeUserIdRef.current = null;
    await clearAccountLearningData();
    setUser(null);
  }, []);

  // 인증 안내 문구 초기화
  const clearMessage = useCallback(() => {
    setMessage(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      isConfigured: isSupabaseConfigured,
      message,
      signIn,
      signUp,
      signOut,
      clearMessage,
    }),
    [clearMessage, isLoading, message, signIn, signOut, signUp, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// 사용자 인증 상태 사용
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context == null)
    throw new Error("AuthProvider 내부에서 사용해야 합니다.");
  return context;
}
