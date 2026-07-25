import type {
  ExamPlatformApi,
  ExamRequestRow,
  ExamRequestStatus as ContractExamRequestStatus,
  ExamRequestStatusHistoryRow,
  NotificationRow,
  RemoteExam,
  RemoteQuestion,
  RequestExamInput,
} from "../../packages/contracts/src";

import { EXAMS } from "@/data/exams";
import { QUESTIONS } from "@/data/questions";
import {
  createLocalNotification,
  loadLocalNotifications,
  markLocalNotificationRead,
} from "@/repositories/local-notification-store";
import { examRequestRepository } from "@/repositories/local-exam-request-repository";
import { createQuestionReport } from "@/repositories/question-report-repository";
import { ExamRequest } from "@/types/exam-request";

// 시험명 중복 비교 값 생성
function normalizeExamName(value: string): string {
  return value.toLocaleLowerCase().replaceAll(/[^0-9a-z가-힣]/g, "");
}

// 로컬 요청 상태 API 계약 상태 변환
function toContractStatus(request: ExamRequest): ContractExamRequestStatus {
  return request.status === "cancelled" ? "archived" : request.status;
}

// 로컬 시험 요청 API 응답 변환
function toExamRequestRow(request: ExamRequest): ExamRequestRow {
  return {
    id: request.id,
    normalized_name: normalizeExamName(request.examName),
    display_name: request.examName,
    organization: request.organization || null,
    grade_level: request.level || null,
    exam_url: request.officialUrl || null,
    language: "ko",
    note: request.reason || null,
    status: toContractStatus(request),
    vote_count: request.voteCount,
    published_exam_id: request.publishedExamId ?? null,
    created_at: new Date(request.createdAt).toISOString(),
    updated_at: new Date(request.updatedAt).toISOString(),
  };
}

// 공용 API 계약 기반 로컬 mock 구현체
export class MockExamPlatformApi implements ExamPlatformApi {
  // 공개 시험 목록 조회
  async listActiveExams(): Promise<RemoteExam[]> {
    return EXAMS;
  }

  // 시험별 공개 문제 목록 조회
  async listPublishedQuestions(examId: string): Promise<RemoteQuestion[]> {
    return QUESTIONS.filter((question) => question.examId === examId);
  }

  // 시험 요청 검색
  async searchExamRequests(keyword: string): Promise<ExamRequestRow[]> {
    const query = normalizeExamName(keyword);
    const requests = await examRequestRepository.list();
    return requests
      .filter((request) => normalizeExamName(request.examName).includes(query))
      .map(toExamRequestRow);
  }

  // 시험 요청 등록 또는 기존 요청 투표
  async requestExam(input: RequestExamInput): Promise<ExamRequestRow> {
    const requests = await examRequestRepository.list();
    const normalizedName = normalizeExamName(input.displayName);
    const existingRequest = requests.find(
      (request) =>
        normalizeExamName(request.examName) === normalizedName &&
        request.status !== "cancelled" &&
        request.status !== "rejected" &&
        request.status !== "archived",
    );
    if (existingRequest != null) {
      const nextRequests = existingRequest.hasVoted
        ? requests
        : await examRequestRepository.setVote(existingRequest.id, true);
      return toExamRequestRow(
        nextRequests.find((request) => request.id === existingRequest.id) ??
          existingRequest,
      );
    }

    const request = await examRequestRepository.create({
      examName: input.displayName,
      organization: input.organization ?? "",
      level: input.gradeLevel ?? "",
      officialUrl: input.examUrl ?? "",
      reason: input.note ?? "",
    });
    await createLocalNotification("request_status_changed", {
      request_id: request.id,
      display_name: request.examName,
    });
    return toExamRequestRow(request);
  }

  // 기존 시험 요청 투표
  async voteExamRequest(requestId: string): Promise<void> {
    const requests = await examRequestRepository.list();
    const request = requests.find((item) => item.id === requestId);
    if (request != null && !request.hasVoted)
      await examRequestRepository.setVote(requestId, true);
  }

  // 기존 시험 요청 투표 취소
  async cancelExamRequestVote(requestId: string): Promise<void> {
    const requests = await examRequestRepository.list();
    const request = requests.find((item) => item.id === requestId);
    if (request?.hasVoted)
      await examRequestRepository.setVote(requestId, false);
  }

  // 내가 투표한 시험 요청 목록 조회
  async getMyVotedRequests(): Promise<ExamRequestRow[]> {
    const requests = await examRequestRepository.list();
    return requests.filter((request) => request.hasVoted).map(toExamRequestRow);
  }

  // 시험 요청 상태 타임라인 조회
  async getRequestStatusHistory(
    requestId: string,
  ): Promise<ExamRequestStatusHistoryRow[]> {
    const requests = await examRequestRepository.list();
    const request = requests.find((item) => item.id === requestId);
    return request == null
      ? []
      : [
          {
            id: request.createdAt,
            request_id: request.id,
            from_status: null,
            to_status: toContractStatus(request),
            note: null,
            created_at: new Date(request.createdAt).toISOString(),
          },
        ];
  }

  // 내 알림 목록 조회
  async listMyNotifications(): Promise<NotificationRow[]> {
    return loadLocalNotifications();
  }

  // 알림 읽음 처리
  async markNotificationRead(notificationId: number): Promise<void> {
    await markLocalNotificationRead(notificationId);
  }

  // 문제 오류 신고
  async reportQuestion(questionId: string, reason: string): Promise<void> {
    await createQuestionReport({
      questionId,
      category: "other",
      details: reason,
    });
  }
}
