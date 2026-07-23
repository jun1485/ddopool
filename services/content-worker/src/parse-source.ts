import type {
  ParsedSourceDocument,
  ParsedSourceSection,
  SourceDocumentInput,
} from "./types";

const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

const SECTION_MAX_LENGTH = 4_000;

// HTML 문자 엔터티 복원
function decodeHtmlEntities(value: string): string {
  return Object.entries(HTML_ENTITIES).reduce(
    (decoded, [entity, character]) => decoded.replaceAll(entity, character),
    value,
  );
}

// HTML 원문 가시 텍스트 추출
function extractHtmlText(value: string): string {
  return decodeHtmlEntities(
    value
      .replaceAll(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replaceAll(/<\/?(h[1-6]|p|div|li|tr|section|article|br)[^>]*>/gi, "\n")
      .replaceAll(/<[^>]+>/g, " "),
  );
}

// CSV 원문 행·열 파싱
function parseCsvRows(value: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    const nextCharacter = value[index + 1];
    if (character === '"' && quoted && nextCharacter === '"') {
      cell += '"';
      index += 1;
    } else if (character === '"') quoted = !quoted;
    else if (character === "," && !quoted) {
      row.push(cell.trim());
      cell = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && nextCharacter === "\n") index += 1;
      row.push(cell.trim());
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      cell = "";
    } else cell += character;
  }

  row.push(cell.trim());
  if (row.some((value) => value.length > 0)) rows.push(row);
  return rows;
}

// 원문 공백·줄바꿈 정규화
function normalizeSourceText(value: string): string {
  return value
    .replaceAll(/\r\n?/g, "\n")
    .replaceAll(/[ \t]+/g, " ")
    .replaceAll(/ *\n */g, "\n")
    .replaceAll(/\n{3,}/g, "\n\n")
    .trim();
}

// 원문 구간 크기 분할
function splitSourceSections(
  sourceId: string,
  plainText: string,
): ParsedSourceSection[] {
  const paragraphs = plainText.split(/\n{2,}/).filter(Boolean);
  const sections: ParsedSourceSection[] = [];
  let content = "";

  paragraphs.forEach((paragraph) => {
    const nextContent =
      content.length === 0 ? paragraph : `${content}\n\n${paragraph}`;
    if (nextContent.length <= SECTION_MAX_LENGTH) {
      content = nextContent;
      return;
    }
    if (content.length > 0)
      sections.push({
        id: `${sourceId}-section-${sections.length + 1}`,
        title: `원문 구간 ${sections.length + 1}`,
        content,
      });
    content = paragraph;
  });

  if (content.length > 0)
    sections.push({
      id: `${sourceId}-section-${sections.length + 1}`,
      title: `원문 구간 ${sections.length + 1}`,
      content,
    });
  return sections;
}

// 수집 원문 정규화·구간 분할
export function parseSourceDocument(
  input: SourceDocumentInput,
): ParsedSourceDocument {
  const warnings: string[] = [];
  const rawText =
    input.format === "html"
      ? extractHtmlText(input.content)
      : input.format === "csv"
        ? parseCsvRows(input.content)
            .map((row) => row.join(" | "))
            .join("\n")
        : input.content;
  const plainText = normalizeSourceText(rawText);

  if (input.format === "extracted-pdf-text")
    warnings.push(
      "PDF 표·각주·다단 배치는 추출 과정에서 순서가 달라질 수 있어 사람 검수가 필요합니다.",
    );
  if (plainText.length === 0)
    warnings.push("정규화 후 사용할 수 있는 원문 텍스트가 없습니다.");

  return {
    sourceId: input.sourceId,
    plainText,
    sections: splitSourceSections(input.sourceId, plainText),
    warnings,
  };
}
