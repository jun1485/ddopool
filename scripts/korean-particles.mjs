// 자동 생성 문구의 "은(는)" 조사를 앞 단어 발음에 맞춰 교정

const HANGUL_START = 0xac00;
const HANGUL_END = 0xd7a3;
// 숫자 한글 읽기 받침 여부 (영·일·삼·육·칠·팔)
const DIGIT_HAS_FINAL = new Set(["0", "1", "3", "6", "7", "8"]);
// 영문 약어 글자 읽기 받침 여부 (엘·엠·엔·알)
const UPPER_HAS_FINAL = new Set(["L", "M", "N", "R"]);
// 글자가 아니라 단어로 읽는 영문 용어의 받침 여부
const WORD_READINGS = {
  VLOOKUP: true,
  HLOOKUP: true,
  XLOOKUP: true,
  ROLLUP: true,
  ROUNDUP: true,
  NOT: true,
  RENAME: true,
  HAVING: true,
  SUBSTRING: true,
  CONCAT: true,
  COMMIT: true,
  ROLLBACK: true,
  NAT: true,
  NIC: true,
  IPsec: true,
  cat: true,
  grep: true,
  top: true,
  home: true,
  OR: false,
  LOWER: false,
  UPPER: false,
  ROW_NUMBER: false,
  CIDR: false,
};

// 앞 단어 끝소리 받침 여부 판정
export function endsWithFinalConsonant(word) {
  const trimmed = word.replace(/[^0-9A-Za-z가-힣]+$/, "");
  const lastToken = trimmed.split(/[^0-9A-Za-z_가-힣]/).pop() ?? "";
  if (lastToken in WORD_READINGS) return WORD_READINGS[lastToken];
  const last = trimmed.slice(-1);
  if (last === "") return false;
  const code = last.charCodeAt(0);
  if (code >= HANGUL_START && code <= HANGUL_END)
    return (code - HANGUL_START) % 28 !== 0;
  if (/[0-9]/.test(last)) return DIGIT_HAS_FINAL.has(last);
  if (/[A-Z]/.test(last)) return UPPER_HAS_FINAL.has(last);
  return /(ng|[lmn])$/.test(trimmed);
}

// 문장 속 "은(는)" 조사 교정
export function fixParticles(text) {
  return text.replace(
    /(\S+)은\(는\)/g,
    (_, word) => `${word}${endsWithFinalConsonant(word) ? "은" : "는"}`,
  );
}
