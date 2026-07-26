import type { PropsWithChildren } from "react";
import { Platform, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  ZoomIn,
  ZoomOut,
  useReducedMotion,
} from "react-native-reanimated";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { Durations } from "@/constants/motion";
import { Alpha, MaxContentWidth } from "@/constants/theme";

// 모달 표시 형태 (sheet: 하단 시트, center: 중앙 다이얼로그)
export type ModalOverlayVariant = "sheet" | "center";

export interface ModalOverlayProps {
  variant?: ModalOverlayVariant;
  closeLabel?: string;
  onRequestClose?: () => void;
}

// 모달 배경·내용 등장·퇴장 전환 래퍼
export function ModalOverlay({
  variant = "center",
  closeLabel = "닫기",
  onRequestClose,
  children,
}: PropsWithChildren<ModalOverlayProps>) {
  const reduceMotion = useReducedMotion();
  const contentEntering =
    variant === "sheet"
      ? SlideInDown.duration(Durations.base)
      : ZoomIn.duration(Durations.fast);
  const contentExiting =
    variant === "sheet"
      ? SlideOutDown.duration(Durations.fast)
      : ZoomOut.duration(Durations.instant);

  return (
    <View
      style={[
        styles.overlay,
        variant === "sheet" ? styles.sheetAlign : styles.centerAlign,
      ]}
      // 웹은 aria-hidden 대신 dialog 역할만 부여 (포커스 잔류 경고 방지)
      accessibilityViewIsModal={Platform.OS !== "web"}
      role={Platform.OS === "web" ? "dialog" : undefined}
      aria-modal={Platform.OS === "web" ? true : undefined}
    >
      <Animated.View
        entering={reduceMotion ? undefined : FadeIn.duration(Durations.fast)}
        exiting={reduceMotion ? undefined : FadeOut.duration(Durations.fast)}
        style={styles.backdropLayer}
      >
        {onRequestClose == null ? (
          <View style={styles.backdrop} />
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={closeLabel}
            motionScale={1}
            onPress={onRequestClose}
            style={styles.backdrop}
          />
        )}
      </Animated.View>
      <Animated.View
        entering={reduceMotion ? undefined : contentEntering}
        exiting={reduceMotion ? undefined : contentExiting}
        style={variant === "sheet" ? styles.sheetContent : styles.centerContent}
      >
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: Platform.OS === "web" ? "fixed" : "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    zIndex: 20,
  },
  sheetAlign: {
    justifyContent: "flex-end",
  },
  centerAlign: {
    justifyContent: "center",
  },
  backdropLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backdrop: {
    flex: 1,
    backgroundColor: Alpha.scrim,
  },
  sheetContent: {
    width: "100%",
    maxWidth: MaxContentWidth,
  },
  centerContent: {
    width: "100%",
    maxWidth: MaxContentWidth,
    padding: 24,
  },
});
