import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "react-native-reanimated";

import { Durations } from "@/constants/motion";

// 목표값까지 감속 증가하는 표시값 제공
export function useCountUp(
  value: number,
  duration: number = Durations.slower,
): number {
  const reduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(value);
  const fromValueRef = useRef(value);

  useEffect(() => {
    const fromValue = fromValueRef.current;
    if (reduceMotion || duration <= 0 || fromValue === value) {
      fromValueRef.current = value;
      setDisplayValue(value);
      return;
    }

    let frameId = 0;
    let startedAt = 0;
    // 경과 시간 기준 감속 보간 값 갱신
    const step = (timestamp: number) => {
      if (startedAt === 0) startedAt = timestamp;
      const ratio = Math.min((timestamp - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - ratio, 3);
      const next = fromValue + (value - fromValue) * eased;
      setDisplayValue(ratio === 1 ? value : next);
      if (ratio < 1) frameId = requestAnimationFrame(step);
      else fromValueRef.current = value;
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [duration, reduceMotion, value]);

  return displayValue;
}
