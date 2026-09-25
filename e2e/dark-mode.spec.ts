import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const captureDir = process.env.UI_CAPTURE_DIR;

test.describe.configure({ timeout: 240_000 });
expect.configure({ timeout: 60_000 });

// 온보딩 완료 후 홈 진입
async function onboard(page: Page): Promise<void> {
  await page.goto("/onboarding");
  await page
    .getByRole("checkbox", { name: "컴퓨터활용능력 1급 필기 선택" })
    .click();
  await page.getByRole("button", { name: "내 학습 시작하기" }).click();
  await expect(page.getByText("오늘의 목표", { exact: true })).toBeVisible();
}

// 지정 경로 전체 화면 캡처 저장
async function capture(page: Page, name: string): Promise<void> {
  if (captureDir == null) return;
  await mkdir(captureDir, { recursive: true });
  await page.screenshot({
    path: `${captureDir}/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}

// 텍스트와 가장 가까운 불투명 배경 사이 명암비 측정
function measureContrast(page: Page, text: string): Promise<number> {
  return page
    .getByText(text, { exact: true })
    .first()
    .evaluate((node) => {
      const parse = (value: string) =>
        (value.match(/[\d.]+/g) ?? []).map(Number) as number[];
      const luminance = ([r, g, b]: number[]) => {
        const channel = (c: number) => {
          const v = c / 255;
          return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        };
        return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      };
      const foreground = parse(getComputedStyle(node).color);
      let element: Element | null = node;
      let background = [255, 255, 255];
      while (element != null) {
        const color = parse(getComputedStyle(element).backgroundColor);
        if (color.length >= 3 && (color[3] ?? 1) >= 0.99) {
          background = color;
          break;
        }
        element = element.parentElement;
      }
      const alpha = foreground[3] ?? 1;
      const blended = [0, 1, 2].map(
        (i) => foreground[i] * alpha + background[i] * (1 - alpha),
      );
      const [light, dark] = [luminance(blended), luminance(background)].sort(
        (a, b) => b - a,
      );
      return (light + 0.05) / (dark + 0.05);
    });
}

for (const theme of ["light", "dark"] as const) {
  test(`${theme} 테마 강조색 카드 위 글씨가 읽을 수 있는 명암비를 유지한다`, async ({
    page,
  }) => {
    await onboard(page);
    // 설정 화면에서 테마 전환 후 탭 이동
    await page.getByRole("button", { name: "설정 열기" }).click();
    await page
      .getByRole("radio", { name: theme === "dark" ? "다크" : "라이트" })
      .click();
    await page.goBack();
    await expect(page.getByText("오늘의 목표", { exact: true })).toBeVisible();

    await page.getByText("리포트", { exact: true }).last().click();
    await expect(page.getByText("누적 학습", { exact: true })).toBeVisible();
    await capture(page, `${theme}-report`);
    expect(await measureContrast(page, "누적 학습")).toBeGreaterThanOrEqual(
      4.5,
    );
    expect(await measureContrast(page, "전체 정답률")).toBeGreaterThanOrEqual(
      4.5,
    );

    await page.getByText("복습", { exact: true }).last().click();
    await expect(
      page.getByText("지금 복습할 문제", { exact: true }),
    ).toBeVisible();
    expect(
      await measureContrast(page, "지금 복습할 문제"),
    ).toBeGreaterThanOrEqual(4.5);
    await capture(page, `${theme}-review`);
  });
}

test("퀴즈 종료는 확인 후에만 화면을 벗어난다", async ({ page }) => {
  await onboard(page);
  // 앱 내부 이동으로 퀴즈 진입
  await page.getByRole("button", { name: /맞춤 플랜 \d+문제 시작/ }).click();
  await expect(page.getByRole("radio").first()).toBeVisible();

  await page.getByRole("button", { name: "학습 종료" }).click();
  await expect(page.getByText("학습을 그만둘까요?")).toBeVisible();
  await capture(page, "quiz-leave-confirm");
  await page.getByRole("button", { name: "계속 풀기" }).click();
  await expect(page.getByText("학습을 그만둘까요?")).toBeHidden();
  await expect(page).toHaveURL(/\/quiz\//);

  await page.getByRole("button", { name: "학습 종료" }).click();
  await page.getByRole("button", { name: "나중에 이어 풀기" }).click();
  await expect(page).not.toHaveURL(/\/quiz\//);
  await expect(page.getByText("이어 풀 수 있어요")).toBeVisible();
});
