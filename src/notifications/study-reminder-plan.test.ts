import { describe, expect, test } from "@jest/globals";
import { createStudyReminderPlan } from "./study-reminder-plan";

test("횟수와 조용한 시간 제한 및 오늘 쉬기를 함께 적용한다", () => {
  const plan = createStudyReminderPlan(new Date(2026, 8, 8, 6), 12, false, {
    reminderDailyLimit: 2,
    reminderQuietHour: 21,
    reminderPausedDate: "2026-09-08",
  });
  expect(plan).toHaveLength(26);
  expect(plan[0].date.getDate()).toBe(9);
  expect(plan.every((slot) => [12, 18].includes(slot.date.getHours()))).toBe(
    true,
  );
});

describe("미학습 리마인더", () => {
  test("설정 시간 이후 하루 최대 네 번, 21시부터 긴급 표시", () => {
    const plan = createStudyReminderPlan(new Date(2026, 8, 6, 6), 7, false);
    expect(plan).toHaveLength(56);
    expect(
      plan.slice(0, 4).map((slot) => [slot.date.getHours(), slot.urgent]),
    ).toEqual([
      [7, false],
      [18, false],
      [21, true],
      [23, true],
    ]);
  });
  test("오늘 학습했으면 내일부터 예약", () => {
    const plan = createStudyReminderPlan(new Date(2026, 8, 6, 6), 7, true);
    expect(plan).toHaveLength(52);
    expect(plan[0].date.getDate()).toBe(7);
  });
  test("21시 선택은 중복 없이 21시와 23시만 예약", () => {
    const plan = createStudyReminderPlan(new Date(2026, 8, 6, 6), 21, false);
    expect(plan).toHaveLength(28);
    expect(plan.slice(0, 2).map((slot) => slot.date.getHours())).toEqual([
      21, 23,
    ]);
  });
  test("지난 시간 제외 및 월말 날짜 전환", () => {
    const now = new Date(2026, 8, 30, 23, 30);
    const plan = createStudyReminderPlan(now, 7, false);
    expect(plan.every((slot) => slot.date > now)).toBe(true);
    expect(plan[0].date.getMonth()).toBe(9);
    expect(plan[0].date.getDate()).toBe(1);
  });
});
