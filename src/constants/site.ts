export const SITE_NAME = "또풀";
export const SITE_TITLE = "또풀 — 컴활·토익·자격증 기출 반복학습 앱";
export const SITE_DESCRIPTION =
  "컴활·토익·드론 등 자격시험 기출문제를 풀고, 틀린 문제는 간격 반복 복습으로 다시 풀어 완전히 익히는 학습 앱. 로그인 없이 바로 시작하고 원하는 시험은 요청·투표로 추가할 수 있습니다.";

// 배포 도메인 기준 절대 URL 생성 (미설정 시 상대 경로)
export const SITE_URL = process.env.EXPO_PUBLIC_SITE_URL ?? "";
export const OG_IMAGE = `${SITE_URL}/og-image.png`;
