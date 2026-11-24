import { TurboModuleRegistry } from "react-native";

type AdsModule = typeof import("react-native-google-mobile-ads");

const AD_UNITS = {
  banner: "ca-app-pub-1289246991166233/7009597525",
  native: "ca-app-pub-1289246991166233/1432083191",
};

// 광고 모듈 로드, 광고 SDK가 없는 빌드는 광고 생략
export const adsModule: AdsModule | null =
  TurboModuleRegistry.get("RNGoogleMobileAdsModule") == null
    ? null
    : // eslint-disable-next-line @typescript-eslint/no-require-imports
      require("react-native-google-mobile-ads");

// 광고 단위 ID 조회, 개발·내부 시험 빌드는 테스트 광고
export function adUnitId(ads: AdsModule, unit: keyof typeof AD_UNITS) {
  if (!__DEV__ && process.env.EXPO_PUBLIC_TEST_ADS !== "1")
    return AD_UNITS[unit];
  return unit === "banner" ? ads.TestIds.ADAPTIVE_BANNER : ads.TestIds.NATIVE;
}

// 광고 SDK 초기화
export function initAds() {
  if (adsModule == null) return;
  const mobileAds = adsModule.default();
  // 청소년 이용자를 위한 광고 등급 제한
  mobileAds
    .setRequestConfiguration({
      maxAdContentRating: adsModule.MaxAdContentRating.T,
    })
    .then(() => mobileAds.initialize())
    .catch(() => undefined);
}
