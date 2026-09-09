import { PostgrestError } from "@supabase/supabase-js";
import { expect, test } from "@jest/globals";
import { readAllPages } from "./read-all-pages";

test("첫 페이지를 초과한 항목을 누락하지 않는다", async () => {
  const records = Array.from({ length: 1207 }, (_, id) => ({ id }));
  const result = await readAllPages(async (from, to) => ({
    data: records.slice(from, to + 1),
    error: null,
  }));
  expect(result).toEqual(records);
});
test("중간 페이지 오류를 성공 목록으로 반환하지 않는다", async () => {
  await expect(
    readAllPages(async () => ({
      data: null,
      error: new PostgrestError({
        code: "failed",
        message: "실패",
        details: "",
        hint: "",
      }),
    })),
  ).rejects.toMatchObject({ code: "failed" });
});
