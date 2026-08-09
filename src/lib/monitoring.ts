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
    tracesSampleRate: __DEV__ ? 1 : 0.2,
    enabled: !__DEV__,
  });
}

// 처리된 오류 수동 기록
export function captureHandledError(error: unknown, context: string): void {
  if (!isMonitoringConfigured) return;
  Sentry.captureException(error, { tags: { context } });
}
