import { beforeEach, expect, jest, test } from "@jest/globals";
import { Alert, AppState, Platform } from "react-native";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { updateStudyReminder } from "./study-reminder";
import { toDateKey } from "@/storage/stats-store";
import { loadSettings } from "@/storage/settings-store";

jest.mock("./native-notifications", () => ({
  // 네이티브 알림 모의 모듈 제공
  loadNativeNotifications: () =>
    Promise.resolve(jest.requireMock("expo-notifications")),
}));

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("@/notifications/push-registration", () => ({
  registerDevicePushToken: jest.fn(),
  syncStudyReminderPreference: jest
    .fn<() => Promise<void>>()
    .mockResolvedValue(undefined),
}));
jest.mock("@/lib/monitoring", () => ({ captureHandledError: jest.fn() }));
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getAllScheduledNotificationsAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3 },
  IosAuthorizationStatus: { PROVISIONAL: 3 },
  SchedulableTriggerInputTypes: { DATE: "date" },
}));

beforeEach(async () => {
  jest.clearAllMocks();
  jest.spyOn(Alert, "alert").mockImplementation((_title, _message, buttons) => {
    buttons?.[1]?.onPress?.();
  });
  Object.defineProperty(AppState, "currentState", {
    value: "active",
    configurable: true,
  });
  Object.defineProperty(Platform, "OS", {
    value: "android",
    configurable: true,
  });
  await AsyncStorage.clear();
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
    status: "granted",
    granted: true,
    canAskAgain: true,
    expires: "never",
  } as Awaited<ReturnType<typeof Notifications.getPermissionsAsync>>);
  jest
    .mocked(Notifications.getAllScheduledNotificationsAsync)
    .mockResolvedValue([]);
  jest
    .mocked(Notifications.scheduleNotificationAsync)
    .mockResolvedValue("scheduled");
});

test("새 설치는 알림이 켜지고 기존 끄기 설정은 유지된다", async () => {
  expect((await loadSettings()).studyReminderEnabled).toBe(true);
  await AsyncStorage.setItem(
    "exam-loop:settings",
    JSON.stringify({ studyReminderEnabled: false }),
  );
  expect((await loadSettings()).studyReminderEnabled).toBe(false);
});

test("새 설치는 라이트 모드이고 저장된 테마 선택은 유지된다", async () => {
  expect((await loadSettings()).themePreference).toBe("light");
  for (const themePreference of ["dark", "system"] as const) {
    await AsyncStorage.setItem(
      "exam-loop:settings",
      JSON.stringify({ themePreference }),
    );
    expect((await loadSettings()).themePreference).toBe(themePreference);
  }
});

test("첫 실행 권한 허용 후 알림을 예약한다", async () => {
  const granted = await Notifications.getPermissionsAsync();
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
    ...granted,
    status: "undetermined" as typeof granted.status,
    granted: false,
  });
  jest.mocked(Notifications.requestPermissionsAsync).mockResolvedValue(granted);
  expect(await updateStudyReminder(true, 12, "initial")).toBe("scheduled");
  expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
  expect(Notifications.scheduleNotificationAsync).toHaveBeenCalled();
});

test("거부한 권한은 자동으로 다시 요청하지 않는다", async () => {
  const permission = await Notifications.getPermissionsAsync();
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
    ...permission,
    status: "denied" as typeof permission.status,
    granted: false,
  });
  expect(await updateStudyReminder(true, 12, "initial")).toBe("denied");
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(Notifications.scheduleNotificationAsync).not.toHaveBeenCalled();
});

test("백그라운드에서는 초기 권한을 요청하지 않는다", async () => {
  Object.defineProperty(AppState, "currentState", { value: "background" });
  const permission = await Notifications.getPermissionsAsync();
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
    ...permission,
    status: "undetermined" as typeof permission.status,
    granted: false,
  });
  expect(await updateStudyReminder(true, 12, "initial")).toBe("denied");
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
});

test("학습한 날은 예약에서 제외하고 권한을 다시 묻지 않는다", async () => {
  const key = toDateKey(Date.now());
  await AsyncStorage.setItem(
    "exam-loop:daily-stats",
    JSON.stringify({ [key]: { answered: 1, correct: 0 } }),
  );
  expect(await updateStudyReminder(true, 12, false)).toBe("scheduled");
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  const calls = jest.mocked(Notifications.scheduleNotificationAsync).mock.calls;
  expect(calls).toHaveLength(52);
  expect(calls.some(([request]) => request.content.color === "#D92D20")).toBe(
    true,
  );
});

test("알림 끄기는 다른 종류의 예약을 취소하지 않는다", async () => {
  jest
    .mocked(Notifications.getAllScheduledNotificationsAsync)
    .mockResolvedValue([
      {
        identifier: "study",
        content: { data: { kind: "study-reminder" } },
        trigger: null,
      },
      { identifier: "other", content: { data: {} }, trigger: null },
    ] as Awaited<
      ReturnType<typeof Notifications.getAllScheduledNotificationsAsync>
    >);
  expect(await updateStudyReminder(false, 12)).toBe("disabled");
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledTimes(
    1,
  );
  expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(
    "study",
  );
});

test("예약 실패는 성공으로 보고하지 않는다", async () => {
  jest
    .mocked(Notifications.scheduleNotificationAsync)
    .mockRejectedValueOnce(new Error("예약 실패"));
  expect(await updateStudyReminder(true, 12, false)).toBe("failed");
});
