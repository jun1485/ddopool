import { expect, test, type Page } from "@playwright/test";
import { mkdir, readFile } from "node:fs/promises";

const captureDir = "docs/handoff/출시/screenshots";

test("설정 저장 실패는 안내하고 재시도 후 변경값을 보존한다", async ({
  page,
}) => {
  await onboard(page);
  await page.goto("/settings");
  const toggle = page.getByRole("switch", { name: "햅틱 피드백" });
  await expect(toggle).toBeVisible();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (
        key === "exam-loop:settings" &&
        sessionStorage.getItem("fail-save") === "yes"
      )
        throw new Error("저장 공간 부족");
      return original.call(this, key, value);
    };
    sessionStorage.setItem("fail-save", "yes");
  });
  await toggle.click();
  await expect(
    page.getByRole("button", { name: "저장 다시 시도" }),
  ).toBeVisible();
  await capture(page, "settings-save-error");
  await page.evaluate(() => sessionStorage.removeItem("fail-save"));
  await page.getByRole("button", { name: "저장 다시 시도" }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("exam-loop:settings") ?? "{}")
            .hapticsEnabled,
      ),
    )
    .toBe(false);
  await expect(
    page.getByRole("button", { name: "저장 다시 시도" }),
  ).toHaveCount(0);
});

test("손상된 설정은 초기화하지 않고 복구 화면을 표시한다", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("exam-loop:settings", "broken"),
  );
  await page.goto("/");
  await expect(
    page.getByRole("button", { name: "설정 다시 불러오기" }),
  ).toBeVisible();
  expect(
    await page.evaluate(() => localStorage.getItem("exam-loop:settings")),
  ).toBe("broken");
  await capture(page, "settings-recovery");
});

test("모바일 웹 탭은 하단에 표시하고 큰 화면에서는 상단으로 이동한다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await onboard(page);
  const tab = page.getByText("복습", { exact: true }).first();
  const discoverTab = page.getByText("시험찾기", { exact: true }).first();
  await expect(tab).toBeVisible();
  await expect(discoverTab).toBeVisible();
  const mobile = await tab.boundingBox();
  expect(mobile!.y).toBeGreaterThan(700);
  expect(mobile!.y + mobile!.height).toBeLessThanOrEqual(800);
  await capture(page, "tabs-mobile");
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect.poll(async () => (await tab.boundingBox())!.y).toBeLessThan(100);
  await discoverTab.click();
  await expect(page.getByText("시험 카탈로그", { exact: true })).toBeVisible();
  await capture(page, "tabs-desktop");
});

// 기본 시험 선택 완료
async function onboard(page: Page): Promise<void> {
  await page.goto("/onboarding");
  await page
    .getByRole("checkbox", { name: "컴퓨터활용능력 1급 필기 선택" })
    .click();
  await page.getByRole("button", { name: "내 학습 시작하기" }).click();
  await expect(page.getByText("오늘의 목표", { exact: true })).toBeVisible();
  await capture(
    page,
    process.env.UI_CAPTURE_PREFIX
      ? `${process.env.UI_CAPTURE_PREFIX}-home`
      : page.viewportSize()!.width > 600
        ? "home-desktop"
        : "home-mobile",
  );
}

// 모바일 전체 화면 캡처 저장
async function capture(page: Page, name: string): Promise<void> {
  await mkdir(captureDir, { recursive: true });
  await page.screenshot({
    path: `${captureDir}/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}

test("21시 미학습 안내는 빨간색으로 표시하고 학습 기록이 있으면 숨긴다", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(2026, 8, 6, 21, 0));
  await onboard(page);
  const alert = page
    .getByRole("alert")
    .filter({ hasText: "오늘 학습 마감까지" });
  await expect(alert).toBeVisible();
  await expect(alert).toHaveCSS("border-top-color", "rgb(217, 45, 32)");
  await capture(page, "deadline-mobile");
  await page.setViewportSize({ width: 1280, height: 900 });
  await capture(page, "deadline-desktop");
  await page.goto("/quiz/computer-1?mode=learn");
  await page.getByRole("radio").first().click();
  await page.getByRole("button", { name: "확인", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("exam-loop:daily-stats") ?? "{}")[
            "2026-09-06"
          ]?.answered,
      ),
    )
    .toBe(1);
  await capture(page, "answer-feedback");
  await page.goto("/");
  await expect(page.getByText("오늘의 목표", { exact: true })).toBeVisible();
  await expect(alert).toHaveCount(0);
});

test("다크 모드에서 학습 시작 버튼을 표시한다", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark", reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem(
      "exam-loop:settings",
      JSON.stringify({ themePreference: "dark" }),
    );
  });
  await page.addInitScript(() => {
    localStorage.setItem(
      "exam-loop:settings",
      JSON.stringify({ themePreference: "dark" }),
    );
  });
  await onboard(page);
  await expect(
    page.getByRole("button", { name: /맞춤 플랜 .*문제 시작/ }),
  ).toBeVisible();
  await capture(page, "home-dark");
});

test("공개 삭제 안내는 비회원 온보딩을 요구하지 않는다", async ({ page }) => {
  await page.goto("/account-delete");
  await expect(page.getByText("또풀 계정 삭제", { exact: true })).toBeVisible();
  await expect(page.getByText("앱 없이 요청", { exact: true })).toBeVisible();
  await capture(page, "account-delete-mobile");
  await page
    .getByRole("link", { name: "개인정보처리방침", exact: true })
    .click();
  await expect(page).toHaveURL(/\/privacy$/);
});

test("회원가입 동의는 기본 미선택이며 모드를 바꾸면 초기화된다", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("tab", { name: "회원가입" }).click();
  const consent = page.getByRole("checkbox", { name: /만 14세/ });
  await expect(consent).toHaveAttribute("aria-checked", "false");
  await consent.click();
  await expect(consent).toHaveAttribute("aria-checked", "true");
  await page.getByRole("tab", { name: "로그인", exact: true }).click();
  await page.getByRole("tab", { name: "회원가입" }).click();
  await expect(consent).toHaveAttribute("aria-checked", "false");
  await page.setViewportSize({ width: 360, height: 800 });
  await capture(page, "signup-mobile");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("모의고사 재진입 시 답안과 종료 시각을 유지한다", async ({ page }) => {
  await onboard(page);
  await page.goto("/quiz/computer-1?mode=mock");
  await page.getByRole("radio").first().click();
  const before = await page.evaluate(() =>
    localStorage.getItem("exam-loop:active-quiz-session:v1"),
  );
  expect(before).not.toBeNull();
  await page.goto("/quiz/computer-1?mode=mock&resume=true");
  await expect(page.getByRole("radio").first()).toHaveAttribute(
    "aria-checked",
    "true",
  );
  const after = await page.evaluate(() =>
    localStorage.getItem("exam-loop:active-quiz-session:v1"),
  );
  expect(JSON.parse(after!).mockDeadline).toBe(
    JSON.parse(before!).mockDeadline,
  );
  await capture(page, "mock-resume-mobile");
});

test("설정에서 JSON 파일 백업을 내려받고 확인 후 복원한다", async ({
  page,
}) => {
  await onboard(page);
  await page.goto("/settings");
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "개인 학습 데이터 JSON 내보내기" })
    .click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("ddopool-backup.json");
  await page
    .getByRole("button", { name: /백업 파일 가져오기/ })
    .scrollIntoViewIfNeeded();
  await capture(page, "settings-mobile");
  const backupPath = await download.path();
  expect(backupPath).not.toBeNull();
  const backup = JSON.parse(await readFile(backupPath!, "utf8"));
  backup.data.dailyStats = { "2026-09-05": { answered: 3, correct: 2 } };
  const chooserPromise = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: /백업 파일 가져오기/ }).click();
  await (
    await chooserPromise
  ).setFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page.getByRole("button", { name: "현재 기록 교체·복원 확정" }).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem("exam-loop:daily-stats") ?? "{}"),
      ),
    )
    .toEqual(backup.data.dailyStats);
});

test("데스크톱·모션 감소 환경에서 가입 폼과 학습 화면을 표시한다", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await onboard(page);
  await page.goto("/login");
  await page.getByLabel("이메일").focus();
  await expect(page.getByLabel("이메일")).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(page.getByLabel("비밀번호", { exact: true })).toBeFocused();
  await capture(page, "login-desktop");
});
