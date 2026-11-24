const { withGradleProperties } = require("expo/config-plugins");

const BACKEND_KEY = "RNGMA_ANDROID_BACKEND";

// 광고 SDK 안드로이드 백엔드 지정
module.exports = function withAdsBackend(config) {
  return withGradleProperties(config, (next) => {
    next.modResults = [
      ...next.modResults.filter(
        (item) => item.type !== "property" || item.key !== BACKEND_KEY,
      ),
      { type: "property", key: BACKEND_KEY, value: "classic" },
    ];
    return next;
  });
};
