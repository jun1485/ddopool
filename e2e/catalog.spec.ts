import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";

test("시험 10종을 표시하고 새 시험 학습을 시작한다", async ({ page }) => {
  await page.goto("/onboarding");
  await expect(page.getByRole("checkbox")).toHaveCount(10);
  await mkdir("docs/handoff/출시/screenshots", { recursive: true });
  await page.screenshot({
    path: "docs/handoff/출시/screenshots/catalog-ten-mobile.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.getByRole("checkbox")).toHaveCount(10);
  await page.screenshot({
    path: "docs/handoff/출시/screenshots/catalog-ten-desktop.png",
    fullPage: true,
  });
  await page.getByRole("checkbox", { name: "SQL 개발자(SQLD) 선택" }).click();
  await page.getByRole("button", { name: "내 학습 시작하기" }).click();
  await expect(page.getByText("오늘의 목표", { exact: true })).toBeVisible();
  await expect(page.getByText("SQLD", { exact: true }).first()).toBeVisible();
  await page.goto("/quiz/sqld");
  await expect(
    page.getByText("하나를 선택해 주세요", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "다시 볼 문제로 저장" }),
  ).toBeVisible();
});
