const { validateReleaseEnvironment } = require("./scripts/release-config.cjs");

// 환경별 앱 출시 설정 구성
module.exports = ({ config }) => {
  const production =
    process.env.EAS_BUILD_PROFILE === "production" ||
    process.env.APP_ENV === "production";
  const projectId =
    process.env.EAS_PROJECT_ID ??
    process.env.EAS_BUILD_PROJECT_ID ??
    config.extra?.eas?.projectId;
  // 네이티브 출시 검증은 EAS 빌드 서버에서만 실행
  if (production) {
    if (process.env.EAS_BUILD === "true")
      validateReleaseEnvironment(process.env, projectId);
  }
  // 웹 운영 배포의 법률 표기·서비스 주소 누락 차단
  else if (process.env.VERCEL_ENV === "production")
    validateReleaseEnvironment(process.env, projectId, { native: false });
  return {
    ...config,
    ...(projectId
      ? {
          updates: {
            ...config.updates,
            url: `https://u.expo.dev/${projectId}`,
          },
        }
      : {}),
    extra: {
      ...config.extra,
      releaseMode: production,
      ...(projectId ? { eas: { projectId } } : {}),
    },
  };
};
