import { beforeEach, expect, jest, test } from "@jest/globals";
import {
  getWebReminderAvailability,
  prepareWebReminder,
  updateWebReminder,
  disconnectWebReminder,
} from "./web-reminder.web";
import { supabase } from "@/lib/supabase";

jest.mock("./reminder-policy", () => ({
  syncReminderPolicy: jest
    .fn<() => Promise<void>>()
    .mockResolvedValue(undefined),
}));

jest.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getSession: jest.fn() },
    rpc: jest.fn(),
  },
}));
jest.mock("@/storage/stats-store", () => ({
  loadDailyStats: async () => ({}),
  toDateKey: () => "test-date",
}));
const subscribe = jest.fn<() => Promise<typeof subscription>>();
const unsubscribe = jest.fn<() => Promise<boolean>>();
const subscription = {
  endpoint: "https://web.push.apple.com/test",
  unsubscribe,
  toJSON: () => ({ keys: { p256dh: "A".repeat(87), auth: "B".repeat(22) } }),
};
const getSubscription = jest.fn<() => Promise<typeof subscription | null>>();
const registration = { pushManager: { subscribe, getSubscription } };
const memory = new Map<string, string>();

beforeEach(async () => {
  jest.clearAllMocks();
  memory.clear();
  process.env.EXPO_PUBLIC_WEB_PUSH_KEY = "test-key";
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: globalThis,
  });
  Object.defineProperty(globalThis, "isSecureContext", {
    configurable: true,
    value: true,
  });
  Object.defineProperty(globalThis, "Notification", {
    configurable: true,
    value: { permission: "default" },
  });
  Object.defineProperty(globalThis, "PushManager", {
    configurable: true,
    value: {},
  });
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => memory.get(key) ?? null,
      setItem: (key: string, value: string) => memory.set(key, value),
      removeItem: (key: string) => memory.delete(key),
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      userAgent: "Mozilla/5.0",
      platform: "Win32",
      maxTouchPoints: 0,
      serviceWorker: {
        register: async () => registration,
        ready: Promise.resolve(registration),
      },
    },
  });
  Object.defineProperty(globalThis, "matchMedia", {
    configurable: true,
    value: () => ({ matches: false }),
  });
  subscribe.mockResolvedValue(subscription);
  getSubscription.mockResolvedValue(subscription);
  unsubscribe.mockResolvedValue(true);
  if (!supabase) throw new Error("모의 서버 없음");
  jest
    .mocked(supabase.auth.getSession)
    .mockResolvedValue({ data: { session: null }, error: null });
  await prepareWebReminder();
  await updateWebReminder(true, 12, true);
  jest.clearAllMocks();
});

test("아이폰 Safari는 홈 화면 설치를 먼저 안내한다", () => {
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      platform: "iPhone",
      maxTouchPoints: 5,
      serviceWorker: {},
    },
  });
  expect(getWebReminderAvailability()).toBe("install-required");
});

test("홈 화면 웹 앱은 지원 API가 있으면 알림을 준비한다", () => {
  Object.defineProperty(globalThis, "matchMedia", {
    configurable: true,
    value: () => ({ matches: true }),
  });
  expect(getWebReminderAvailability()).toBe("ready");
});

test("버튼 호출과 같은 동작 안에서 구독을 시작한다", async () => {
  const pending = updateWebReminder(true, 12, true);
  expect(subscribe).toHaveBeenCalledTimes(1);
  await pending;
});
test("자동 갱신은 미동의 사용자에게 권한을 요청하지 않는다", async () => {
  expect(await updateWebReminder(true, 12, false)).toBe("denied");
  expect(subscribe).not.toHaveBeenCalled();
});
test("구독 거부는 발송 예약 성공으로 보고하지 않는다", async () => {
  Object.defineProperty(globalThis, "Notification", {
    value: { permission: "denied" },
  });
  expect(await updateWebReminder(true, 12, true)).toBe("denied");
  expect(subscribe).not.toHaveBeenCalled();
});
test("로그아웃에서 브라우저 구독을 해제한다", async () => {
  await disconnectWebReminder();
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});
