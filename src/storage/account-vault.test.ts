import { beforeEach, expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  markDeletedAccount,
  completeAccountDeletion,
  recoverDeletedAccount,
  switchAccountVault,
} from "./account-vault";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("@/storage/settle-learning-writes", () => ({
  settleLearningWrites: jest
    .fn<() => Promise<void>>()
    .mockResolvedValue(undefined),
}));
const NOTE_KEY = "exam-loop:wrong-answer-notes:v1";

beforeEach(async () => {
  await AsyncStorage.clear();
});

test("계정 A 기록이 비회원과 계정 B에 노출되지 않고 재로그인 시 복원된다", async () => {
  await switchAccountVault("account-a");
  await AsyncStorage.setItem(NOTE_KEY, "계정 A 메모");
  await AsyncStorage.setItem(
    "exam-loop:mock-exam-history:v1",
    "계정 A 모의고사",
  );
  await switchAccountVault(null);
  expect(await AsyncStorage.getItem(NOTE_KEY)).toBeNull();
  await switchAccountVault("account-b");
  expect(
    await AsyncStorage.getItem("exam-loop:mock-exam-history:v1"),
  ).toBeNull();
  await AsyncStorage.setItem(NOTE_KEY, "계정 B 메모");
  await switchAccountVault("account-a");
  expect(await AsyncStorage.getItem(NOTE_KEY)).toBe("계정 A 메모");
  await switchAccountVault("account-b");
  expect(await AsyncStorage.getItem(NOTE_KEY)).toBe("계정 B 메모");
});

test("계정 삭제 후 보관함을 재생성하지 않는다", async () => {
  await switchAccountVault("account-a");
  await AsyncStorage.setItem(NOTE_KEY, "삭제할 메모");
  await switchAccountVault(null, true);
  await switchAccountVault("account-a");
  expect(await AsyncStorage.getItem(NOTE_KEY)).toBeNull();
});

test("서버 삭제 직후 앱이 중단돼도 다음 시작에서 기기 기록을 제거한다", async () => {
  await switchAccountVault("account-a");
  await AsyncStorage.setItem(NOTE_KEY, "삭제할 메모");
  await markDeletedAccount("account-a");
  expect(await recoverDeletedAccount()).toBe(true);
  expect(await recoverDeletedAccount()).toBe(true);
  await completeAccountDeletion();
  expect(await recoverDeletedAccount()).toBe(false);
  await switchAccountVault("account-a");
  expect(await AsyncStorage.getItem(NOTE_KEY)).toBeNull();
});

test("중단된 전환 저널을 먼저 복구한다", async () => {
  await AsyncStorage.setItem(
    "exam-loop:account-transition:v1",
    JSON.stringify({
      owner: "account-b",
      snapshot: { [NOTE_KEY]: "복원 메모" },
    }),
  );
  await AsyncStorage.setItem(NOTE_KEY, "이전 계정 메모");
  await switchAccountVault("account-b");
  expect(await AsyncStorage.getItem(NOTE_KEY)).toBe("복원 메모");
  expect(
    await AsyncStorage.getItem("exam-loop:account-transition:v1"),
  ).toBeNull();
});

test("손상된 보관함은 이전 기록을 지우기 전에 실패한다", async () => {
  await switchAccountVault("account-a");
  await AsyncStorage.setItem(NOTE_KEY, "원본 메모");
  await AsyncStorage.setItem("exam-loop:account-vault:v1:account-b", "invalid");
  await expect(switchAccountVault("account-b")).rejects.toThrow();
  expect(await AsyncStorage.getItem(NOTE_KEY)).toBe("원본 메모");
});
