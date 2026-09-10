import { z } from "zod";

const count = z.number().int().nonnegative();
const timestamp = z.number().nonnegative();
export const idsSchema = z.array(z.string());
export const confidenceSchema = z.enum(["confident", "unsure", "forgot"]);
export const modeSchema = z.enum(["learn", "review", "bookmarks", "mock"]);
export const questionSchema = z
  .object({
    sourceType: z
      .enum(["public_past_exam", "ai_generated", "manual"])
      .optional(),
    version: count.optional(),
    id: z.string(),
    examId: z.string(),
    subject: z.string(),
    prompt: z.string(),
    choices: z.array(z.string()).min(2).max(6),
    answerIndex: count,
    explanation: z.string(),
  })
  .refine((value) => value.answerIndex < value.choices.length);
export const catalogSchema = z.object({
  exams: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      shortTitle: z.string(),
      description: z.string(),
      icon: z.string(),
      subjects: idsSchema,
    }),
  ),
  questions: z.array(questionSchema),
});
export const enrollmentSchema = z.object({
  examIds: idsSchema,
  onboardingCompleted: z.boolean(),
});
export const accuracySchema = z.object({ answered: count, correct: count });
export const dailyStatsSchema = z.record(z.string(), accuracySchema);
export const performanceSchema = z.object({
  overall: accuracySchema,
  byExam: dailyStatsSchema,
  bySubject: z.record(
    z.string(),
    accuracySchema.extend({ examId: z.string(), subject: z.string() }),
  ),
});
export const srsSchema = z.record(
  z.string(),
  z.object({
    questionId: z.string(),
    examId: z.string(),
    repetitions: count,
    easeFactor: z.number().positive(),
    intervalDays: z.number().nonnegative(),
    dueAt: timestamp,
    lastReviewedAt: timestamp,
  }),
);
export const notesSchema = z.record(
  z.string(),
  z.object({
    questionId: z.string(),
    examId: z.string(),
    subject: z.string(),
    tags: z.array(z.enum(["concept", "calculation", "misread", "guess"])),
    memo: z.string(),
    wrongCount: count,
    lastWrongAt: timestamp,
    resolvedAt: timestamp.nullable(),
  }),
);
export const achievementsSchema = z.array(
  z.enum([
    "first-answer",
    "answer-25",
    "answer-100",
    "correct-50",
    "streak-3",
    "streak-7",
    "bookmark-10",
    "enroll-3",
    "study-30",
  ]),
);
export const targetSchema = z
  .object({
    examId: z.string(),
    targetDate: z.iso.date(),
    targetScore: z.number().nonnegative().optional(),
    studyDaysPerWeek: z.number().int().min(1).max(7),
    createdAt: timestamp,
    startingQuestionCount: count,
    startingStudiedCount: count,
  })
  .nullable();
const resultSchema = z.object({
  id: z.string(),
  examIds: idsSchema,
  questionCount: count,
  answeredCount: count,
  correctCount: count,
  durationSeconds: count,
  completedAt: timestamp,
});
export const historySchema = z.array(
  resultSchema.extend({ questionIds: idsSchema, mode: modeSchema }),
);
export const mockHistorySchema = z.array(
  resultSchema.extend({
    subjectResults: z.array(
      z.object({
        examId: z.string(),
        subject: z.string(),
        correct: count,
        total: count,
      }),
    ),
  }),
);
export const presetsSchema = z.record(
  z.string(),
  z.object({
    examId: z.string(),
    selectedSubjects: idsSchema,
    questionCount: count.positive(),
    mode: z.enum(["learn", "mock"]),
    strategy: z.enum(["balanced", "weakness", "random"]),
    updatedAt: timestamp,
  }),
);
export const settingsSchema = z.object({
  sessionSize: z.union([z.literal(5), z.literal(10), z.literal(20)]),
  dailyGoal: z.union([
    z.literal(5),
    z.literal(10),
    z.literal(20),
    z.literal(30),
  ]),
  weeklyGoal: z.union([
    z.literal(35),
    z.literal(70),
    z.literal(140),
    z.literal(210),
  ]),
  mockDurationMinutes: z.union([
    z.literal(5),
    z.literal(10),
    z.literal(20),
    z.literal(30),
  ]),
  reminderDailyLimit: z
    .union([z.literal(1), z.literal(2), z.literal(4)])
    .default(4),
  reminderQuietHour: z
    .union([z.literal(21), z.literal(23), z.literal(24)])
    .default(24),
  reminderPausedDate: z
    .string()
    .regex(/^(?:|\d{4}-\d{2}-\d{2})$/)
    .default(""),
  studyReminderHour: z.number().int().min(0).max(23),
  hapticsEnabled: z.boolean(),
  studyReminderEnabled: z.boolean(),
  personalizedQuestionsEnabled: z.boolean(),
  shuffleQuestionsEnabled: z.boolean(),
  shuffleChoicesEnabled: z.boolean(),
  explanationEnabled: z.boolean(),
  confidenceRatingEnabled: z.boolean(),
  keyboardShortcutsEnabled: z.boolean(),
  themePreference: z.enum(["system", "light", "dark"]),
});
export const activeSessionSchema = z
  .object({
    examId: z.string(),
    mode: modeSchema,
    questions: z.array(questionSchema).min(1),
    currentIndex: count,
    selectedIndex: count.nullable(),
    isSubmitted: z.boolean(),
    answerConfidence: confidenceSchema.nullable().optional(),
    correctCount: count,
    retryCounts: z.record(z.string(), count).optional(),
    answers: z.array(
      z.object({
        questionId: z.string(),
        subject: z.string(),
        selectedIndex: count.nullable(),
        isCorrect: z.boolean(),
        confidence: confidenceSchema.nullable().optional(),
      }),
    ),
    startedAt: timestamp.optional(),
    elapsedSeconds: count.optional(),
    updatedAt: timestamp,
    mockDeadline: timestamp.optional(),
    flaggedQuestionIds: idsSchema.optional(),
  })
  .refine(
    (value) =>
      value.currentIndex < value.questions.length &&
      (value.selectedIndex == null ||
        value.selectedIndex <
          value.questions[value.currentIndex].choices.length) &&
      value.answers.every((answer) =>
        value.questions.some(
          (question) =>
            question.id === answer.questionId &&
            (answer.selectedIndex == null ||
              answer.selectedIndex < question.choices.length),
        ),
      ) &&
      (value.mode !== "mock" || value.mockDeadline != null),
  );
export const backupSchema = z.object({
  schemaVersion: z.literal(1),
  appVersion: z.string(),
  exportedAt: z.iso.datetime(),
  privacy: z.object({
    excludesAuthentication: z.literal(true),
    excludesUserIdentity: z.literal(true),
    excludesQuestionContent: z.literal(true),
  }),
  data: z.object({
    settings: settingsSchema,
    enrollment: enrollmentSchema.nullable(),
    dailyStats: dailyStatsSchema,
    performance: performanceSchema,
    srsCards: srsSchema,
    bookmarks: idsSchema,
    wrongAnswerNotes: notesSchema,
    unlockedAchievements: achievementsSchema,
    studyTarget: targetSchema,
    mockExamHistory: mockHistorySchema,
    learningSessionHistory: historySchema,
    customSessionPresets: presetsSchema,
  }),
});

export const pendingAttemptsSchema = z.array(
  z.object({
    questionId: z.string(),
    examId: z.string(),
    subject: z.string(),
    selectedIndex: count.nullable(),
    isCorrect: z.boolean(),
    mode: modeSchema,
    answeredAt: z.iso.datetime(),
    clientAttemptId: z.string(),
    userId: z.string().nullable(),
  }),
);
