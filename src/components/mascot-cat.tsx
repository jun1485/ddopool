import { Image } from "expo-image";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { Springs } from "@/constants/motion";
import { Radius } from "@/constants/theme";

export interface MascotCatProps {
  size?: number;
  onPress?: () => void;
}

// 흰 고양이 학습 마스코트 표시
export function MascotCat({ size = 52, onPress }: MascotCatProps) {
  const reduceMotion = useReducedMotion();
  const bob = useSharedValue(0);
  const tapBounce = useSharedValue(0);

  // 마스코트 부유 모션 반복
  useEffect(() => {
    if (reduceMotion) return;
    bob.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    return () => {
      cancelAnimation(bob);
    };
  }, [bob, reduceMotion]);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -bob.value * 2 - tapBounce.value * 4 }],
  }));

  // 마스코트 탭 반동
  const handlePress = () => {
    if (!reduceMotion)
      tapBounce.value = withSequence(
        withSpring(1, Springs.pop),
        withSpring(0, Springs.pop),
      );
    onPress?.();
  };

  return (
    <Pressable
      accessibilityRole="image"
      accessibilityLabel="리본을 단 귀여운 흰 고양이 학습 마스코트"
      onPress={handlePress}
      style={[styles.wrapper, { width: size, height: size }]}
    >
      <Animated.View style={[styles.layer, bodyStyle]}>
        <Image
          accessible={false}
          source={require("@/assets/images/mascot-cat.png")}
          contentFit="cover"
          style={styles.image}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: Radius.pill,
    transform: [{ scale: 1.08 }],
  },
  layer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
