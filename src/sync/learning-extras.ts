import { supabase } from "@/lib/supabase";
import {
  historySchema,
  mockHistorySchema,
  notesSchema,
  presetsSchema,
  targetSchema,
} from "@/storage/data-schemas";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

const extrasSchema = z.object({
  notes: notesSchema,
  presets: presetsSchema,
  history: historySchema,
  mocks: mockHistorySchema,
  target: targetSchema,
});
type Extras = z.infer<typeof extrasSchema>;
const keys = [
  "wrong-answer-notes:v1",
  "custom-session-presets:v1",
  "learning-session-history:v1",
  "mock-exam-history:v1",
  "study-target:v1",
].map((key) => `exam-loop:${key}`);
const BASELINE_KEY = "exam-loop:learning-extras-baseline:v1";
const empty: Extras = {
  notes: {},
  presets: {},
  history: [],
  mocks: [],
  target: null,
};
let extrasQueue: Promise<void> = Promise.resolve();
let generation = 0;

// 계정 전환 중 부가 기록 쓰기 중단
export function invalidateLearningExtras(): void {
  generation += 1;
}

// 부가 기록 저장 종료 대기
export async function settleLearningExtras(): Promise<void> {
  await extrasQueue.catch(() => undefined);
}

// 변경된 로컬 항목과 서버 항목 병합
function mergeMap<T>(
  local: Record<string, T>,
  remote: Record<string, T>,
  baseline: Record<string, T>,
): Record<string, T> {
  const merged = { ...remote };
  for (const [key, value] of Object.entries(local)) {
    if (
      JSON.stringify(value) !== JSON.stringify(baseline[key]) ||
      !(key in remote)
    )
      merged[key] = value;
  }
  return merged;
}

// 기기별 신규 학습 이력 합치기
function mergeHistory<T extends { id: string; completedAt: number }>(
  local: T[],
  remote: T[],
  limit: number,
): T[] {
  return [
    ...new Map([...remote, ...local].map((item) => [item.id, item])).values(),
  ]
    .sort((a, b) => b.completedAt - a.completedAt)
    .slice(0, limit);
}

// 오답 메모·목표·학습 이력 동기화
export function synchronizeLearningExtras(userId: string): Promise<void> {
  const version = generation;
  const task = extrasQueue
    .catch(() => undefined)
    .then(async () => {
      const client = supabase;
      if (client == null || version !== generation) return;
      const { data: session } = await client.auth.getSession();
      if (session.session?.user.id !== userId) return;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        const localRows = await AsyncStorage.multiGet(keys);
        const local = extrasSchema.parse({
          notes: JSON.parse(localRows[0][1] ?? "{}"),
          presets: JSON.parse(localRows[1][1] ?? "{}"),
          history: JSON.parse(localRows[2][1] ?? "[]"),
          mocks: JSON.parse(localRows[3][1] ?? "[]"),
          target: JSON.parse(localRows[4][1] ?? "null"),
        });
        const baseline = extrasSchema.parse(
          JSON.parse(
            (await AsyncStorage.getItem(BASELINE_KEY)) ?? JSON.stringify(empty),
          ),
        );
        const { data, error } = await client
          .from("user_learning_extras")
          .select("revision,snapshot")
          .eq("user_id", userId)
          .maybeSingle();
        if (error) throw error;
        const remote = data == null ? empty : extrasSchema.parse(data.snapshot);
        const merged: Extras = {
          notes: mergeMap(local.notes, remote.notes, baseline.notes),
          presets: mergeMap(local.presets, remote.presets, baseline.presets),
          history: mergeHistory(local.history, remote.history, 100),
          mocks: mergeHistory(local.mocks, remote.mocks, 50),
          target:
            JSON.stringify(local.target) !== JSON.stringify(baseline.target)
              ? local.target
              : remote.target,
        };
        if (version !== generation) return;
        const { error: saveError } =
          JSON.stringify(merged) === JSON.stringify(remote)
            ? { error: null }
            : await client.rpc("save_learning_extras", {
                p_revision: data?.revision ?? 0,
                p_snapshot: merged,
              });
        if (saveError?.code === "40001" && attempt < 2) continue;
        if (saveError) throw saveError;
        if (version !== generation) return;
        // 전송 중 새로 편집된 기록 보호
        const latest = await AsyncStorage.multiGet(keys);
        const mergedValues = [
          merged.notes,
          merged.presets,
          merged.history,
          merged.mocks,
          merged.target,
        ];
        const updates: [string, string][] = keys.flatMap((key, index) =>
          latest[index][1] === localRows[index][1] &&
          latest[index][1] !== JSON.stringify(mergedValues[index])
            ? [[key, JSON.stringify(mergedValues[index])] as [string, string]]
            : [],
        );
        const writes: [string, string][] = [
          ...updates,
          ...(JSON.stringify(baseline) === JSON.stringify(merged)
            ? []
            : [[BASELINE_KEY, JSON.stringify(merged)] as [string, string]]),
        ];
        if (writes.length > 0) await AsyncStorage.multiSet(writes);
        return;
      }
    });
  extrasQueue = task;
  return task;
}
