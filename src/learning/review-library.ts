import type { WrongAnswerNoteMap } from "@/storage/wrong-answer-note-store";
import type { Question } from "@/types/exam";

export type ReviewLibraryFilter =
  | "all"
  | "wrong"
  | "bookmarked"
  | "resolved";

// 복습 보관함 문제 항목
export interface ReviewLibraryItem {
  question: Question;
  note: WrongAnswerNoteMap[string] | null;
  bookmarked: boolean;
}

interface ReviewLibraryFilterInput {
  items: ReviewLibraryItem[];
  filter: ReviewLibraryFilter;
  examId: string | null;
  query: string;
}

// 오답·북마크 기반 복습 보관함 목록 구성
export function createReviewLibraryItems(
  questions: Question[],
  notes: WrongAnswerNoteMap,
  bookmarkedQuestionIds: string[],
): ReviewLibraryItem[] {
  const bookmarkedIds = new Set(bookmarkedQuestionIds);
  return questions
    .filter(
      (question) => notes[question.id] != null || bookmarkedIds.has(question.id),
    )
    .map((question) => ({
      question,
      note: notes[question.id] ?? null,
      bookmarked: bookmarkedIds.has(question.id),
    }))
    .sort(
      (left, right) =>
        (right.note?.lastWrongAt ?? 0) - (left.note?.lastWrongAt ?? 0),
    );
}

// 복습 보관함 조건별 문제 필터
export function filterReviewLibraryItems({
  items,
  filter,
  examId,
  query,
}: ReviewLibraryFilterInput): ReviewLibraryItem[] {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko-KR");
  return items.filter((item) => {
    if (examId != null && item.question.examId !== examId) return false;
    if (filter === "wrong" && item.note?.resolvedAt != null) return false;
    if (filter === "wrong" && item.note == null) return false;
    if (filter === "bookmarked" && !item.bookmarked) return false;
    if (filter === "resolved" && item.note?.resolvedAt == null) return false;
    if (normalizedQuery.length === 0) return true;
    return [item.question.prompt, item.question.subject, item.note?.memo ?? ""]
      .join(" ")
      .toLocaleLowerCase("ko-KR")
      .includes(normalizedQuery);
  });
}
