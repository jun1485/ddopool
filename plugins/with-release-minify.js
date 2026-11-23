const { withGradleProperties } = require("expo/config-plugins");

const RELEASE_FLAGS = {
  "android.enableMinifyInReleaseBuilds": "true",
  "android.enableShrinkResourcesInReleaseBuilds": "true",
};

// 릴리스 빌드 코드 난독화·리소스 축소 켜기
module.exports = function withReleaseMinify(config) {
  return withGradleProperties(config, (next) => {
    const others = next.modResults.filter(
      (item) => item.type !== "property" || !(item.key in RELEASE_FLAGS),
    );
    next.modResults = [
      ...others,
      ...Object.entries(RELEASE_FLAGS).map(([key, value]) => ({
        type: "property",
        key,
        value,
      })),
    ];
    return next;
  });
};
