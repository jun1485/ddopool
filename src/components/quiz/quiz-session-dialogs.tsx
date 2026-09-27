import { SymbolView } from "expo-symbols";
import { View } from "react-native";

import { ModalOverlay } from "@/components/motion/modal-overlay";
import { CtaButton } from "@/components/quiz/quiz-controls";
import { quizStyles as styles } from "@/components/quiz/quiz-styles";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useTheme } from "@/hooks/use-theme";

interface QuizExitDialogProps {
  isMock: boolean;
  onContinue: () => void;
  onLeave: () => void;
}

// 풀이 중 이탈 확인창
export function QuizExitDialog({
  isMock,
  onContinue,
  onLeave,
}: QuizExitDialogProps) {
  const theme = useTheme();

  return (
    <ModalOverlay closeLabel="종료 확인 닫기" onRequestClose={onContinue}>
      <ThemedView type="backgroundElement" style={styles.exitDialog}>
        <View style={[styles.exitIcon, { backgroundColor: theme.warningSoft }]}>
          <SymbolView
            tintColor={theme.warning}
            name={{ ios: "pause.fill", android: "pause", web: "pause" }}
            size={22}
          />
        </View>
        <View style={styles.exitText}>
          <ThemedText style={styles.exitTitle}>
            {isMock ? "모의고사를 그만둘까요?" : "학습을 그만둘까요?"}
          </ThemedText>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.centerText}
          >
            {isMock
              ? "제출 전 답안은 저장되지 않으며 결과 화면도 볼 수 없어요."
              : "현재 문제 위치를 저장하고 홈에서 그대로 이어 풀 수 있어요."}
          </ThemedText>
        </View>
        <View style={styles.exitActions}>
          <View style={styles.exitAction}>
            <CtaButton
              label="계속 풀기"
              variant="secondary"
              onPress={onContinue}
            />
          </View>
          <View style={styles.exitAction}>
            <CtaButton
              label={isMock ? "종료" : "나중에 이어 풀기"}
              variant="danger"
              onPress={onLeave}
            />
          </View>
        </View>
      </ThemedView>
    </ModalOverlay>
  );
}

interface QuizPauseDialogProps {
  onResume: () => void;
  onLeave: () => void;
}

// 학습 일시정지 안내창
export function QuizPauseDialog({ onResume, onLeave }: QuizPauseDialogProps) {
  const theme = useTheme();

  return (
    <ModalOverlay>
      <ThemedView type="backgroundElement" style={styles.exitDialog}>
        <View style={[styles.exitIcon, { backgroundColor: theme.primarySoft }]}>
          <SymbolView
            tintColor={theme.primary}
            name={{
              ios: "cup.and.saucer.fill",
              android: "free_breakfast",
              web: "free_breakfast",
            }}
            size={22}
          />
        </View>
        <View style={styles.exitText}>
          <ThemedText style={styles.exitTitle}>잠시 쉬어가도 좋아요</ThemedText>
          <ThemedText
            type="small"
            themeColor="textSecondary"
            style={styles.centerText}
          >
            학습 시간은 멈춰 있어요. 준비되면 같은 문제부터 이어서 풀어 보세요.
          </ThemedText>
        </View>
        <View style={styles.pauseActions}>
          <CtaButton label="계속 학습하기" onPress={onResume} />
          <CtaButton
            label="홈에서 나중에 이어 풀기"
            variant="secondary"
            onPress={onLeave}
          />
        </View>
      </ThemedView>
    </ModalOverlay>
  );
}
