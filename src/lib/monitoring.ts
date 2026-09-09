import * as Sentry from "@sentry/react-native";

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const isMonitoringConfigured = dsn != null && dsn.length > 0;

// 오류 수집 초기화
export function initMonitoring(): void {
  if (!isMonitoringConfigured) return;
  Sentry.init({
    dsn,
    // 개인정보 미수집 정책에 맞춰 IP·쿠키 등 자동 수집 항목 제외
    sendDefaultPii: false,
    tracesSampleRate: 0,
    enabled: !__DEV__,
    // 오류 진단에서 개인 식별 정보 제외
    beforeSend(event) {
      delete event.user;
      delete event.request;
      delete event.breadcrumbs;
      delete event.extra;
      if (event.message != null) event.message = "앱 오류 발생";
      for (const exception of event.exception?.values ?? [])
        exception.value = "앱 오류 발생";
      return event;
    },
  });
}

// 처리된 오류 수동 기록
export function captureHandledError(_error: unknown, context: string): void {
  if (!isMonitoringConfigured) return;
  Sentry.captureException(new Error("처리 중 오류 발생"), {
    tags: {
      context,
      error_kind:
        _error instanceof TypeError
          ? "type"
          : _error instanceof RangeError
            ? "range"
            : _error instanceof SyntaxError
              ? "syntax"
              : "operation",
    },
  });
}
