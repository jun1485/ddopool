import { useEffect, useRef, useState } from "react";

// 활성 세션 제한 시간 카운트다운
export function useCountdown(
  durationSeconds: number,
  active: boolean,
  onExpire: () => void,
): number {
  const [remainingSeconds, setRemainingSeconds] = useState(durationSeconds);
  const onExpireRef = useRef(onExpire);

  // 제한 시간 종료 동작 갱신
  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  // 활성 세션 남은 시간 갱신
  useEffect(() => {
    if (!active) return;

    let expired = false;
    const expiresAt = Date.now() + durationSeconds * 1000;

    // 현재 시각 기준 남은 시간 계산
    const updateRemainingTime = () => {
      const nextRemainingSeconds = Math.max(
        0,
        Math.ceil((expiresAt - Date.now()) / 1000),
      );
      setRemainingSeconds(nextRemainingSeconds);
      if (nextRemainingSeconds > 0 || expired) return;
      expired = true;
      onExpireRef.current();
    };

    const initialTimer = setTimeout(updateRemainingTime, 0);
    const timer = setInterval(updateRemainingTime, 250);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(timer);
    };
  }, [active, durationSeconds]);

  return remainingSeconds;
}
