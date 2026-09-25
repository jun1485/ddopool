import { Image } from "expo-image";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  Keyframe,
  useReducedMotion,
} from "react-native-reanimated";

const INITIAL_SCALE_FACTOR = Dimensions.get("screen").height / 90;
const DURATION = 600;

// 네이티브 시작 화면 종료
export function AnimatedSplashOverlay() {
  useEffect(() => {
    void SplashScreen.hideAsync();
  }, []);

  return null;
}

const keyframe = new Keyframe({
  0: {
    transform: [{ scale: INITIAL_SCALE_FACTOR }],
  },
  100: {
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
  },
  40: {
    transform: [{ scale: 1.3 }],
    opacity: 0,
    easing: Easing.elastic(0.7),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.elastic(0.7),
  },
});

const glowKeyframe = new Keyframe({
  0: {
    transform: [{ rotateZ: "0deg" }],
  },
  100: {
    transform: [{ rotateZ: "7200deg" }],
  },
});

// 앱 아이콘 모션 표시
export function AnimatedIcon() {
  const reduceMotion = useReducedMotion();
  return (
    <View style={styles.iconContainer}>
      <Animated.View
        entering={
          reduceMotion ? undefined : glowKeyframe.duration(60 * 1000 * 4)
        }
        style={styles.glow}
      >
        <Image
          style={styles.glow}
          source={require("@/assets/images/brand-glow.png")}
        />
      </Animated.View>

      <Animated.View
        entering={reduceMotion ? undefined : keyframe.duration(DURATION)}
        style={styles.background}
      />
      <Animated.View
        style={styles.imageContainer}
        entering={reduceMotion ? undefined : logoKeyframe.duration(DURATION)}
      >
        <Image
          style={styles.image}
          source={require("@/assets/images/splash-icon.png")}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  glow: {
    width: 201,
    height: 201,
    position: "absolute",
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
    width: 128,
    height: 128,
    zIndex: 100,
  },
  image: {
    width: 96,
    height: 96,
  },
  background: {
    borderRadius: 40,
    experimental_backgroundImage: `linear-gradient(180deg, #A594F5, #6A52DE)`,
    width: 128,
    height: 128,
    position: "absolute",
  },
});
