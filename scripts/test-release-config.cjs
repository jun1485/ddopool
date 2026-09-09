const assert = require("node:assert/strict");
const { validateReleaseEnvironment } = require("./release-config.cjs");
assert.throws(() => validateReleaseEnvironment({}, ""));
const env = {
  EXPO_PUBLIC_SUPABASE_URL: "https://project.example.com",
  EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "public-test-key",
  EXPO_PUBLIC_SITE_URL: "https://app.example.com",
  EXPO_PUBLIC_OPERATOR_NAME: "검증 운영자",
  EXPO_PUBLIC_PRIVACY_OFFICER_NAME: "검증 담당자",
  EXPO_PUBLIC_SUPPORT_EMAIL: "support@example.com",
  EXPO_PUBLIC_LEGAL_EFFECTIVE_DATE: "2026-09-05",
  EXPO_PUBLIC_WEB_PUSH_KEY: "A".repeat(87),
};
const projectId = "00000000-0000-4000-8000-000000000000";
assert.doesNotThrow(() => validateReleaseEnvironment(env, projectId));
assert.throws(() =>
  validateReleaseEnvironment(
    { ...env, EXPO_PUBLIC_SITE_URL: "http://localhost" },
    projectId,
  ),
);
assert.throws(() =>
  validateReleaseEnvironment(
    { ...env, EXPO_PUBLIC_LEGAL_EFFECTIVE_DATE: "2026-02-31" },
    projectId,
  ),
);
assert.throws(() =>
  validateReleaseEnvironment(
    { ...env, EXPO_PUBLIC_SUPPORT_EMAIL: "" },
    projectId,
  ),
);
assert.throws(() =>
  validateReleaseEnvironment(
    { ...env, EXPO_PUBLIC_WEB_PUSH_KEY: "" },
    projectId,
  ),
);
console.log("출시 설정 누락·주소·시행일 검증 통과");
