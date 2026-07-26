import { expect, test } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";

const USER_EMAIL = process.env.E2E_USER_EMAIL;
const USER_PASSWORD = process.env.E2E_USER_PASSWORD;
const NEW_USER_EMAIL = process.env.E2E_NEW_USER_EMAIL;
const DELETE_USER_EMAIL = process.env.E2E_DELETE_USER_EMAIL;
const DELETE_USER_PASSWORD =
  process.env.E2E_DELETE_USER_PASSWORD ?? USER_PASSWORD;

// 필수 E2E 환경 변수 보장
function requireEnvironmentValue(
  value: string | undefined,
  message: string,
): asserts value is string {
  if (value == null) test.skip(true, message);
}

// 첫 시험 선택 완료
async function completeOnboarding(page: Page): Promise<void> {
  await page.goto("/");
  if (await page.getByText("오늘의 목표").isVisible()) return;
  await page
    .getByRole("checkbox", {
      name: "컴퓨터활용능력 1급 필기 선택",
    })
    .click();
  await page.getByRole("button", { name: "내 학습 시작하기" }).click();
  await expect(page.getByText("오늘의 목표")).toBeVisible();
}

// 테스트 계정 로그인
async function signIn(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("이메일").fill(email);
  await page.getByLabel("비밀번호").fill(password);
  await page.getByRole("button", { name: "로그인하고 동기화" }).click();
  await expect(page.getByText("계정이 연결돼 있어요")).toBeVisible();
}

// 브라우저 네트워크 상태 변경
async function setOffline(
  context: BrowserContext,
  offline: boolean,
): Promise<void> {
  await context.setOffline(offline);
}

// 신규 계정 가입 메일 발송 검증
test("회원가입 정보를 제출하고 인증 안내를 확인한다", async ({ page }) => {
  requireEnvironmentValue(NEW_USER_EMAIL, "E2E 신규 계정 이메일이 필요합니다.");
  requireEnvironmentValue(
    USER_PASSWORD,
    "E2E 신규 계정 비밀번호가 필요합니다.",
  );
  await page.goto("/login");
  await page.getByRole("tab", { name: "회원가입" }).click();
  await page.getByLabel("이메일").fill(NEW_USER_EMAIL);
  await page.getByLabel("비밀번호").fill(USER_PASSWORD);
  await page.getByRole("button", { name: "계정 만들기" }).click();

  await expect(
    page.getByText(/확인 링크|계정이 연결돼 있어요/).first(),
  ).toBeVisible();
});

// 로그인·로그아웃 세션 전환 검증
test("로그인 후 로그아웃해 인증 폼으로 돌아간다", async ({ page }) => {
  requireEnvironmentValue(USER_EMAIL, "E2E 사용자 이메일이 필요합니다.");
  requireEnvironmentValue(USER_PASSWORD, "E2E 사용자 비밀번호가 필요합니다.");
  await signIn(page, USER_EMAIL, USER_PASSWORD);
  await page.getByRole("button", { name: "로그아웃" }).click();

  await expect(
    page.getByRole("button", { name: "로그인하고 동기화" }),
  ).toBeVisible();
});

// 계정 삭제 2단계 확인·온보딩 복귀 검증
test("계정 삭제를 두 번 확인하고 온보딩으로 돌아간다", async ({ page }) => {
  requireEnvironmentValue(
    DELETE_USER_EMAIL,
    "삭제 전용 E2E 사용자 이메일이 필요합니다.",
  );
  requireEnvironmentValue(
    DELETE_USER_PASSWORD,
    "삭제 전용 E2E 사용자 비밀번호가 필요합니다.",
  );
  await signIn(page, DELETE_USER_EMAIL, DELETE_USER_PASSWORD);
  await completeOnboarding(page);
  await page.goto("/settings");
  await page.getByRole("button", { name: "계정 삭제" }).click();
  await page.getByRole("button", { name: "계정 삭제 최종 확인" }).click();

  await expect(page.getByText(/어떤 시험을/)).toBeVisible();
});

// 오프라인 풀이 보관·온라인 복귀 동기화 검증
test("오프라인 풀이 후 온라인 복귀 시 대기 기록을 동기화한다", async ({
  context,
  page,
}) => {
  requireEnvironmentValue(
    USER_EMAIL,
    "동기화 가능한 E2E 사용자 이메일이 필요합니다.",
  );
  requireEnvironmentValue(
    USER_PASSWORD,
    "동기화 가능한 E2E 사용자 비밀번호가 필요합니다.",
  );
  await signIn(page, USER_EMAIL, USER_PASSWORD);
  await completeOnboarding(page);
  await setOffline(context, true);
  await expect(page.getByRole("alert")).toContainText("오프라인 모드");
  await page.getByRole("button", { name: "컴활 1급 학습 시작" }).click();
  await page.getByRole("radio").first().click();
  await page.getByRole("button", { name: "확인" }).click();

  await setOffline(context, false);
  await expect(page.getByRole("alert")).toBeHidden();
  await page.goto("/settings");
  await expect(page.getByText("오프라인 동기화 대기")).toBeVisible();
  await expect(page.getByText("0", { exact: true }).last()).toBeVisible();
});
