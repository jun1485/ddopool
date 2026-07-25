import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import type { StudyTarget } from "@/learning/exam-pace";
import {
  loadStudyTarget,
  saveStudyTarget,
  subscribeStudyTarget,
} from "@/storage/study-target-store";

// 시험 학습 목표 상태 관리
export function useStudyTarget() {
  const [target, setTarget] = useState<StudyTarget | null>(null);
  const [evaluatedAt, setEvaluatedAt] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // 시험 학습 목표 즉시 반영
  const applyTarget = useCallback((nextTarget: StudyTarget | null) => {
    setTarget(nextTarget);
  }, []);

  // 시험 학습 목표 갱신
  const reload = useCallback(async () => {
    const storedTarget = await loadStudyTarget();
    applyTarget(storedTarget);
    setEvaluatedAt(Date.now());
    setIsLoading(false);
  }, [applyTarget]);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  // 시험 학습 목표 변경 실시간 반영
  useEffect(() => subscribeStudyTarget(applyTarget), [applyTarget]);

  // 시험 학습 목표 저장
  const updateTarget = useCallback(
    async (nextTarget: StudyTarget) => {
      applyTarget(nextTarget);
      setEvaluatedAt(Date.now());
      await saveStudyTarget(nextTarget);
    },
    [applyTarget],
  );

  return {
    target,
    isLoading,
    evaluatedAt,
    updateTarget,
  };
}
