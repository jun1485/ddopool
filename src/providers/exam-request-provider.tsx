import type {
  ExamRequestRow,
  ExamRequestStatusHistoryRow,
} from "../../packages/contracts/src";
import { EXAM_REQUEST_REPORT_REASON_MAX } from "../../packages/contracts/src";
import { AppState } from "react-native";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useAuth } from "@/hooks/use-auth";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  normalizeExamRequestName,
  validateExamRequestInput,
} from "@/learning/exam-request-validation";
import { examRequestRepository } from "@/repositories/local-exam-request-repository";
import { examPlatformApi } from "@/repositories/exam-platform-api";
import { reportExamRequest } from "@/repositories/exam-request-report-repository";
import { listTrackedExamRequests } from "@/repositories/tracked-exam-request-repository";
import { CreateExamRequestInput, ExamRequest } from "@/types/exam-request";

interface ExamRequestContextValue {
  requests: ExamRequest[];
  isLoading: boolean;
  errorMessage: string | null;
  reload: () => Promise<void>;
  createRequest: (input: CreateExamRequestInput) => Promise<ExamRequest | null>;
  updateRequest: (
    requestId: string,
    input: CreateExamRequestInput,
  ) => Promise<boolean>;
  cancelRequest: (requestId: string) => Promise<boolean>;
  canManageRequestDetails: boolean;
  toggleVote: (requestId: string) => Promise<void>;
  searchRequests: (keyword: string) => Promise<ExamRequest[]>;
  loadRequestHistory: (
    requestId: string,
  ) => Promise<ExamRequestStatusHistoryRow[]>;
  reportRequest: (requestId: string, reason: string) => Promise<boolean>;
  findSimilarRequests: (examName: string) => ExamRequest[];
}

const ExamRequestContext = createContext<ExamRequestContextValue | null>(null);

// API 시험 요청 앱 정보 변환
function toExamRequest(
  row: ExamRequestRow,
  hasVoted = true,
  isOwned = false,
): ExamRequest {
  return {
    id: row.id,
    examName: row.display_name,
    organization: row.organization ?? "",
    level: row.grade_level ?? "",
    officialUrl: row.exam_url ?? "",
    reason: row.note ?? "",
    status: row.status,
    voteCount: row.vote_count,
    hasVoted,
    isOwned,
    publishedExamId: row.published_exam_id,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
  };
}

// 시험 요청 상태 제공
export function ExamRequestProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<ExamRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 시험 요청 목록 갱신
  const reload = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (isSupabaseConfigured && user == null) setRequests([]);
      else {
        const trackedRequests = await listTrackedExamRequests();
        setRequests(
          trackedRequests.map(({ row, hasVoted, isOwned }) =>
            toExamRequest(row, hasVoted, isOwned),
          ),
        );
      }
    } catch {
      setErrorMessage("시험 요청 목록을 불러오지 못했어요.");
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // 시험 요청 목록 초기 로드
  useEffect(() => {
    let active = true;

    // 저장 시험 요청 목록 반영
    const hydrate = async () => {
      try {
        const storedRequests =
          isSupabaseConfigured && user == null
            ? []
            : (await listTrackedExamRequests()).map(
                ({ row, hasVoted, isOwned }) =>
                  toExamRequest(row, hasVoted, isOwned),
              );
        if (active) setRequests(storedRequests);
      } catch {
        if (active) setErrorMessage("시험 요청 목록을 불러오지 못했어요.");
      } finally {
        if (active) setIsLoading(false);
      }
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, [user]);

  // 앱 복귀 시 시험 요청 상태 갱신
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") void reload();
    });
    return () => subscription.remove();
  }, [reload]);

  // 시험 요청 등록
  const createRequest = useCallback(
    async (input: CreateExamRequestInput): Promise<ExamRequest | null> => {
      setErrorMessage(null);
      if (!validateExamRequestInput(input).isValid) {
        setErrorMessage("입력한 시험 정보를 다시 확인해 주세요.");
        return null;
      }
      try {
        const requestRow = await examPlatformApi.requestExam({
          displayName: input.examName,
          organization: input.organization || undefined,
          gradeLevel: input.level || undefined,
          examUrl: input.officialUrl || undefined,
          note: input.reason || undefined,
        });
        const request = toExamRequest(requestRow);
        setRequests(
          (await listTrackedExamRequests()).map(({ row, hasVoted, isOwned }) =>
            toExamRequest(row, hasVoted, isOwned),
          ),
        );
        return request;
      } catch {
        setErrorMessage("시험 요청을 저장하지 못했어요. 다시 시도해 주세요.");
        return null;
      }
    },
    [],
  );

  // 시험 요청 정보 수정
  const updateRequest = useCallback(
    async (
      requestId: string,
      input: CreateExamRequestInput,
    ): Promise<boolean> => {
      if (!validateExamRequestInput(input).isValid) {
        setErrorMessage("입력한 시험 정보를 다시 확인해 주세요.");
        return false;
      }
      if (isSupabaseConfigured) {
        setErrorMessage("서버 요청 정보 수정 API 연결이 필요해요.");
        return false;
      }
      setErrorMessage(null);
      try {
        setRequests(await examRequestRepository.update(requestId, input));
        return true;
      } catch {
        setErrorMessage("시험 요청 정보를 수정하지 못했어요.");
        return false;
      }
    },
    [],
  );

  // 시험 요청 취소
  const cancelRequest = useCallback(
    async (requestId: string): Promise<boolean> => {
      if (isSupabaseConfigured) {
        setErrorMessage("서버 요청 취소 API 연결이 필요해요.");
        return false;
      }
      setErrorMessage(null);
      try {
        setRequests(await examRequestRepository.cancel(requestId));
        return true;
      } catch {
        setErrorMessage("시험 요청을 취소하지 못했어요.");
        return false;
      }
    },
    [],
  );

  // 시험 요청 공감 전환
  const toggleVote = useCallback(
    async (requestId: string) => {
      const target = requests.find((request) => request.id === requestId);

      setErrorMessage(null);
      try {
        if (target?.hasVoted === true)
          await examPlatformApi.cancelExamRequestVote(requestId);
        else await examPlatformApi.voteExamRequest(requestId);
        setRequests(
          (await listTrackedExamRequests()).map(({ row, hasVoted, isOwned }) =>
            toExamRequest(row, hasVoted, isOwned),
          ),
        );
      } catch {
        setErrorMessage("공감 상태를 변경하지 못했어요.");
      }
    },
    [requests],
  );

  // 시험 요청 전체 검색
  const searchRequests = useCallback(
    async (keyword: string): Promise<ExamRequest[]> => {
      try {
        const rows = await examPlatformApi.searchExamRequests(keyword);
        const votedRequestIds = new Set(
          requests
            .filter((request) => request.hasVoted)
            .map((request) => request.id),
        );
        const ownedRequestIds = new Set(
          requests
            .filter((request) => request.isOwned)
            .map((request) => request.id),
        );
        return rows.map((row) =>
          toExamRequest(
            row,
            votedRequestIds.has(row.id),
            ownedRequestIds.has(row.id),
          ),
        );
      } catch {
        setErrorMessage("유사 시험 요청을 검색하지 못했어요.");
        return [];
      }
    },
    [requests],
  );

  // 시험 요청 상태 변경 이력 조회
  const loadRequestHistory = useCallback(async (requestId: string) => {
    try {
      return await examPlatformApi.getRequestStatusHistory(requestId);
    } catch {
      setErrorMessage("요청 진행 이력을 불러오지 못했어요.");
      return [];
    }
  }, []);

  // 시험 요청 신고 등록
  const reportRequest = useCallback(
    async (requestId: string, reason: string): Promise<boolean> => {
      if (reason.trim().length === 0) {
        setErrorMessage("신고 사유를 입력해 주세요.");
        return false;
      }
      if (reason.trim().length > EXAM_REQUEST_REPORT_REASON_MAX) {
        setErrorMessage(
          `신고 사유는 ${EXAM_REQUEST_REPORT_REASON_MAX}자까지 입력할 수 있어요.`,
        );
        return false;
      }
      setErrorMessage(null);
      try {
        await reportExamRequest(requestId, reason.trim());
        return true;
      } catch {
        setErrorMessage("신고를 접수하지 못했어요. 다시 시도해 주세요.");
        return false;
      }
    },
    [],
  );

  // 유사 시험 요청 조회
  const findSimilarRequests = useCallback(
    (examName: string) => {
      const query = normalizeExamRequestName(examName);
      if (query.length < 2) return [];
      return requests.filter((request) => {
        if (
          request.status === "cancelled" ||
          request.status === "rejected" ||
          request.status === "archived"
        )
          return false;
        const candidate = normalizeExamRequestName(request.examName);
        return candidate.includes(query) || query.includes(candidate);
      });
    },
    [requests],
  );

  const value = useMemo(
    () => ({
      requests,
      isLoading,
      errorMessage,
      reload,
      createRequest,
      updateRequest,
      cancelRequest,
      canManageRequestDetails: !isSupabaseConfigured,
      toggleVote,
      searchRequests,
      loadRequestHistory,
      reportRequest,
      findSimilarRequests,
    }),
    [
      createRequest,
      updateRequest,
      cancelRequest,
      errorMessage,
      findSimilarRequests,
      isLoading,
      loadRequestHistory,
      reportRequest,
      reload,
      requests,
      searchRequests,
      toggleVote,
    ],
  );

  return (
    <ExamRequestContext.Provider value={value}>
      {children}
    </ExamRequestContext.Provider>
  );
}

// 시험 요청 상태 사용
export function useExamRequestContext(): ExamRequestContextValue {
  const context = useContext(ExamRequestContext);
  if (context == null)
    throw new Error("ExamRequestProvider 내부에서 사용해야 합니다.");
  return context;
}
