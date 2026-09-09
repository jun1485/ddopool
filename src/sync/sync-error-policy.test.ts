import { expect, test } from "@jest/globals";
import { isPermanentSyncError } from "./sync-error-policy";

test.each([401, 408, 425, 429, 500, 503])(
  "일시 오류 %i는 다시 전송한다",
  (status) => {
    expect(isPermanentSyncError("", status)).toBe(false);
  },
);
test.each([
  ["23503", 409],
  ["23514", 400],
  ["42501", 403],
])("제약·권한 오류 %s는 영구 오류로 분류한다", (code, status) => {
  expect(isPermanentSyncError(String(code), Number(status))).toBe(true);
});
