import AsyncStorage from "@react-native-async-storage/async-storage";

import { ExamRequestRepository } from "@/repositories/exam-request-repository";
import { CreateExamRequestInput, ExamRequest } from "@/types/exam-request";

const EXAM_REQUESTS_KEY = "exam-loop:exam-requests:v1";
let requestWriteQueue: Promise<void> = Promise.resolve();

// 시험 요청 목록 로드
async function list(): Promise<ExamRequest[]> {
  try {
    const raw = await AsyncStorage.getItem(EXAM_REQUESTS_KEY);
    return raw == null ? [] : (JSON.parse(raw) as ExamRequest[]);
  } catch {
    return [];
  }
}

// 시험 요청 목록 순차 저장
function save(requests: ExamRequest[]): Promise<void> {
  requestWriteQueue = requestWriteQueue
    .catch(() => undefined)
    .then(() =>
      AsyncStorage.setItem(EXAM_REQUESTS_KEY, JSON.stringify(requests)),
    );
  return requestWriteQueue;
}

// 시험 요청 생성
async function create(input: CreateExamRequestInput): Promise<ExamRequest> {
  const requests = await list();
  const now = Date.now();
  const request: ExamRequest = {
    id: `request-${now}`,
    ...input,
    status: "requested",
    voteCount: 1,
    hasVoted: true,
    publishedExamId: null,
    createdAt: now,
    updatedAt: now,
  };
  const nextRequests = [request, ...requests];
  await save(nextRequests);
  return request;
}

// 시험 요청 정보 갱신
async function update(
  requestId: string,
  input: CreateExamRequestInput,
): Promise<ExamRequest[]> {
  const requests = await list();
  const nextRequests = requests.map((request) =>
    request.id === requestId
      ? { ...request, ...input, updatedAt: Date.now() }
      : request,
  );
  await save(nextRequests);
  return nextRequests;
}

// 시험 요청 취소
async function cancel(requestId: string): Promise<ExamRequest[]> {
  const requests = await list();
  const nextRequests: ExamRequest[] = requests.map((request) =>
    request.id === requestId
      ? { ...request, status: "cancelled", updatedAt: Date.now() }
      : request,
  );
  await save(nextRequests);
  return nextRequests;
}

// 시험 요청 공감 상태 변경
async function setVote(
  requestId: string,
  hasVoted: boolean,
): Promise<ExamRequest[]> {
  const requests = await list();
  const nextRequests = requests.map((request) =>
    request.id === requestId
      ? {
          ...request,
          hasVoted,
          voteCount: Math.max(request.voteCount + (hasVoted ? 1 : -1), 0),
          updatedAt: Date.now(),
        }
      : request,
  );
  await save(nextRequests);
  return nextRequests;
}

// API 연동 전 로컬 시험 요청 저장소
export const examRequestRepository: ExamRequestRepository = {
  list,
  create,
  update,
  cancel,
  setVote,
};
