import { syncReminderPolicy } from "./reminder-policy";
import { supabase } from "@/lib/supabase";
import { loadDailyStats, toDateKey } from "@/storage/stats-store";
import type { StudyReminderResult } from "./study-reminder";

let registration: ServiceWorkerRegistration | null = null;
const TOKEN_KEY = "exam-loop:web-push-token";
let revision = 0;
let serverQueue: Promise<void> = Promise.resolve();
let disconnected = false;

export type WebReminderAvailability =
  "ready" | "install-required" | "unsupported";

// 웹 알림 사용 환경 판별
export function getWebReminderAvailability(): WebReminderAvailability {
  if (typeof window === "undefined") return "unsupported";
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  const appleMobile =
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (appleMobile && !standalone) return "install-required";
  return window.isSecureContext &&
    "serviceWorker" in navigator &&
    "Notification" in window &&
    "PushManager" in window
    ? "ready"
    : "unsupported";
}

// 웹 알림 수신 준비
export async function prepareWebReminder(): Promise<boolean> {
  if (
    typeof window === "undefined" ||
    !window.isSecureContext ||
    !("serviceWorker" in navigator)
  )
    return false;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    registration = await navigator.serviceWorker.ready;
    return true;
  } catch {
    registration = null;
    return false;
  }
}

// 웹 구독의 서버 연결 해제
export async function disconnectWebReminder(): Promise<void> {
  if (typeof window === "undefined") return;
  disconnected = true;
  revision += 1;
  await serverQueue.catch(() => {});
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && supabase) {
    const { error } = await supabase.rpc("unregister_push_token", {
      p_token: token,
    });
    if (error) throw error;
  }
  const subscription = await registration?.pushManager.getSubscription();
  if (subscription && !(await subscription.unsubscribe()))
    throw new Error("웹 구독 해제 실패");
  localStorage.removeItem(TOKEN_KEY);
}

// 웹 알림 동의·학습 상태 저장
export async function updateWebReminder(
  enabled: boolean,
  hour: number,
  manual: boolean,
): Promise<StudyReminderResult> {
  const currentRevision = manual ? ++revision : revision;
  if (manual && enabled) disconnected = false;
  if (!manual && enabled && disconnected) return "disabled";
  if (
    typeof window === "undefined" ||
    !("Notification" in window) ||
    !("PushManager" in window)
  )
    return "unsupported";
  try {
    if (!enabled) {
      await disconnectWebReminder();
      return "disabled";
    }
    const key = process.env.EXPO_PUBLIC_WEB_PUSH_KEY;
    if (!supabase || !key || !registration) return "failed";
    if (Notification.permission === "denied") {
      await disconnectWebReminder();
      return "denied";
    }
    if (!manual && Notification.permission !== "granted") return "denied";
    // 사용자 클릭 안에서 구독과 시스템 권한 요청 시작
    const subscription = await (manual
      ? registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: key,
        })
      : registration.pushManager.getSubscription());
    if (!subscription) return "disabled";
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return "failed";
    const json = subscription.toJSON();
    if (!json.keys?.p256dh || !json.keys.auth) return "failed";
    const keys = json.keys;
    const stats = await loadDailyStats();
    const client = supabase;
    let saved = false;
    // 해제보다 늦게 도착한 등록 응답의 재연결 방지
    serverQueue = serverQueue
      .catch(() => {})
      .then(async () => {
        if (currentRevision !== revision) return;
        const result = await client.rpc("save_web_push", {
          p_endpoint: subscription.endpoint,
          p_p256dh: keys.p256dh,
          p_auth: keys.auth,
          p_hour: hour,
          p_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          p_studied_today: (stats[toDateKey(Date.now())]?.answered ?? 0) > 0,
        });
        if (result.error || typeof result.data !== "string")
          throw new Error("웹 구독 저장 실패");
        await syncReminderPolicy(result.data);
        localStorage.setItem(TOKEN_KEY, result.data);
        saved = true;
      });
    await serverQueue;
    return saved && currentRevision === revision ? "scheduled" : "disabled";
  } catch {
    return Notification.permission === "denied" ? "denied" : "failed";
  }
}
