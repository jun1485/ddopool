// AI 생성 문제 정답 교차 검증 CLI — 문제를 블라인드로 풀어 answerIndex 대조, 불일치 시 재판정
// 사용법: node scripts/verify-content.mjs [번들경로] [--model claude-opus-4-8] [--concurrency 3] [--out 리포트경로]
// 인증: ANTHROPIC_API_KEY 환경 변수 또는 ant auth login 프로필
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));

// 실행 인자 해석
function parseArgs(argv) {
  const args = {
    file: resolve(scriptDir, '..', 'seed', 'initial-content.json'),
    model: 'claude-opus-4-8',
    concurrency: 3,
    out: null,
  };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === '--model') {
      args.model = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--concurrency') {
      args.concurrency = Number(argv[i + 1]);
      i += 1;
    } else if (argv[i] === '--out') {
      args.out = resolve(process.cwd(), argv[i + 1]);
      i += 1;
    } else {
      args.file = resolve(process.cwd(), argv[i]);
    }
  }
  return args;
}

let Anthropic;
try {
  ({ default: Anthropic } = await import('@anthropic-ai/sdk'));
} catch {
  console.error('의존성이 없습니다 — db 폴더에서 npm install 을 먼저 실행해 주세요');
  process.exit(1);
}

const { file, model, concurrency, out } = parseArgs(process.argv);
const content = JSON.parse(readFileSync(file, 'utf8'));
if (!Array.isArray(content.questions) || content.questions.length === 0) {
  console.error('검증할 questions 배열이 없습니다');
  process.exit(1);
}

const client = new Anthropic();

const SYSTEM_PROMPT =
  '자격시험 문제은행 검수 위원으로서 객관식 문제를 정확하게 풀고 판정합니다. 근거가 불확실하면 confidence를 낮게 표기합니다.';

// 보기 목록 텍스트 구성
function formatChoices(choices) {
  return choices.map((choice, index) => `${index}. ${choice}`).join('\n');
}

// 블라인드 풀이 응답 스키마 생성
function buildSolveSchema(choiceCount) {
  return {
    type: 'object',
    properties: {
      answerIndex: { type: 'integer', enum: [...Array(choiceCount).keys()] },
      confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
      reasoning: { type: 'string' },
    },
    required: ['answerIndex', 'confidence', 'reasoning'],
    additionalProperties: false,
  };
}

// 재판정 응답 스키마
const ADJUDICATE_SCHEMA = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['bundle_correct', 'model_correct', 'ambiguous'] },
    note: { type: 'string' },
  },
  required: ['verdict', 'note'],
  additionalProperties: false,
};

// 구조화 출력 요청 및 JSON 파싱
async function requestJson(userText, schema) {
  const response = await client.messages.create({
    model,
    max_tokens: 4000,
    system: SYSTEM_PROMPT,
    thinking: { type: 'adaptive' },
    output_config: { format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: userText }],
  });
  if (response.stop_reason === 'refusal') throw new Error('모델이 요청을 거부했습니다');
  if (response.stop_reason === 'max_tokens') throw new Error('응답이 토큰 한도에서 잘렸습니다');
  const textBlock = response.content.find((block) => block.type === 'text');
  if (!textBlock) throw new Error('텍스트 응답이 없습니다');
  return JSON.parse(textBlock.text);
}

// 문제 1건 검증 (블라인드 풀이 → 불일치 시 출제 정보 공개 후 재판정)
async function verifyQuestion(question) {
  const solvePrompt =
    `다음 객관식 문제를 풀어 주세요. 정답 보기의 인덱스(0부터 시작)를 answerIndex로 답합니다.\n\n` +
    `[문제]\n${question.prompt}\n\n[보기]\n${formatChoices(question.choices)}`;
  const solved = await requestJson(solvePrompt, buildSolveSchema(question.choices.length));

  if (solved.answerIndex === question.answerIndex) {
    return {
      questionId: question.id,
      examId: question.examId,
      status: 'pass',
      claimedAnswerIndex: question.answerIndex,
      modelAnswerIndex: solved.answerIndex,
      confidence: solved.confidence,
      note: solved.reasoning,
    };
  }

  // 1차 풀이와 출제 정답 불일치 — 근거 공개 후 최종 판정
  const adjudicatePrompt =
    `${solvePrompt}\n\n` +
    `[출제 정보]\n출제된 정답 인덱스: ${question.answerIndex}\n출제 해설: ${question.explanation}\n\n` +
    `[1차 풀이]\n선택한 인덱스: ${solved.answerIndex}\n근거: ${solved.reasoning}\n\n` +
    `출제 정답과 1차 풀이가 다릅니다. 어느 쪽이 옳은지 최종 판정해 주세요. ` +
    `출제 정답이 옳으면 bundle_correct, 1차 풀이가 옳으면 model_correct, ` +
    `문제 자체가 모호하거나 복수 정답이면 ambiguous로 답하고 note에 사유를 적습니다.`;
  const adjudicated = await requestJson(adjudicatePrompt, ADJUDICATE_SCHEMA);

  const statusByVerdict = {
    bundle_correct: 'pass',
    model_correct: 'fail',
    ambiguous: 'ambiguous',
  };
  return {
    questionId: question.id,
    examId: question.examId,
    status: statusByVerdict[adjudicated.verdict],
    claimedAnswerIndex: question.answerIndex,
    modelAnswerIndex: solved.answerIndex,
    confidence: solved.confidence,
    note: adjudicated.note,
  };
}

// 제한 동시성 실행
async function runPool(items, worker, laneCount) {
  const results = new Array(items.length);
  let cursor = 0;
  const lanes = Array.from({ length: Math.min(laneCount, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await worker(items[index]);
    }
  });
  await Promise.all(lanes);
  return results;
}

console.log(`검증 시작: 문제 ${content.questions.length}건 (model=${model}, 동시 ${concurrency})`);

const results = await runPool(
  content.questions,
  async (question) => {
    try {
      const result = await verifyQuestion(question);
      const marks = { pass: '✓', fail: '✗', ambiguous: '?' };
      console.log(`${marks[result.status]} ${result.questionId} [${result.status}] ${result.status === 'pass' ? '' : result.note}`);
      return result;
    } catch (error) {
      const detail = error instanceof Anthropic.APIError ? `API ${error.status}: ${error.message}` : error.message;
      console.log(`! ${question.id} [error] ${detail}`);
      return { questionId: question.id, examId: question.examId, status: 'error', note: detail };
    }
  },
  concurrency,
);

const counts = { pass: 0, fail: 0, ambiguous: 0, error: 0 };
for (const result of results) counts[result.status] += 1;

const reportPath = out ?? `${file.replace(/\.json$/, '')}.verify-report.json`;
writeFileSync(
  reportPath,
  `${JSON.stringify({ model, verifiedAt: new Date().toISOString(), total: results.length, ...counts, results }, null, 2)}\n`,
  'utf8',
);

console.log(
  `\n검증 완료: 통과 ${counts.pass} / 오답 의심 ${counts.fail} / 모호 ${counts.ambiguous} / 오류 ${counts.error}\n리포트: ${reportPath}`,
);
process.exit(counts.fail + counts.ambiguous + counts.error > 0 ? 1 : 0);
