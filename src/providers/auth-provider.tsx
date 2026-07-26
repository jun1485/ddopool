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

import { AUTH_CALLBACK_URL } from "@/constants/auth";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { registerDevicePushToken } from "@/notifications/push-registration";
import { deleteMyAccount } from "@/repositories/account-repository";
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
  "authenticated" | "confirmation-required" | "failed";

export type AuthCallbackResult = "authenticated" | "recovery" | "failed";

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isConfigured: boolean;
  message: string | null;
  signIn: (email: string, password: string) => Promise<AuthActionResult>;
  signUp: (email: string, password: string) => Promise<AuthActionResult>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  resendConfirmation: (email: string) => Promise<boolean>;
  completeAuthCallback: (url: string) => Promise<AuthCallbackResult>;
  updatePassword: (password: string) => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
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
      if (state === "active") {
        void synchronizeLearningData(user.id).catch(() => undefined);
        void registerDevicePushToken();
      }
    });
    return () => subscription.remove();
  }, [user]);

  // 로그인 사용자 푸시 토큰 등록
  useEffect(() => {
    if (user != null) void registerDevicePushToken();
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${AUTH_CALLBACK_URL}?flow=signup`,
        },
      });
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

  // 비밀번호 재설정 메일 발송
  const requestPasswordReset = useCallback(
    async (email: string): Promise<boolean> => {
      if (supabase == null) {
        setMessage("계정 서버 설정 후 비밀번호를 재설정할 수 있어요.");
        return false;
      }
      setMessage(null);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${AUTH_CALLBACK_URL}?flow=recovery`,
      });
      if (error != null) {
        setMessage("재설정 메일을 보내지 못했어요. 다시 시도해 주세요.");
        return false;
      }
      setMessage("비밀번호 재설정 링크를 이메일로 보냈어요.");
      return true;
    },
    [],
  );

  // 회원가입 확인 메일 재발송
  const resendConfirmation = useCallback(
    async (email: string): Promise<boolean> => {
      if (supabase == null) {
        setMessage("계정 서버 설정 후 인증 메일을 다시 보낼 수 있어요.");
        return false;
      }
      setMessage(null);
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${AUTH_CALLBACK_URL}?flow=signup`,
        },
      });
      if (error != null) {
        setMessage("인증 메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.");
        return false;
      }
      setMessage("새 인증 링크를 이메일로 보냈어요.");
      return true;
    },
    [],
  );

  // 인증 딥링크 세션 복구
  const completeAuthCallback = useCallback(
    async (url: string): Promise<AuthCallbackResult> => {
      if (supabase == null) return "failed";
      const normalizedUrl = url.replace("#", url.includes("?") ? "&" : "?");
      const params = new URL(normalizedUrl).searchParams;
      const code = params.get("code");
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      const flow = params.get("flow");

      const result =
        code != null
          ? await supabase.auth.exchangeCodeForSession(code)
          : accessToken != null && refreshToken != null
            ? await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              })
            : null;
      if (result == null || result.error != null) {
        setMessage("인증 링크가 만료됐거나 올바르지 않아요.");
        return "failed";
      }
      setMessage(
        flow === "recovery"
          ? "새 비밀번호를 설정해 주세요."
          : "이메일 인증이 완료됐어요.",
      );
      return flow === "recovery" ? "recovery" : "authenticated";
    },
    [],
  );

  // 인증 사용자 비밀번호 변경
  const updatePassword = useCallback(
    async (password: string): Promise<boolean> => {
      if (supabase == null) return false;
      setMessage(null);
      const { error } = await supabase.auth.updateUser({ password });
      if (error != null) {
        setMessage("비밀번호를 변경하지 못했어요. 다시 시도해 주세요.");
        return false;
      }
      setMessage("비밀번호가 변경됐어요.");
      return true;
    },
    [],
  );

  // 인증 사용자 계정·로컬 학습 상태 삭제
  const deleteAccount = useCallback(async (): Promise<boolean> => {
    if (supabase == null) {
      setMessage("계정 서버 설정 후 계정을 삭제할 수 있어요.");
      return false;
    }
    setMessage(null);
    try {
      await deleteMyAccount();
    } catch {
      setMessage(
        "계정을 삭제하지 못했어요. 로그인과 학습 기록은 그대로 유지됐으니 다시 시도해 주세요.",
      );
      return false;
    }

    await clearAccountLearningData().catch(() => undefined);
    await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
    activeUserIdRef.current = null;
    setUser(null);
    setMessage(null);
    return true;
  }, []);

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
      requestPasswordReset,
      resendConfirmation,
      completeAuthCallback,
      updatePassword,
      deleteAccount,
      signOut,
      clearMessage,
    }),
    [
      clearMessage,
      completeAuthCallback,
      deleteAccount,
      isLoading,
      message,
      requestPasswordReset,
      resendConfirmation,
      signIn,
      signOut,
      signUp,
      updatePassword,
      user,
    ],
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
