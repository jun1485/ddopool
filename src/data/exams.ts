import { Exam } from "@/types/exam";

// 지원 시험 목록
export const EXAMS: Exam[] = [
  {
    id: "computer-1",
    title: "컴퓨터활용능력 1급 필기",
    shortTitle: "컴활 1급",
    description: "컴퓨터 일반 · 스프레드시트 · 데이터베이스",
    icon: "💻",
    subjects: ["컴퓨터 일반", "스프레드시트 일반", "데이터베이스 일반"],
  },
  {
    id: "drone-1",
    title: "드론 조종자 자격 1종 필기",
    shortTitle: "드론 1종",
    description: "항공법규 · 항공기상 · 비행이론 및 운용",
    icon: "🚁",
    subjects: ["항공법규", "항공기상", "비행이론 및 운용"],
  },
  {
    id: "toeic-rc",
    title: "TOEIC RC 연습",
    shortTitle: "TOEIC RC",
    description: "Part 5 문법 · 어휘 자체 제작 문제",
    icon: "📘",
    subjects: ["문법", "어휘"],
  },
];

// examId 기준 시험 정보 조회
export function findExam(examId: string): Exam | undefined {
  return EXAMS.find((exam) => exam.id === examId);
}
