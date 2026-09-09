import { beforeEach, expect, jest, test } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { synchronizeLearningExtras } from "./learning-extras";

jest.mock("@react-native-async-storage/async-storage", () =>
  jest.requireActual(
    "@react-native-async-storage/async-storage/jest/async-storage-mock",
  ),
);
jest.mock("@/lib/supabase", () => {
  const read = jest.fn();
  const query = { select: jest.fn(), eq: jest.fn(), maybeSingle: read };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  return {
    supabase: {
      auth: { getSession: jest.fn() },
      from: jest.fn(() => query),
      rpc: jest.fn(),
    },
    read,
  };
});
const empty = { notes: {}, presets: {}, history: [], mocks: [], target: null };
const target = {
  examId: "sample",
  targetDate: "2026-12-01",
  studyDaysPerWeek: 5,
  createdAt: 1,
  startingQuestionCount: 10,
  startingStudiedCount: 0,
};
interface MockApi {
  read: jest.Mock<
    () => Promise<{
      data: { revision: number; snapshot: typeof empty };
      error: null;
    }>
  >;
  supabase: {
    auth: {
      getSession: jest.Mock<
        () => Promise<{ data: { session: { user: { id: string } } } }>
      >;
    };
    rpc: jest.Mock<() => Promise<{ error: { code: string } | null }>>;
  };
}
const api = jest.requireMock<MockApi>("@/lib/supabase");
beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  api.supabase.auth.getSession.mockResolvedValue({
    data: { session: { user: { id: "sample-user" } } },
  });
  api.read.mockResolvedValue({
    data: { revision: 1, snapshot: empty },
    error: null,
  });
  api.supabase.rpc.mockResolvedValue({ error: null });
});

test("같은 부가 기록 재동기화는 서버와 로컬에 쓰지 않는다", async () => {
  await synchronizeLearningExtras("sample-user");
  jest.mocked(AsyncStorage.multiSet).mockClear();
  await synchronizeLearningExtras("sample-user");
  expect(api.supabase.rpc).not.toHaveBeenCalled();
  expect(AsyncStorage.multiSet).not.toHaveBeenCalled();
});

test("버전 충돌은 새 서버 상태를 읽고 재시도한다", async () => {
  await AsyncStorage.setItem(
    "exam-loop:study-target:v1",
    JSON.stringify(target),
  );
  api.supabase.rpc.mockResolvedValueOnce({ error: { code: "40001" } });
  await synchronizeLearningExtras("sample-user");
  expect(api.read).toHaveBeenCalledTimes(2);
  expect(api.supabase.rpc).toHaveBeenCalledTimes(2);
});

test("업로드 중 새로 편집한 목표를 이전 스냅샷으로 덮지 않는다", async () => {
  await AsyncStorage.setItem(
    "exam-loop:study-target:v1",
    JSON.stringify(target),
  );
  api.supabase.rpc.mockImplementationOnce(async () => {
    await AsyncStorage.setItem(
      "exam-loop:study-target:v1",
      JSON.stringify({ ...target, studyDaysPerWeek: 7 }),
    );
    return { error: null };
  });
  await synchronizeLearningExtras("sample-user");
  expect(
    JSON.parse((await AsyncStorage.getItem("exam-loop:study-target:v1"))!)
      .studyDaysPerWeek,
  ).toBe(7);
});
