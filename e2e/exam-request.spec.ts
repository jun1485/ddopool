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
  await expect(page.getByText("오늘의 학습", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: /오늘 \d+문제 풀기/ }),
  ).toBeVisible();
}

// 리포트 탭의 바로가기 열기
async function openReportLink(page: Page, label: string): Promise<void> {
  await page.getByText("리포트", { exact: true }).last().click();
  await page.getByRole("button", { name: label }).click();
}

test("온보딩에서 시험과 목표를 선택해 학습 홈에 진입한다", async ({ page }) => {
  await completeOnboarding(page);
  await expect(
    page.getByRole("button", { name: "컴활 1급 학습 시작" }),
  ).toBeVisible();
  await openReportLink(page, "성장 기록·배지");
  await expect(page.getByText("나의 성장", { exact: true })).toBeVisible();
  await expect(page.getByText("업적 배지")).toBeVisible();
});

test("검색 결과가 없는 시험을 요청하고 내 요청에서 확인한다", async ({
  page,
}) => {
  await completeOnboarding(page);
  await page.getByText("시험찾기", { exact: true }).first().click();
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

test("시험일과 학습 가능일로 권장 페이스를 설정한다", async ({ page }) => {
  await completeOnboarding(page);
  await page.getByRole("button", { name: "설정 열기" }).click();
  await page.getByRole("button", { name: "시험일 학습 계획 설정" }).click();

  await expect(page.getByText("시험일까지 한 걸음씩")).toBeVisible();
  await page.getByRole("radio", { name: "1개월" }).click();
  await page.getByRole("radio", { name: "주 5일 학습" }).click();
  await page.getByRole("button", { name: "시험일 학습 계획 저장" }).click();

  await expect(page.getByText("학습 계획 저장 완료")).toBeVisible();
});

test("월간 캘린더에서 날짜별 학습 기록을 탐색한다", async ({ page }) => {
  await completeOnboarding(page);
  await openReportLink(page, "학습 기록 자세히 보기");

  await expect(page.getByText("학습 캘린더", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "이전 달" })).toBeVisible();
  await expect(page.getByText("학습한 날", { exact: true })).toBeVisible();
});

test("중단한 학습을 홈에서 같은 문제 상태로 이어 푼다", async ({ page }) => {
  await completeOnboarding(page);
  await page
    .getByRole("button", { name: "컴활 1급 학습 시작" })
    .click();
  await page.getByRole("radio").first().click();
  await page.getByRole("button", { name: "학습 종료" }).click();
  await page.getByRole("button", { name: "나중에 이어 풀기" }).click();

  await expect(page.getByText("이어 풀 수 있어요")).toBeVisible();
  await page.getByRole("button", { name: /1문제부터 이어 풀기/ }).click();
  await expect(page.getByRole("radio").first()).toHaveAttribute("aria-checked", "true");
});
