import { beforeEach, expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  beginBackupRestore,
  commitBackupRestore,
  recoverBackupRestore,
} from "./backup-recovery";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
beforeEach(async () => {
  await AsyncStorage.clear();
});

test("복원 도중 종료되면 원본과 원래 없던 값을 되돌린다", async () => {
  const original = "exam-loop:daily-stats";
  const absent = "exam-loop:active-quiz-session:v1";
  await AsyncStorage.setItem(original, "원본");
  await beginBackupRestore([original, absent]);
  await AsyncStorage.multiSet([
    [original, "중간 값"],
    [absent, "중간 세션"],
  ]);
  await recoverBackupRestore();
  expect(await AsyncStorage.getItem(original)).toBe("원본");
  expect(await AsyncStorage.getItem(absent)).toBeNull();
  await recoverBackupRestore();
  expect(await AsyncStorage.getItem(original)).toBe("원본");
});

test("확정된 백업은 재시작에서 되돌리지 않는다", async () => {
  const key = "exam-loop:daily-stats";
  await beginBackupRestore([key]);
  await AsyncStorage.setItem(key, "복원 완료 값");
  await commitBackupRestore();
  await recoverBackupRestore();
  expect(await AsyncStorage.getItem(key)).toBe("복원 완료 값");
});
