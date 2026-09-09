import {
  invalidateLearningExtras,
  settleLearningExtras,
  synchronizeLearningExtras,
} from "@/sync/learning-extras";
import type { User } from "@supabase/supabase-js";
import * as SplashScreen from "expo-splash-screen";
import {
  createContext,
  Fragment,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  AppState,
  Pressable,
  Text,
  View,
} from "react-native";

import { AUTH_CALLBACK_URL } from "@/constants/auth";
import { LEGAL_VERSION } from "@/constants/legal";
import { captureHandledError } from "@/lib/monitoring";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import {
  registerDevicePushToken,
  unregisterDevicePushToken,
} from "@/notifications/push-registration";
import { deleteMyAccount } from "@/repositories/account-repository";
import { learningSyncApi } from "@/repositories/learning-sync-api";
import {
  markDeletedAccount,
  beginAccountDeletion,
  loadAccountDeletionRequest,
  completeAccountDeletion,
  recoverDeletedAccount,
  switchAccountVault,
} from "@/storage/account-vault";
import { loadPendingLearningAttempts } from "@/storage/pending-learning-attempt-store";
import {
  hydrateRemoteLearningData,
  invalidateRemoteLearningHydration,
} from "@/sync/hydrate-remote-learning-data";
import { invalidateLearningAttemptSync } from "@/sync/learning-attempt-sync";
import { flushMigratedLearningData } from "@/sync/migrate-local-learning-data";

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
  signUp: (
    email: string,
    password: string,
    accepted: boolean,
  ) => Promise<AuthActionResult>;
  requestPasswordReset: (email: string) => Promise<boolean>;
  resendConfirmation: (email: string) => Promise<boolean>;
  completeAuthCallback: (url: string) => Promise<AuthCallbackResult>;
  updatePassword: (password: string) => Promise<boolean>;
  deleteAccount: () => Promise<boolean>;
  signOut: () => Promise<void>;
  clearMessage: () => void;
  reloadLocalData: () => void;
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
  await synchronizeLearningExtras(userId);
}

// 사용자 인증 상태 제공
export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(supabase != null);
  const [vaultReady, setVaultReady] = useState(false);
  const [vaultError, setVaultError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const transitionRef = useRef(Promise.resolve());
  const deletingRef = useRef(false);
  const deletedUserRef = useRef<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // 계정 보관함 준비 후 인증 상태 공개
  useEffect(() => {
    const client = supabase;
    let active = true;
    // 계정 전환 중 기록 노출 차단
    const transition = (nextUser: AuthUser | null) => {
      if (deletingRef.current) return;
      setVaultReady(false);
      setIsLoading(true);
      invalidateLearningExtras();
      invalidateRemoteLearningHydration();
      invalidateLearningAttemptSync();
      transitionRef.current = transitionRef.current
        .catch(() => undefined)
        .then(async () => {
          await new Promise<void>((resolve) => setTimeout(resolve, 0));
          await settleLearningExtras();
          const requestedOwner = await loadAccountDeletionRequest();
          let deletionRecovered = await recoverDeletedAccount();
          if (
            !deletionRecovered &&
            requestedOwner != null &&
            requestedOwner === nextUser?.id
          ) {
            await deleteMyAccount();
            await markDeletedAccount(requestedOwner);
            deletionRecovered = await recoverDeletedAccount();
          }
          if (!deletionRecovered && requestedOwner != null && nextUser == null)
            setMessage(
              "이전 계정 삭제 결과를 확인하지 못했어요. 로그인 후 다시 확인해 주세요.",
            );
          if (deletionRecovered) {
            deletingRef.current = true;
            try {
              const result = await client?.auth.signOut({ scope: "local" });
              if (result?.error) throw result.error;
              await completeAccountDeletion();
              nextUser = null;
            } finally {
              deletingRef.current = false;
            }
          }
          await switchAccountVault(nextUser?.id ?? null);
          if (!active) return;
          activeUserIdRef.current = nextUser?.id ?? null;
          setUser(nextUser);
          setVaultError(false);
          setVaultReady(true);
          setIsLoading(false);
          if (nextUser != null)
            void synchronizeLearningData(nextUser.id).catch((error) =>
              captureHandledError(error, "learning-sync"),
            );
        })
        .catch((error) => {
          captureHandledError(error, "account-transition");
          if (active) {
            setVaultError(true);
            setIsLoading(false);
            void SplashScreen.hideAsync();
          }
        });
    };
    if (client == null) {
      transition(null);
      return () => {
        active = false;
      };
    }
    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" || event === "USER_UPDATED") return;
      const nextUser = session == null ? null : toAuthUser(session.user);
      if (
        event !== "INITIAL_SESSION" &&
        nextUser?.id === activeUserIdRef.current
      )
        return;
      setTimeout(() => {
        if (active) transition(nextUser);
      }, 0);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [retryCount]);

  // 앱 복귀 시 계정 학습 기록 동기화
  useEffect(() => {
    if (user == null || learningSyncApi == null) return;
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background")
        void synchronizeLearningExtras(user.id).catch((error) =>
          captureHandledError(error, "extras-background"),
        );
      if (state === "active") {
        void synchronizeLearningData(user.id).catch(() => undefined);
        void registerDevicePushToken();
      }
    });
    const timer = setInterval(() => {
      void synchronizeLearningExtras(user.id).catch((error) =>
        captureHandledError(error, "extras-periodic"),
      );
    }, 60_000);
    return () => {
      subscription.remove();
      clearInterval(timer);
    };
  }, [user]);

  // 로그인 사용자 푸시 토큰 등록
  useEffect(() => {
    if (user != null) void registerDevicePushToken();
  }, [user]);

  // 이메일 로그인
  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthActionResult> => {
      try {
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
      } catch (error) {
        captureHandledError(error, "auth-signIn");
        setMessage("연결 상태를 확인한 뒤 다시 시도해 주세요.");
        return "failed";
      }
    },
    [],
  );

  // 이메일 회원가입
  const signUp = useCallback(
    async (
      email: string,
      password: string,
      accepted: boolean,
    ): Promise<AuthActionResult> => {
      try {
        if (!accepted) {
          setMessage("만 14세 이상 여부와 약관 동의가 필요해요.");
          return "failed";
        }
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
            data: {
              age_over_14: true,
              legal_version: LEGAL_VERSION,
              legal_accepted_at: new Date().toISOString(),
            },
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
      } catch (error) {
        captureHandledError(error, "auth-signUp");
        setMessage("연결 상태를 확인한 뒤 다시 시도해 주세요.");
        return "failed";
      }
    },
    [],
  );

  // 비밀번호 재설정 메일 발송
  const requestPasswordReset = useCallback(
    async (email: string): Promise<boolean> => {
      try {
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
      } catch (error) {
        captureHandledError(error, "auth-requestPasswordReset");
        setMessage("연결 상태를 확인한 뒤 다시 시도해 주세요.");
        return false;
      }
    },
    [],
  );

  // 회원가입 확인 메일 재발송
  const resendConfirmation = useCallback(
    async (email: string): Promise<boolean> => {
      try {
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
          setMessage(
            "인증 메일을 보내지 못했어요. 잠시 후 다시 시도해 주세요.",
          );
          return false;
        }
        setMessage("새 인증 링크를 이메일로 보냈어요.");
        return true;
      } catch (error) {
        captureHandledError(error, "auth-resendConfirmation");
        setMessage("연결 상태를 확인한 뒤 다시 시도해 주세요.");
        return false;
      }
    },
    [],
  );

  // 인증 딥링크 세션 복구
  const completeAuthCallback = useCallback(
    async (url: string): Promise<AuthCallbackResult> => {
      try {
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
      } catch (error) {
        captureHandledError(error, "auth-completeAuthCallback");
        setMessage("연결 상태를 확인한 뒤 다시 시도해 주세요.");
        return "failed";
      }
    },
    [],
  );

  // 인증 사용자 비밀번호 변경
  const updatePassword = useCallback(
    async (password: string): Promise<boolean> => {
      try {
        if (supabase == null) return false;
        setMessage(null);
        const { error } = await supabase.auth.updateUser({ password });
        if (error != null) {
          setMessage("비밀번호를 변경하지 못했어요. 다시 시도해 주세요.");
          return false;
        }
        setMessage("비밀번호가 변경됐어요.");
        return true;
      } catch (error) {
        captureHandledError(error, "auth-updatePassword");
        setMessage("연결 상태를 확인한 뒤 다시 시도해 주세요.");
        return false;
      }
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
    deletingRef.current = true;
    try {
      if (deletedUserRef.current == null) {
        const deletingUser = activeUserIdRef.current;
        if (deletingUser == null) return false;
        await beginAccountDeletion(deletingUser);
        await deleteMyAccount();
        deletedUserRef.current = deletingUser;
      }
      setVaultReady(false);
      invalidateRemoteLearningHydration();
      invalidateLearningAttemptSync();
      invalidateLearningExtras();
      await settleLearningExtras();
      await transitionRef.current;
      await markDeletedAccount(deletedUserRef.current);
      await recoverDeletedAccount();
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error != null) throw error;
      await completeAccountDeletion();
      activeUserIdRef.current = null;
      deletedUserRef.current = null;
      setUser(null);
      setVaultError(false);
      setVaultReady(true);
      setIsLoading(false);
      return true;
    } catch (error) {
      captureHandledError(error, "account-delete");
      if (deletedUserRef.current != null) {
        setVaultReady(false);
        setVaultError(true);
        setIsLoading(false);
        setMessage(
          "서버 계정은 삭제됐지만 기기 정리가 남았어요. 다시 시도해 주세요.",
        );
      } else {
        setMessage(
          "계정 삭제 결과를 확인하지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요.",
        );
      }
      return false;
    } finally {
      deletingRef.current = false;
    }
  }, []);

  // 사용자 로그아웃
  const signOut = useCallback(async () => {
    if (supabase == null) return;
    try {
      if (activeUserIdRef.current != null)
        await synchronizeLearningExtras(activeUserIdRef.current).catch(
          (error) => captureHandledError(error, "extras-signout"),
        );
      await unregisterDevicePushToken();
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error != null) throw error;
    } catch (error) {
      captureHandledError(error, "auth-signout");
      setMessage("로그아웃하지 못했어요. 다시 시도해 주세요.");
    }
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
      reloadLocalData: () => setRetryCount((count) => count + 1),
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

  return (
    <AuthContext.Provider value={value}>
      {vaultReady ? (
        <Fragment key={user?.id ?? "guest"}>{children}</Fragment>
      ) : (
        <View>
          <ActivityIndicator accessibilityLabel="계정 기록 준비 중" />
          {vaultError && (
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                deletedUserRef.current != null
                  ? void deleteAccount()
                  : setRetryCount((count) => count + 1)
              }
            >
              <Text>기록을 안전하게 열지 못했어요. 다시 시도</Text>
            </Pressable>
          )}
        </View>
      )}
    </AuthContext.Provider>
  );
}

// 사용자 인증 상태 사용
export function useAuthContext(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context == null)
    throw new Error("AuthProvider 내부에서 사용해야 합니다.");
  return context;
}
