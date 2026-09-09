const REQUIRED_RELEASE_VALUES = [
  "EXPO_PUBLIC_SUPABASE_URL",
  "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "EXPO_PUBLIC_SITE_URL",
  "EXPO_PUBLIC_OPERATOR_NAME",
  "EXPO_PUBLIC_PRIVACY_OFFICER_NAME",
  "EXPO_PUBLIC_SUPPORT_EMAIL",
  "EXPO_PUBLIC_LEGAL_EFFECTIVE_DATE",
  "EXPO_PUBLIC_WEB_PUSH_KEY",
];

// 출시 설정 누락·잘못된 주소 차단
function validateReleaseEnvironment(env, projectId) {
  const errors = REQUIRED_RELEASE_VALUES.filter((name) => !env[name]?.trim());
  for (const name of ["EXPO_PUBLIC_SUPABASE_URL", "EXPO_PUBLIC_SITE_URL"]) {
    if (!env[name]) continue;
    try {
      const url = new URL(env[name]);
      if (
        url.protocol !== "https:" ||
        url.username ||
        url.password ||
        url.hostname === "localhost"
      )
        errors.push(name);
    } catch {
      errors.push(name);
    }
  }
  if (
    env.EXPO_PUBLIC_SUPPORT_EMAIL &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.EXPO_PUBLIC_SUPPORT_EMAIL)
  )
    errors.push("EXPO_PUBLIC_SUPPORT_EMAIL");
  const date = env.EXPO_PUBLIC_LEGAL_EFFECTIVE_DATE;
  if (
    date &&
    (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(Date.parse(date)) ||
      new Date(date).toISOString().slice(0, 10) !== date)
  )
    errors.push("EXPO_PUBLIC_LEGAL_EFFECTIVE_DATE");
  if (!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(projectId ?? ""))
    errors.push("EAS_PROJECT_ID");
  if (errors.length)
    throw new Error(
      `출시 설정을 확인해 주세요: ${[...new Set(errors)].join(", ")}`,
    );
}

module.exports = { validateReleaseEnvironment };
