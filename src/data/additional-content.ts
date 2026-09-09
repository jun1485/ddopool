import adsp from "../../db/seed/bundles/adsp.json";
import computer2 from "../../db/seed/bundles/computer-2.json";
import infoProcessing from "../../db/seed/bundles/info-processing.json";
import linuxMaster from "../../db/seed/bundles/linux-master-2.json";
import networkManager from "../../db/seed/bundles/network-manager-2.json";
import sqld from "../../db/seed/bundles/sqld.json";
import wordProcessor from "../../db/seed/bundles/word-processor.json";
import { Exam, Question } from "@/types/exam";

const bundles = [
  computer2,
  wordProcessor,
  sqld,
  adsp,
  infoProcessing,
  networkManager,
  linuxMaster,
];

export const ADDITIONAL_EXAMS: Exam[] = bundles.flatMap(
  (bundle) => bundle.exams,
);
export const ADDITIONAL_QUESTIONS: Question[] = bundles.flatMap(
  (bundle) => bundle.questions,
);
