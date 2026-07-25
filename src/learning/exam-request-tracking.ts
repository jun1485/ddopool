import type { ExamRequest } from "@/types/exam-request";

export type RequestTrackingFilter =
  | "all"
  | "active"
  | "published"
  | "closed";

// 관심 요청 상태별 개수
export interface RequestTrackingSummary {
  all: number;
  active: number;
  published: number;
  closed: number;
}

const ACTIVE_STATUSES = new Set([
  "requested",
  "triage",
  "approved",
  "sourcing",
  "draft",
  "review",
  "blocked",
]);
const CLOSED_STATUSES = new Set([
  "duplicate",
  "rejected",
  "archived",
  "cancelled",
]);

// 요청 상태별 추적 분류 판별
export function matchesRequestTrackingFilter(
  request: ExamRequest,
  filter: RequestTrackingFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "active") return ACTIVE_STATUSES.has(request.status);
  if (filter === "published") return request.status === "published";
  return CLOSED_STATUSES.has(request.status);
}

// 관심 요청 상태 요약 집계
export function summarizeRequestTracking(
  requests: ExamRequest[],
): RequestTrackingSummary {
  return requests.reduce<RequestTrackingSummary>(
    (summary, request) => ({
      all: summary.all + 1,
      active:
        summary.active + (ACTIVE_STATUSES.has(request.status) ? 1 : 0),
      published:
        summary.published + (request.status === "published" ? 1 : 0),
      closed:
        summary.closed + (CLOSED_STATUSES.has(request.status) ? 1 : 0),
    }),
    { all: 0, active: 0, published: 0, closed: 0 },
  );
}
