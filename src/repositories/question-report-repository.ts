import AsyncStorage from "@react-native-async-storage/async-storage";

import {
  CreateQuestionReportInput,
  QuestionReport,
} from "@/types/question-report";

const QUESTION_REPORTS_KEY = "exam-loop:question-reports:v1";
let reportWriteQueue: Promise<void> = Promise.resolve();

// 문제 오류 신고 목록 로드
export async function loadQuestionReports(): Promise<QuestionReport[]> {
  try {
    const raw = await AsyncStorage.getItem(QUESTION_REPORTS_KEY);
    return raw == null ? [] : (JSON.parse(raw) as QuestionReport[]);
  } catch {
    return [];
  }
}

// 문제 오류 신고 생성
export async function createQuestionReport(
  input: CreateQuestionReportInput,
): Promise<QuestionReport> {
  const now = Date.now();
  const report: QuestionReport = {
    id: `question-report-${now}`,
    ...input,
    status: "submitted",
    createdAt: now,
  };
  reportWriteQueue = reportWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const reports = await loadQuestionReports();
      await AsyncStorage.setItem(
        QUESTION_REPORTS_KEY,
        JSON.stringify([report, ...reports]),
      );
    });
  await reportWriteQueue;
  return report;
}
