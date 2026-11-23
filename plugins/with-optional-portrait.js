const { withAndroidManifest } = require("expo/config-plugins");

const PORTRAIT_FEATURE = "android.hardware.screen.portrait";

// 세로 화면 기능을 필수가 아닌 선택 사항으로 선언
module.exports = function withOptionalPortrait(config) {
  return withAndroidManifest(config, (next) => {
    const manifest = next.modResults.manifest;
    const others = (manifest["uses-feature"] ?? []).filter(
      (feature) => feature.$["android:name"] !== PORTRAIT_FEATURE,
    );
    manifest["uses-feature"] = [
      ...others,
      { $: { "android:name": PORTRAIT_FEATURE, "android:required": "false" } },
    ];
    return next;
  });
};
