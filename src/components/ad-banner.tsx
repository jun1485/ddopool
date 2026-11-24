import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { adsModule, adUnitId } from "@/lib/ads";

// 배너를 받기 전 비워 두는 높이
const BANNER_MIN_HEIGHT = 50;

// 화면 하단 고정 배너 광고
export function AdBanner() {
  const theme = useTheme();
  const [height, setHeight] = useState(BANNER_MIN_HEIGHT);
  if (adsModule == null) return null;
  const { BannerAd, BannerAdSize } = adsModule;

  return (
    <View style={[styles.wrap, { height, backgroundColor: theme.background }]}>
      <BannerAd
        unitId={adUnitId(adsModule, "banner")}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdLoaded={(size) =>
          setHeight(Math.max(size.height, BANNER_MIN_HEIGHT))
        }
        // 광고를 못 받으면 자리 접기
        onAdFailedToLoad={() => setHeight(0)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    overflow: "hidden",
  },
});
