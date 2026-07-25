import type { CreateExamRequestInput } from "@/types/exam-request";

// 시험 요청 입력 길이 제한
export const EXAM_REQUEST_LIMITS = {
  examName: 100,
  organization: 100,
  level: 50,
  officialUrl: 300,
  reason: 500,
} as const;

// 시험 요청 필드별 검증 오류
export type ExamRequestValidationErrors = Partial<
  Record<keyof CreateExamRequestInput, string>
>;

// 시험 요청 입력 검증 결과
export interface ExamRequestValidationResult {
  isValid: boolean;
  errors: ExamRequestValidationErrors;
}

// DB 병합 키 기준 시험명 정규화
export function normalizeExamRequestName(value: string): string {
  return value.toLocaleLowerCase("ko-KR").replaceAll(/[^0-9a-z가-힣]/g, "");
}

// 공식 시험 안내 링크 유효성 판별
function isValidOfficialUrl(value: string): boolean {
  const candidate = value.trim();
  if (candidate.length === 0) return true;
  try {
    const url = new URL(candidate);
    return (
      (url.protocol === "https:" || url.protocol === "http:") &&
      url.hostname.length > 0
    );
  } catch {
    return false;
  }
}

// 시험 요청 입력값 전체 검증
export function validateExamRequestInput(
  input: CreateExamRequestInput,
): ExamRequestValidationResult {
  const errors: ExamRequestValidationErrors = {};
  const normalizedName = normalizeExamRequestName(input.examName);

  if (normalizedName.length < 2)
    errors.examName = "시험명을 구분할 수 있도록 2자 이상 입력해 주세요.";
  else if (input.examName.length > EXAM_REQUEST_LIMITS.examName)
    errors.examName = `시험명은 ${EXAM_REQUEST_LIMITS.examName}자까지 입력할 수 있어요.`;
  if (input.organization.length > EXAM_REQUEST_LIMITS.organization)
    errors.organization = `주관 기관은 ${EXAM_REQUEST_LIMITS.organization}자까지 입력할 수 있어요.`;
  if (input.level.length > EXAM_REQUEST_LIMITS.level)
    errors.level = `등급·과목은 ${EXAM_REQUEST_LIMITS.level}자까지 입력할 수 있어요.`;
  if (input.officialUrl.length > EXAM_REQUEST_LIMITS.officialUrl)
    errors.officialUrl = `공식 링크는 ${EXAM_REQUEST_LIMITS.officialUrl}자까지 입력할 수 있어요.`;
  else if (!isValidOfficialUrl(input.officialUrl))
    errors.officialUrl = "http:// 또는 https://로 시작하는 링크를 입력해 주세요.";
  if (input.reason.length > EXAM_REQUEST_LIMITS.reason)
    errors.reason = `요청 사유는 ${EXAM_REQUEST_LIMITS.reason}자까지 입력할 수 있어요.`;

  return { isValid: Object.keys(errors).length === 0, errors };
}

// 시험 요청 선택 정보 입력 개수 계산
export function countExamRequestDetails(
  input: CreateExamRequestInput,
): number {
  return [
    input.organization,
    input.level,
    input.officialUrl,
    input.reason,
  ].filter((value) => value.trim().length > 0).length;
}
