import adsp from "../../db/seed/bundles/adsp.json";
import awsCloudPractitioner from "../../db/seed/bundles/aws-cloud-practitioner.json";
import awsSolutionsArchitect from "../../db/seed/bundles/aws-solutions-architect-associate.json";
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

// 유형 기반 자체 제작 문항 번들
const generatedBundles = [awsCloudPractitioner, awsSolutionsArchitect];
const generatedSourceType: Question["sourceType"] = "ai_generated";

export const ADDITIONAL_EXAMS: Exam[] = [
  ...bundles,
  ...generatedBundles,
].flatMap((bundle) => bundle.exams);
export const ADDITIONAL_QUESTIONS: Question[] = [
  ...bundles.flatMap((bundle) => bundle.questions),
  ...generatedBundles.flatMap((bundle) =>
    bundle.questions.map((question) => ({
      ...question,
      sourceType: generatedSourceType,
    })),
  ),
];
