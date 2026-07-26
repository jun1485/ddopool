import { ThemedText, type ThemedTextProps } from "@/components/themed-text";
import { useCountUp } from "@/hooks/use-count-up";

export interface AnimatedCounterProps extends Omit<ThemedTextProps, "children"> {
  value: number;
  suffix?: string;
  prefix?: string;
  fractionDigits?: number;
  duration?: number;
}

// 수치 변화 롤업 표시 텍스트
export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  fractionDigits = 0,
  duration,
  ...props
}: AnimatedCounterProps) {
  const displayValue = useCountUp(value, duration);

  return (
    <ThemedText {...props}>
      {prefix}
      {displayValue.toFixed(fractionDigits)}
      {suffix}
    </ThemedText>
  );
}
