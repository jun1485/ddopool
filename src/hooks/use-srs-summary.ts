import { useFocusEffect } from "expo-router";
import { useCallback, useMemo, useState } from "react";

import { loadSrsCards, SrsCardMap } from "@/storage/srs-store";

const DAY_MS = 24 * 60 * 60 * 1000;

// 시험별 복습 도래·학습 문항 수 집계 훅
export function useSrsSummary() {
  const [cards, setCards] = useState<SrsCardMap>({});
  const [dueCounts, setDueCounts] = useState<Record<string, number>>({});
  const [studiedCounts, setStudiedCounts] = useState<Record<string, number>>(
    {},
  );
  const [matureCounts, setMatureCounts] = useState<Record<string, number>>({});
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [scheduledCount, setScheduledCount] = useState(0);
  const [recentExamId, setRecentExamId] = useState<string | null>(null);
  const [evaluatedAt, setEvaluatedAt] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // SRS 카드 기반 시험별 집계 갱신
  const reload = useCallback(async () => {
    const cards = await loadSrsCards();
    const now = Date.now();

    const due: Record<string, number> = {};
    const studied: Record<string, number> = {};
    const mature: Record<string, number> = {};
    let upcoming = 0;
    let scheduled = 0;
    let latestReviewedAt = 0;
    let latestExamId: string | null = null;

    for (const card of Object.values(cards)) {
      studied[card.examId] = (studied[card.examId] ?? 0) + 1;
      if (card.repetitions >= 2)
        mature[card.examId] = (mature[card.examId] ?? 0) + 1;
      if (card.dueAt <= now) due[card.examId] = (due[card.examId] ?? 0) + 1;
      else if (card.dueAt <= now + DAY_MS) upcoming += 1;
      else scheduled += 1;

      if (card.lastReviewedAt > latestReviewedAt) {
        latestReviewedAt = card.lastReviewedAt;
        latestExamId = card.examId;
      }
    }

    setCards(cards);
    setDueCounts(due);
    setStudiedCounts(studied);
    setMatureCounts(mature);
    setUpcomingCount(upcoming);
    setScheduledCount(scheduled);
    setRecentExamId(latestExamId);
    setEvaluatedAt(now);
    setIsLoading(false);
  }, []);

  // 화면 포커스 시 집계 갱신
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  const totalDue = useMemo(
    () => Object.values(dueCounts).reduce((sum, count) => sum + count, 0),
    [dueCounts],
  );
  const totalStudied = useMemo(
    () => Object.values(studiedCounts).reduce((sum, count) => sum + count, 0),
    [studiedCounts],
  );

  return {
    cards,
    dueCounts,
    studiedCounts,
    matureCounts,
    totalDue,
    totalStudied,
    upcomingCount,
    scheduledCount,
    recentExamId,
    evaluatedAt,
    isLoading,
  };
}
