import { SITE_URL } from "@/constants/site";

// 법률 문서·스토어 등록정보에 표기하는 운영 주체
export const OPERATOR_NAME =
  process.env.EXPO_PUBLIC_OPERATOR_NAME?.trim() ?? "";
export const PRIVACY_OFFICER_NAME =
  process.env.EXPO_PUBLIC_PRIVACY_OFFICER_NAME?.trim() ?? "";
export const SUPPORT_EMAIL =
  process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim() ?? "";

// 법률 문서 시행일
export const LEGAL_EFFECTIVE_DATE =
  process.env.EXPO_PUBLIC_LEGAL_EFFECTIVE_DATE?.trim() ?? "";
export const LEGAL_VERSION = "2026-09-05";

// 신고·운영 감사 기록 보존 기간
export const REPORT_RETENTION_PERIOD = "1년";
export const AUDIT_LOG_RETENTION_PERIOD = "1년";

export const PRIVACY_POLICY_PATH = "/privacy";
export const TERMS_OF_SERVICE_PATH = "/terms";

// 스토어 등록·외부 공유용 절대 URL
export const PRIVACY_POLICY_URL =
  SITE_URL.length > 0 ? `${SITE_URL}${PRIVACY_POLICY_PATH}` : "";
export const TERMS_OF_SERVICE_URL =
  SITE_URL.length > 0 ? `${SITE_URL}${TERMS_OF_SERVICE_PATH}` : "";

// 스토어 제출 전 채워야 하는 운영 주체 정보 기입 여부
export const IS_LEGAL_PROFILE_COMPLETE =
  OPERATOR_NAME.length > 0 &&
  PRIVACY_OFFICER_NAME.length > 0 &&
  SUPPORT_EMAIL.length > 0 &&
  LEGAL_EFFECTIVE_DATE.length > 0;
