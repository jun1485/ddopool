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
  if (production) validateReleaseEnvironment(process.env, projectId);
  return {
    ...config,
    extra: {
      ...config.extra,
      releaseMode: production,
      ...(projectId ? { eas: { projectId } } : {}),
    },
  };
};
