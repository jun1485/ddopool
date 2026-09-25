import { Image } from "expo-image";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withSpring,
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
  const tapBounce = useSharedValue(0);

  const bodyStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -tapBounce.value * 4 }],
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
          source={require("@/assets/images/splash-icon.png")}
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
