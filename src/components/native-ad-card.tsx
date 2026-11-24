import { Image, StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import { adsModule, adUnitId } from "@/lib/ads";

type AdsModule = NonNullable<typeof adsModule>;

// 홈 목록 아래 네이티브 광고 카드
export function NativeAdCard() {
  return adsModule ? <LoadedNativeAd ads={adsModule} /> : null;
}

// 네이티브 광고 로드 후 카드 표시
function LoadedNativeAd({ ads }: { ads: AdsModule }) {
  const theme = useTheme();
  const { NativeAdView, NativeAsset, NativeAssetType, useNativeAd } = ads;
  const result = useNativeAd({ adUnitId: adUnitId(ads, "native") });
  // 광고를 받기 전이나 못 받으면 자리 비움
  if (result.status !== "loaded") return null;
  const { nativeAd } = result;

  return (
    <NativeAdView nativeAd={nativeAd}>
      <View
        style={[
          styles.card,
          styles.row,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.cardBorder,
          },
        ]}
      >
        {nativeAd.icon && (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image source={{ uri: nativeAd.icon.url }} style={styles.icon} />
          </NativeAsset>
        )}
        <View style={styles.body}>
          <View style={styles.metaRow}>
            <ThemedText
              type="smallBold"
              style={[
                styles.badge,
                { color: theme.warning, backgroundColor: theme.warningSoft },
              ]}
            >
              광고
            </ThemedText>
            {nativeAd.advertiser && (
              <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={1}
                  style={styles.flex}
                >
                  {nativeAd.advertiser}
                </ThemedText>
              </NativeAsset>
            )}
          </View>
          <NativeAsset assetType={NativeAssetType.HEADLINE}>
            <ThemedText type="smallBold" numberOfLines={2}>
              {nativeAd.headline}
            </ThemedText>
          </NativeAsset>
        </View>
        {nativeAd.callToAction && (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <ThemedText
              type="smallBold"
              style={[
                styles.cta,
                { color: theme.primary, backgroundColor: theme.primarySoft },
              ]}
            >
              {nativeAd.callToAction}
            </ThemedText>
          </NativeAsset>
        )}
      </View>
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: Radius.large,
    padding: Spacing.three,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: Radius.medium,
  },
  body: {
    flex: 1,
    gap: Spacing.one,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  badge: {
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.small,
    overflow: "hidden",
  },
  flex: {
    flex: 1,
  },
  cta: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    overflow: "hidden",
  },
});
