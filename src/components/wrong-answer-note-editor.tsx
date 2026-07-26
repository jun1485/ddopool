import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { StyleSheet, TextInput, View } from "react-native";

import { MotionPressable as Pressable } from "@/components/motion-pressable";
import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";
import type {
  WrongAnswerNote,
  WrongAnswerTag,
} from "@/storage/wrong-answer-note-store";

const TAG_OPTIONS: { value: WrongAnswerTag; label: string; icon: string }[] = [
  { value: "concept", label: "개념 부족", icon: "📘" },
  { value: "calculation", label: "계산 실수", icon: "🧮" },
  { value: "misread", label: "문제 오독", icon: "👀" },
  { value: "guess", label: "찍어서 선택", icon: "🎲" },
];

interface WrongAnswerNoteEditorProps {
  note: WrongAnswerNote;
  onToggleTag: (tag: WrongAnswerTag) => void;
  onSaveMemo: (memo: string) => void;
}

// 문제별 오답 원인·메모 편집기
export function WrongAnswerNoteEditor({
  note,
  onToggleTag,
  onSaveMemo,
}: WrongAnswerNoteEditorProps) {
  const [memo, setMemo] = useState(note.memo);
  const [saved, setSaved] = useState(false);
  const theme = useTheme();

  // 오답 메모 저장
  const saveMemo = () => {
    onSaveMemo(memo.trim());
    setMemo(memo.trim());
    setSaved(true);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.warningSoft,
          borderColor: theme.warning,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <SymbolView
            tintColor={theme.warning}
            name={{
              ios: "pencil.and.list.clipboard",
              android: "edit_note",
              web: "edit_note",
            }}
            size={19}
          />
          <ThemedText type="smallBold" style={{ color: theme.warning }}>
            학습 노트
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {note.wrongCount > 0
            ? `누적 오답 ${note.wrongCount}회`
            : "확신도 보완"}
        </ThemedText>
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {note.wrongCount > 0
          ? "틀린 이유를 표시하면 다음 복습에서 같은 실수를 줄일 수 있어요."
          : "맞혔지만 헷갈린 이유를 남기면 다음 복습에 도움이 돼요."}
      </ThemedText>

      <View style={styles.tagRow}>
        {TAG_OPTIONS.map((option) => {
          const selected = note.tags.includes(option.value);
          return (
            <Pressable
              key={option.value}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`학습 원인 ${option.label}`}
              onPress={() => onToggleTag(option.value)}
              style={({ pressed }) => [
                styles.tag,
                {
                  backgroundColor: selected
                    ? theme.warning
                    : theme.backgroundElement,
                  borderColor: selected ? theme.warning : theme.border,
                },
                pressed && styles.pressed,
              ]}
            >
              <ThemedText type="small">
                {option.icon} {option.label}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>

      <View
        style={[
          styles.memoBox,
          {
            backgroundColor: theme.backgroundElement,
            borderColor: theme.border,
          },
        ]}
      >
        <TextInput
          accessibilityLabel="학습 메모"
          value={memo}
          onChangeText={(value) => {
            setMemo(value);
            setSaved(false);
          }}
          onBlur={saveMemo}
          placeholder="헷갈린 개념이나 다음에 확인할 내용을 기록해 보세요"
          placeholderTextColor={theme.textSecondary}
          selectionColor={theme.primary}
          multiline
          textAlignVertical="top"
          style={[styles.memoInput, { color: theme.text }]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="학습 메모 저장"
          onPress={saveMemo}
          style={({ pressed }) => [
            styles.saveButton,
            {
              backgroundColor: saved ? theme.successSoft : theme.primarySoft,
            },
            pressed && styles.pressed,
          ]}
        >
          <ThemedText
            type="smallBold"
            style={{ color: saved ? theme.success : theme.primary }}
          >
            {saved ? "저장됨" : "메모 저장"}
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.two,
  },
  tag: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderWidth: 1,
    borderRadius: Radius.pill,
  },
  memoBox: {
    overflow: "hidden",
    borderWidth: 1,
    borderRadius: Radius.medium,
  },
  memoInput: {
    minHeight: 82,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.one,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: 500,
  },
  saveButton: {
    alignSelf: "flex-end",
    marginRight: Spacing.two,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
  },
  pressed: {
    opacity: 0.72,
  },
});
