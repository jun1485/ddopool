import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { Durations } from "@/constants/motion";
import { Radius } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export interface CelebrationBurstProps {
  trigger: number;
  colors?: string[];
  particleCount?: number;
  distance?: number;
}

interface BurstParticleProps {
  trigger: number;
  angle: number;
  color: string;
  delay: number;
  distance: number;
}

// 조각 하나의 방사 확산 전환
function BurstParticle({
  trigger,
  angle,
  color,
  delay,
  distance,
}: BurstParticleProps) {
  const progress = useSharedValue(0);

  // trigger 변경 시 확산 재생
  useEffect(() => {
    if (trigger === 0) return;
    progress.value = 0;
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration: Durations.celebrate,
        easing: Easing.out(Easing.quad),
      }),
    );
  }, [delay, progress, trigger]);

  const particleStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.12, 0.7, 1], [0, 1, 0.9, 0]),
    transform: [
      { translateX: Math.cos(angle) * distance * progress.value },
      { translateY: Math.sin(angle) * distance * progress.value - 8 },
      { scale: interpolate(progress.value, [0, 0.25, 1], [0.3, 1, 0.45]) },
      { rotate: `${progress.value * 220}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[styles.particle, { backgroundColor: color }, particleStyle]}
    />
  );
}

// 목표 달성·정답 축하 조각 확산 레이어
export function CelebrationBurst({
  trigger,
  colors,
  particleCount = 14,
  distance = 86,
}: CelebrationBurstProps) {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();
  const palette = colors ?? [
    theme.primary,
    theme.success,
    theme.warning,
    theme.danger,
  ];

  if (reduceMotion || trigger === 0) return null;

  return (
    <View pointerEvents="none" style={styles.layer}>
      {Array.from({ length: particleCount }, (_, index) => (
        <BurstParticle
          key={index}
          trigger={trigger}
          angle={(index / particleCount) * Math.PI * 2}
          color={palette[index % palette.length]}
          delay={index * 18}
          distance={distance * (0.65 + ((index % 4) + 1) / 6)}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 5,
  },
  particle: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: Radius.small,
  },
});
