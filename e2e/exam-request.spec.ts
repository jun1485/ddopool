import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

// 첫 시험 선택·학습 홈 진입
async function completeOnboarding(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByText(/어떤 시험을/)).toBeVisible();
  await page
    .getByRole("checkbox", {
      name: "컴퓨터활용능력 1급 필기 선택",
    })
    .click();
  await page.getByRole("button", { name: "내 학습 시작하기" }).click();
  await expect(page.getByText("오늘의 목표")).toBeVisible();
}

test("온보딩에서 시험과 목표를 선택해 학습 홈에 진입한다", async ({ page }) => {
  await completeOnboarding(page);
  await expect(
    page.getByRole("button", { name: "컴활 1급 학습 시작" }),
  ).toBeVisible();
});

test("검색 결과가 없는 시험을 요청하고 내 요청에서 확인한다", async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.getByRole("button", { name: "시험 찾기 및 요청" }).click();
  await page.getByLabel("시험 검색").fill("새로운 자격 시험");
  await expect(page.getByText("찾는 시험이 아직 없나요?")).toBeVisible();
  await page.getByRole("button", { name: "이 시험 요청하기" }).click();

  await page.getByLabel("주관 기관").fill("테스트 시행기관");
  await page.getByRole("button", { name: "시험 추가 요청 보내기" }).click();

  await expect(page.getByText("내 시험 요청")).toBeVisible();
  await expect(
    page.getByText("새로운 자격 시험", { exact: true }),
  ).toBeVisible();
});
