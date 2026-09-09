// 앱 번들 데이터(src/data)를 시드 JSON으로 추출
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, '..', '..');
const outputPath = resolve(scriptDir, '..', 'seed', 'initial-content.json');

// TS 데이터 파일에서 배열 리터럴 추출
function extractArrayLiteral(sourcePath) {
  const source = readFileSync(sourcePath, 'utf8');
  const assignIndex = source.indexOf('= [');
  const endIndex = source.indexOf('\n];', assignIndex);
  if (assignIndex < 0 || endIndex < 0) {
    throw new Error(`배열 리터럴을 찾지 못했습니다: ${sourcePath}`);
  }
  // 별도 번들 문제의 시드 중복 방지
  const literal = source.slice(assignIndex + 2, endIndex + 2)
    .replace(/^\s*\.\.\.ADDITIONAL_(?:EXAMS|QUESTIONS),\r?\n/gm, '');
  return new Function(`return ${literal};`)();
}

const exams = extractArrayLiteral(resolve(repoRoot, 'src', 'data', 'exams.ts'));
const questions = extractArrayLiteral(resolve(repoRoot, 'src', 'data', 'questions.ts'));

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify({ exams, questions }, null, 2)}\n`, 'utf8');

console.log(`시드 추출 완료: 시험 ${exams.length}개, 문제 ${questions.length}개 → ${outputPath}`);
