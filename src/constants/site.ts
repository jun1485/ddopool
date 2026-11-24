export const SITE_NAME = "또풀";
export const SITE_TITLE = "또풀 — 산업안전기사·정처기·SQLD 자격증 문제 풀이";
export const SITE_DESCRIPTION =
  "산업안전기사·정보처리기사·SQLD·컴활·한국사 등 자격시험 연습문제를 해설과 함께 무료로 풀고, 틀린 문제는 간격 반복 복습으로 다시 풀어 익히는 학습 앱. 로그인 없이 바로 시작할 수 있습니다.";

// 배포 도메인 기준 절대 URL 생성
export const SITE_URL =
  process.env.EXPO_PUBLIC_SITE_URL || "https://ddopool.vercel.app";
export const OG_IMAGE = `${SITE_URL}/og-image.png`;
