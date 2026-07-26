import { describe, expect, test } from "@jest/globals";

import { isNotificationPermissionGranted } from "@/notifications/notification-permission";

describe("알림 권한 분기", () => {
  // 일반 알림 권한 허용 상태 검증
  test("허용 권한에서는 알림 기능을 활성화한다", () => {
    expect(isNotificationPermissionGranted("granted", false)).toBe(true);
  });

  // iOS 임시 알림 권한 허용 상태 검증
  test("iOS 임시 허용 권한에서도 알림 기능을 활성화한다", () => {
    expect(isNotificationPermissionGranted("undetermined", true)).toBe(true);
  });

  // 알림 권한 거절 상태 검증
  test("거절 권한에서는 알림 기능을 활성화하지 않는다", () => {
    expect(isNotificationPermissionGranted("denied", false)).toBe(false);
  });
});
