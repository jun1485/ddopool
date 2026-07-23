import type {
  ContentExam,
  ContentQuestion,
} from "../../../packages/contracts/src";

import { normalizeContentText } from "./normalize";
import type { SubjectClassification, SubjectProfile } from "./types";

// 과목 분류 기준 키워드 구성
function createSubjectKeywords(
  exam: ContentExam,
  profiles: SubjectProfile[],
): SubjectProfile[] {
  return exam.subjects.map((subject) => {
    const profile = profiles.find((candidate) => candidate.name === subject);
    return {
      name: subject,
      keywords: [...new Set([subject, ...(profile?.keywords ?? [])])],
    };
  });
}

// 문제 내용 기반 과목 분류
export function classifyQuestionSubject(
  question: ContentQuestion,
  exam: ContentExam,
  profiles: SubjectProfile[] = [],
): SubjectClassification | null {
  if (exam.subjects.includes(question.subject))
    return {
      subject: question.subject,
      confidence: 1,
      matchedKeywords: [question.subject],
    };

  const normalizedContent = normalizeContentText(
    `${question.prompt} ${question.choices.join(" ")} ${question.explanation}`,
  );
  const candidates = createSubjectKeywords(exam, profiles)
    .map((profile) => {
      const matchedKeywords = profile.keywords.filter((keyword) =>
        normalizedContent.includes(normalizeContentText(keyword)),
      );
      return {
        subject: profile.name,
        matchedKeywords,
        score: matchedKeywords.reduce(
          (sum, keyword) => sum + normalizeContentText(keyword).length,
          0,
        ),
      };
    })
    .sort((left, right) => right.score - left.score);
  const best = candidates[0];
  const second = candidates[1];
  if (best == null || best.score === 0 || best.score === second?.score)
    return null;

  return {
    subject: best.subject,
    confidence: Math.min(best.score / 12, 0.95),
    matchedKeywords: best.matchedKeywords,
  };
}
