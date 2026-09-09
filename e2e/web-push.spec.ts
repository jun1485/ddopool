import { expect, test } from "@playwright/test";

test("웹 알림 안내와 홈 화면 설정을 제공한다", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("checkbox", { name: "컴퓨터활용능력 1급 필기 선택" })
    .click();
  await page.getByRole("button", { name: "내 학습 시작하기" }).click();
  await expect(page.getByText("오늘의 목표")).toBeVisible();
  await page.goto("/settings");
  await expect(page.getByText("아이폰에서 알림 받기")).toBeVisible();
  await expect(page.getByText(/공유 → 홈 화면에 추가/)).toBeVisible();
  await expect(
    page.getByRole("button", { name: "웹 알림 받기", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByText("웹 알림을 연결하려면 먼저 로그인해 주세요."),
  ).toBeVisible();
  const manifest = await page.request.get("/manifest.webmanifest");
  const manifestBody = await manifest.json();
  expect(manifestBody.display).toBe("standalone");
  expect(manifestBody.orientation).toBe("portrait");
  expect((await page.request.get("/sw.js")).status()).toBe(200);
  await page.getByRole("button", { name: "웹 알림 끄기", exact: true }).click();
  await expect(
    page.getByText("웹 알림을 껐어요.", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "docs/handoff/출시/screenshots/web-push-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: "docs/handoff/출시/screenshots/web-push-desktop.png",
    fullPage: true,
  });
});
