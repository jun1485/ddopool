import { MaxContentWidth, Radius, Shadows, Spacing } from "@/constants/theme";
import { StyleSheet } from "react-native";
export const quizStyles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    minWidth: 0,
  },
  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerBox: {
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.four,
    maxWidth: MaxContentWidth,
  },
  centerText: {
    textAlign: "center",
  },
  resultSafeArea: {
    flex: 1,
    width: "100%",
    minWidth: 0,
    maxWidth: MaxContentWidth,
  },
  resultContent: {
    flexGrow: 1,
    gap: Spacing.four,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.five,
  },
  resultHero: {
    alignItems: "center",
    gap: Spacing.two,
  },
  trophyCircle: {
    width: 84,
    height: 84,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.one,
    borderRadius: Radius.pill,
  },
  trophyEmoji: {
    fontSize: 39,
    lineHeight: 48,
  },
  scoreCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.four,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  scoreCircle: {
    width: 108,
    height: 108,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 10,
    borderRadius: Radius.pill,
  },
  accuracyText: {
    fontSize: 25,
    lineHeight: 32,
    fontWeight: 800,
  },
  scoreDetails: {
    flex: 1,
    gap: Spacing.twoHalf,
  },
  scoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  scoreDot: {
    width: 8,
    height: 8,
    borderRadius: Radius.pill,
  },
  scoreLabel: {
    flex: 1,
  },
  resultSection: {
    gap: Spacing.two,
  },
  resultSectionTitle: {
    fontSize: 17,
    lineHeight: 26,
    fontWeight: 800,
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
  },
  reviewHeaderText: {
    flex: 1,
    gap: Spacing.half,
  },
  bulkSaveButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  reviewFilterRow: {
    flexDirection: "row",
    gap: Spacing.one,
    padding: Spacing.one,
    borderRadius: Radius.medium,
  },
  reviewFilterSlot: {
    flex: 1,
  },
  reviewFilterChip: {
    alignItems: "center",
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderRadius: Radius.small,
  },
  reviewList: {
    gap: Spacing.three,
  },
  subjectCard: {
    overflow: "hidden",
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.medium,
    ...Shadows.card,
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },
  subjectText: {
    width: 108,
    gap: Spacing.half,
  },
  subjectTrack: {
    flex: 1,
  },
  reviewNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Radius.medium,
  },
  noticeText: {
    flex: 1,
  },
  resultActions: {
    gap: Spacing.two,
    marginTop: "auto",
  },
  safeArea: {
    flex: 1,
    width: "100%",
    minWidth: 0,
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  closeButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
    backgroundColor: "rgba(127, 127, 127, 0.09)",
  },
  pauseButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
  },
  mockReviewButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.small,
  },
  content: {
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  loadingContent: {
    gap: Spacing.three,
    paddingTop: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  loadingChoices: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  questionBlock: {
    gap: Spacing.twoHalf,
  },
  questionMeta: {
    gap: Spacing.two,
  },
  questionMetaTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  questionTools: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  subjectChip: {
    flexShrink: 1,
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.twoHalf,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  bookmarkButton: {
    width: 38,
    height: 38,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  prompt: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: 700,
  },
  choices: {
    gap: Spacing.two,
  },
  feedbackSheet: {
    width: "100%",
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
    padding: Spacing.four,
    paddingBottom: Spacing.five,
    borderTopWidth: 3,
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
  },
  feedbackHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.three,
  },
  feedbackIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  feedbackEmoji: {
    fontSize: 21,
    lineHeight: 28,
  },
  feedbackHeaderText: {
    flex: 1,
    gap: Spacing.half,
  },
  feedbackTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: 800,
  },
  feedbackExplanationArea: {
    maxHeight: 132,
  },
  feedbackExplanation: {
    paddingRight: Spacing.two,
  },
  feedbackReport: {
    minHeight: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  cta: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.twoHalf,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  ctaDisabled: {
    opacity: 0.4,
  },
  mockNavigation: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  previousButton: {
    width: 52,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  mockNextButton: {
    flex: 1,
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },
  exitDialog: {
    alignItems: "center",
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Radius.large,
    ...Shadows.card,
  },
  exitIcon: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.medium,
  },
  exitText: {
    alignItems: "center",
    gap: Spacing.one,
  },
  exitTitle: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: 800,
  },
  exitActions: {
    flexDirection: "row",
    gap: Spacing.two,
    width: "100%",
  },
  pauseActions: {
    gap: Spacing.two,
    width: "100%",
  },
  exitAction: {
    flex: 1,
  },
});
