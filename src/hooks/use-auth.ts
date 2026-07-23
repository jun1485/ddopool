import { useAuthContext } from "@/providers/auth-provider";

// 사용자 인증 상태 연결
export function useAuth() {
  return useAuthContext();
}
