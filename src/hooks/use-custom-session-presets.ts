import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import {
  CustomSessionPresetMap,
  loadCustomSessionPresets,
  saveCustomSessionPreset,
  subscribeCustomSessionPresets,
} from "@/storage/custom-session-preset-store";
import type { SaveCustomSessionPresetInput } from "@/storage/custom-session-preset-store";

// 시험별 저장 학습 루틴 관리
export function useCustomSessionPresets() {
  const [presets, setPresets] = useState<CustomSessionPresetMap>({});
  const [isLoading, setIsLoading] = useState(true);

  // 저장 학습 루틴 갱신
  const reload = useCallback(async () => {
    setPresets(await loadCustomSessionPresets());
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  // 저장 학습 루틴 변경 실시간 반영
  useEffect(() => subscribeCustomSessionPresets(setPresets), []);

  // 시험별 현재 맞춤 조건 저장
  const savePreset = useCallback(
    (input: SaveCustomSessionPresetInput) =>
      saveCustomSessionPreset(input),
    [],
  );

  return { presets, isLoading, reload, savePreset };
}
