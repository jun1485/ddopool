import type { PostgrestError } from "@supabase/supabase-js";

// 공개 목록 전체 페이지 수집
export async function readAllPages<T>(
  fetchPage: (
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
): Promise<T[]> {
  const rows: T[] = [];
  const size = 500;
  for (let from = 0; ; from += size) {
    const { data, error } = await fetchPage(from, from + size - 1);
    if (error != null) throw error;
    const page = data ?? [];
    rows.push(...page);
    if (page.length < size) return rows;
  }
}
