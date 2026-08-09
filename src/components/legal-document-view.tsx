import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/components/themed-text";
import { Radius, Spacing } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

type LegalBlock =
  | { kind: "heading"; level: 2 | 3; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "table"; rows: string[][] };

const TABLE_DIVIDER_PATTERN = /^\|[\s:|-]+\|$/;

// 표 구분 문자 기준 셀 분리
function parseTableRow(line: string): string[] {
  return line
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

// 법률 문서 마크다운을 화면 블록 목록으로 변환
function parseLegalMarkdown(markdown: string): LegalBlock[] {
  const blocks: LegalBlock[] = [];
  for (const rawLine of markdown.split("\n")) {
    const line = rawLine.trim();
    const previous = blocks.at(-1);

    if (line.length === 0) continue;

    if (line.startsWith("### ")) {
      blocks.push({ kind: "heading", level: 3, text: line.slice(4) });
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push({ kind: "heading", level: 2, text: line.slice(3) });
      continue;
    }

    if (line.startsWith("|")) {
      if (TABLE_DIVIDER_PATTERN.test(line)) continue;
      const row = parseTableRow(line);
      if (previous?.kind === "table") previous.rows.push(row);
      else blocks.push({ kind: "table", rows: [row] });
      continue;
    }

    const orderedMatch = /^(\d+)\.\s+(.*)$/.exec(line);
    if (line.startsWith("- ") || orderedMatch != null) {
      const ordered = orderedMatch != null;
      const item = ordered ? (orderedMatch[2] ?? "") : line.slice(2);
      if (previous?.kind === "list" && previous.ordered === ordered)
        previous.items.push(item);
      else blocks.push({ kind: "list", ordered, items: [item] });
      continue;
    }

    blocks.push({ kind: "paragraph", text: line });
  }
  return blocks;
}

// 법률 문서 본문 렌더링
export function LegalDocumentView({ markdown }: { markdown: string }) {
  const theme = useTheme();
  const blocks = useMemo(() => parseLegalMarkdown(markdown), [markdown]);

  return (
    <View style={styles.container}>
      {blocks.map((block, blockIndex) => {
        if (block.kind === "heading")
          return (
            <ThemedText
              key={blockIndex}
              type={block.level === 2 ? "subtitle" : "smallBold"}
              style={styles.heading}
            >
              {block.text}
            </ThemedText>
          );

        if (block.kind === "list")
          return (
            <View key={blockIndex} style={styles.list}>
              {block.items.map((item, itemIndex) => (
                <View key={itemIndex} style={styles.listItem}>
                  <ThemedText type="small" themeColor="textSecondary">
                    {block.ordered ? `${itemIndex + 1}.` : "·"}
                  </ThemedText>
                  <ThemedText type="small" style={styles.listItemText}>
                    {item}
                  </ThemedText>
                </View>
              ))}
            </View>
          );

        if (block.kind === "table")
          return (
            <View
              key={blockIndex}
              style={[styles.table, { borderColor: theme.border }]}
            >
              {block.rows.map((row, rowIndex) => (
                <View
                  key={rowIndex}
                  style={[
                    styles.tableRow,
                    rowIndex > 0 && {
                      borderTopWidth: StyleSheet.hairlineWidth,
                      borderTopColor: theme.border,
                    },
                    rowIndex === 0 && { backgroundColor: theme.backgroundElement },
                  ]}
                >
                  {row.map((cell, cellIndex) => (
                    <View key={cellIndex} style={styles.tableCell}>
                      <ThemedText
                        type={rowIndex === 0 ? "smallBold" : "small"}
                        themeColor={rowIndex === 0 ? "text" : "textSecondary"}
                      >
                        {cell}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          );

        return (
          <ThemedText key={blockIndex} type="small" style={styles.paragraph}>
            {block.text}
          </ThemedText>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.twoHalf,
  },
  heading: {
    marginTop: Spacing.three,
  },
  paragraph: {
    lineHeight: 22,
  },
  list: {
    gap: Spacing.two,
  },
  listItem: {
    flexDirection: "row",
    gap: Spacing.two,
  },
  listItemText: {
    flex: 1,
    lineHeight: 22,
  },
  table: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Radius.small,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableCell: {
    flex: 1,
    padding: Spacing.two,
  },
});
