import type { ComponentPropsWithRef } from "react";
import { StyleSheet, TextInput } from "react-native";

import { fontStyle } from "@/constants/fonts";

// Pretendard 를 쓰는 입력칸
export function AppTextInput({
  style,
  ...rest
}: ComponentPropsWithRef<typeof TextInput>) {
  const flat = StyleSheet.flatten(style);
  return (
    <TextInput
      {...rest}
      style={[style, flat?.fontFamily ? null : fontStyle(flat?.fontWeight)]}
    />
  );
}
