// 웹 export 결과에 시험별 검색용 정적 페이지·사이트맵 추가
// 사용법: node scripts/seo-pages.mjs [출력 폴더]
import fs from "node:fs";
import path from "node:path";

const outputDir = process.argv[2] ?? "dist";
const bundleDir = "db/seed/bundles";
const siteUrl = (
  process.env.EXPO_PUBLIC_SITE_URL || "https://ddopool.vercel.app"
).replace(/\/$/, "");
const PLAY_ID = "com.jun213.ddopool";
const SUBJECT_PAGE_SIZE = 20;
const PREVIEW_PER_SUBJECT = 2;

// 운영 카탈로그에 공개되지 않은 시험
const UNPUBLISHED_EXAM_IDS = new Set([
  "aws-cloud-practitioner",
  "aws-solutions-architect-associate",
]);

// 검색에서 흔히 쓰는 시험 줄임말
const SEARCH_ALIASES = {
  "info-processing": "정처기",
  "industrial-safety": "산안기",
  "computer-1": "컴활 1급",
  "computer-2": "컴활 2급",
  "korean-history": "한능검",
  "information-security": "정보보안기사",
  "bigdata-engineer": "빅분기",
  "social-survey-2": "사조사 2급",
};

const CHOICE_MARKS = ["①", "②", "③", "④", "⑤", "⑥"];

// HTML 특수문자 이스케이프
function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// 시험 번들 병합, 같은 시험 문항은 ID 기준 중복 제거
function loadExams() {
  const exams = new Map();
  for (const file of fs.readdirSync(bundleDir).sort()) {
    const bundle = JSON.parse(
      fs.readFileSync(path.join(bundleDir, file), "utf8"),
    );
    for (const exam of bundle.exams) {
      if (UNPUBLISHED_EXAM_IDS.has(exam.id) || exams.has(exam.id)) continue;
      exams.set(exam.id, { ...exam, questions: new Map() });
    }
    for (const question of bundle.questions)
      exams.get(question.examId)?.questions.set(question.id, question);
  }
  return [...exams.values()].map((exam) => ({
    ...exam,
    questions: [...exam.questions.values()].sort((a, b) =>
      a.id.localeCompare(b.id),
    ),
  }));
}

// 과목별 문항 묶음 구성
function groupBySubject(exam) {
  return exam.subjects
    .map((subject, index) => ({
      subject,
      slug: String(index + 1),
      questions: exam.questions.filter((q) => q.subject === subject),
    }))
    .filter((group) => group.questions.length > 0);
}

// 시험 이름에 검색 줄임말 덧붙이기
function examLabel(exam) {
  const alias = SEARCH_ALIASES[exam.id];
  return alias && !exam.title.includes(alias)
    ? `${exam.title}(${alias})`
    : exam.title;
}

// Play 스토어 설치 링크, 유입 페이지 표시 포함
function playLink(campaign) {
  const referrer = `utm_source=web&utm_medium=exam_page&utm_campaign=${campaign}`;
  return `https://play.google.com/store/apps/details?id=${PLAY_ID}&referrer=${encodeURIComponent(referrer)}`;
}

const STYLE = `
:root{color-scheme:light dark;--text:#1B2733;--muted:#5B6B7B;--bg:#FFFFFF;--card:#F5F8FB;--line:#E2E8EF;--primary:#1E6FD9;--primary-soft:#E9F2FD;--on-primary:#FFFFFF}
@media (prefers-color-scheme:dark){:root{--text:#E8EEF4;--muted:#9AA8B6;--bg:#0F161D;--card:#17212B;--line:#24313D;--primary:#5AA2F0;--primary-soft:#16304B;--on-primary:#0F161D}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",sans-serif;line-height:1.65;word-break:keep-all}
main{max-width:760px;margin:0 auto;padding:24px 16px 64px}
a{color:var(--primary)}nav.crumbs{font-size:14px;color:var(--muted);margin-bottom:12px}nav.crumbs a{color:var(--muted)}
h1{font-size:26px;line-height:1.35;margin:0 0 8px}h2{font-size:20px;margin:36px 0 12px}
.lead{color:var(--muted);margin:0 0 20px}
.cta{display:flex;flex-wrap:wrap;gap:10px;margin:20px 0}
.cta a{display:inline-block;padding:12px 18px;border-radius:12px;font-weight:700;text-decoration:none}
.cta .primary{background:var(--primary);color:var(--on-primary)}.cta .secondary{background:var(--primary-soft);color:var(--primary)}
ul.cards{list-style:none;padding:0;margin:0;display:grid;gap:10px}
ul.cards li{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:14px 16px}
ul.cards a{font-weight:700;text-decoration:none}ul.cards p{margin:4px 0 0;color:var(--muted);font-size:14px}
.question{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;margin:0 0 12px}
.question .no{font-size:13px;color:var(--muted);margin:0 0 4px}.question .prompt{font-weight:600;margin:0 0 10px}
.question ol{list-style:none;padding:0;margin:0 0 10px}.question ol li{padding:3px 0}
details summary{cursor:pointer;color:var(--primary);font-weight:700}details p{margin:8px 0 0}
.notice{font-size:14px;color:var(--muted);border-top:1px solid var(--line);margin-top:40px;padding-top:16px}
footer{font-size:13px;color:var(--muted);margin-top:24px}footer a{color:var(--muted);margin-right:12px}
`;

// 공통 문서 틀 생성
function renderPage({ title, description, canonicalPath, body }) {
  const canonical = `${siteUrl}${canonicalPath}`;
  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${canonical}">
<link rel="icon" href="/favicon.ico">
<meta property="og:type" content="website">
<meta property="og:site_name" content="또풀">
<meta property="og:locale" content="ko_KR">
<meta property="og:title" content="${escapeHtml(title)}">
<meta property="og:description" content="${escapeHtml(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${siteUrl}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<style>${STYLE}</style>
</head>
<body>
<main>
${body}
<p class="notice">또풀 문제는 시험 출제 범위를 바탕으로 직접 만든 연습문제이며 실제 기출 원문이 아닙니다. 문제 오류는 앱의 문제 신고로 알려 주세요.</p>
<footer><a href="/">또풀 홈</a><a href="/exams">시험 목록</a><a href="/privacy">개인정보처리방침</a><a href="/terms">이용약관</a></footer>
</main>
</body>
</html>
`;
}

// 문항 카드 생성
function renderQuestion(question, number) {
  const choices = question.choices
    .map(
      (choice, index) =>
        `<li>${CHOICE_MARKS[index] ?? `${index + 1}.`} ${escapeHtml(choice)}</li>`,
    )
    .join("");
  return `<section class="question">
<p class="no">${number}번 · ${escapeHtml(question.subject)}</p>
<p class="prompt">${escapeHtml(question.prompt)}</p>
<ol>${choices}</ol>
<details><summary>정답과 해설 보기</summary><p><strong>정답 ${CHOICE_MARKS[question.answerIndex] ?? question.answerIndex + 1}</strong> ${escapeHtml(question.choices[question.answerIndex])}</p><p>${escapeHtml(question.explanation)}</p></details>
</section>`;
}

// 바로 풀기·설치 버튼 생성
function renderCta(exam) {
  return `<div class="cta"><a class="primary" href="/onboarding?exam=${exam.id}">웹에서 바로 풀기</a><a class="secondary" href="${playLink(exam.id)}">안드로이드 앱 설치</a></div>`;
}

// 시험 소개 페이지 생성
function renderExamPage(exam, groups, allExams) {
  const label = examLabel(exam);
  const subjects = groups
    .map(
      (group) =>
        `<li><a href="/exams/${exam.id}/${group.slug}">${escapeHtml(group.subject)} 문제</a><p>연습문제 ${group.questions.length}개 · 정답과 해설 포함</p></li>`,
    )
    .join("");
  const previews = groups
    .flatMap((group) => group.questions.slice(0, PREVIEW_PER_SUBJECT))
    .map((question, index) => renderQuestion(question, index + 1))
    .join("");
  const others = allExams
    .filter((other) => other.id !== exam.id)
    .map(
      (other) =>
        `<li><a href="/exams/${other.id}">${escapeHtml(other.title)}</a></li>`,
    )
    .join("");
  return renderPage({
    title: `${label} 문제 풀이·해설 무료 연습 | 또풀`,
    description: `${exam.title} ${exam.subjects.join("·")} 과목 연습문제 ${exam.questions.length}개를 정답·해설과 함께 무료로 풀어 보세요. 틀린 문제는 간격 반복 복습으로 다시 풀 수 있습니다.`,
    canonicalPath: `/exams/${exam.id}`,
    body: `<nav class="crumbs"><a href="/">또풀</a> › <a href="/exams">시험 목록</a> › ${escapeHtml(exam.title)}</nav>
<h1>${escapeHtml(label)} 문제 풀이</h1>
<p class="lead">${escapeHtml(exam.description)} 과목 연습문제 ${exam.questions.length}개를 해설과 함께 풀고, 틀린 문제는 복습 일정에 맞춰 다시 풀 수 있습니다. 로그인 없이 바로 시작할 수 있습니다.</p>
${renderCta(exam)}
<h2>과목별 문제</h2>
<ul class="cards">${subjects}</ul>
<h2>맛보기 문제</h2>
${previews}
${renderCta(exam)}
<h2>다른 시험</h2>
<ul class="cards">${others}</ul>`,
  });
}

// 과목 문제 페이지 생성
function renderSubjectPage(exam, group, groups) {
  const label = examLabel(exam);
  const questions = group.questions
    .slice(0, SUBJECT_PAGE_SIZE)
    .map((question, index) => renderQuestion(question, index + 1))
    .join("");
  const siblings = groups
    .filter((other) => other.slug !== group.slug)
    .map(
      (other) =>
        `<li><a href="/exams/${exam.id}/${other.slug}">${escapeHtml(other.subject)} 문제</a></li>`,
    )
    .join("");
  const shown = Math.min(SUBJECT_PAGE_SIZE, group.questions.length);
  return renderPage({
    title: `${label} ${group.subject} 문제 ${shown}개·해설 | 또풀`,
    description: `${exam.title} ${group.subject} 과목 연습문제 ${shown}개와 정답·해설. 또풀에서 이 과목 ${group.questions.length}문제를 무료로 풀고 틀린 문제를 복습할 수 있습니다.`,
    canonicalPath: `/exams/${exam.id}/${group.slug}`,
    body: `<nav class="crumbs"><a href="/">또풀</a> › <a href="/exams">시험 목록</a> › <a href="/exams/${exam.id}">${escapeHtml(exam.title)}</a> › ${escapeHtml(group.subject)}</nav>
<h1>${escapeHtml(label)} ${escapeHtml(group.subject)} 문제</h1>
<p class="lead">${escapeHtml(group.subject)} 과목 연습문제 ${shown}개입니다. 보기를 고른 뒤 정답과 해설을 펼쳐 확인하세요. 나머지 ${Math.max(group.questions.length - shown, 0)}문제와 틀린 문제 복습은 또풀에서 이어서 풀 수 있습니다.</p>
${renderCta(exam)}
${questions}
${renderCta(exam)}
<h2>같은 시험의 다른 과목</h2>
<ul class="cards">${siblings}</ul>`,
  });
}

// 시험 목록 페이지 생성
function renderIndexPage(exams) {
  const items = exams
    .map(
      (exam) =>
        `<li><a href="/exams/${exam.id}">${escapeHtml(examLabel(exam))}</a><p>${escapeHtml(exam.description)} · 연습문제 ${exam.questions.length}개</p></li>`,
    )
    .join("");
  return renderPage({
    title: "자격증 문제 풀이 시험 목록 — 산업안전기사·정처기·SQLD | 또풀",
    description: `산업안전기사·정보처리기사·SQLD·컴활·한국사 등 ${exams.length}개 시험의 연습문제를 정답·해설과 함께 무료로 풀 수 있는 또풀 시험 목록입니다.`,
    canonicalPath: "/exams",
    body: `<nav class="crumbs"><a href="/">또풀</a> › 시험 목록</nav>
<h1>자격증 문제 풀이 시험 목록</h1>
<p class="lead">준비 중인 시험을 고르면 과목별 연습문제와 해설을 볼 수 있습니다. 틀린 문제는 또풀 앱에서 간격 반복 복습으로 다시 풀 수 있습니다.</p>
<ul class="cards">${items}</ul>`,
  });
}

// 파일 쓰기, 상위 폴더 자동 생성
function writeFile(relativePath, content) {
  const target = path.join(outputDir, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

// 앱 화면 HTML 빈 제목·설명 보강, 첫 화면 외 앱 화면은 색인 제외
function patchAppShells(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (path.relative(outputDir, full) !== "exams") patchAppShells(full);
      continue;
    }
    if (!entry.name.endsWith(".html")) continue;
    let html = fs.readFileSync(full, "utf8");
    if (!html.includes('<title data-rh="true"></title>')) continue;
    const ogTitle = html.match(/<meta property="og:title" content="([^"]*)"/);
    const ogDescription = html.match(
      /<meta property="og:description" content="([^"]*)"/,
    );
    const isHome = path.relative(outputDir, full) === "index.html";
    const extra = [
      ogDescription && !html.includes('<meta name="description"')
        ? `<meta name="description" content="${ogDescription[1]}"/>`
        : "",
      isHome
        ? `<link rel="canonical" href="${siteUrl}/"/>`
        : '<meta name="robots" content="noindex"/>',
    ].join("");
    html = html.replace(
      '<title data-rh="true"></title>',
      `<title data-rh="true">${ogTitle ? ogTitle[1] : "또풀"}</title>${extra}`,
    );
    fs.writeFileSync(full, html);
  }
}

const exams = loadExams();
const urls = ["/", "/exams"];
writeFile("exams.html", renderIndexPage(exams));
for (const exam of exams) {
  const groups = groupBySubject(exam);
  writeFile(`exams/${exam.id}.html`, renderExamPage(exam, groups, exams));
  urls.push(`/exams/${exam.id}`);
  for (const group of groups) {
    writeFile(
      `exams/${exam.id}/${group.slug}.html`,
      renderSubjectPage(exam, group, groups),
    );
    urls.push(`/exams/${exam.id}/${group.slug}`);
  }
}
patchAppShells(outputDir);

const today = new Date().toISOString().slice(0, 10);
writeFile(
  "sitemap.xml",
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `<url><loc>${siteUrl}${url}</loc><lastmod>${today}</lastmod></url>`).join("\n")}
</urlset>
`,
);
const robotsPath = path.join(outputDir, "robots.txt");
const robots = fs.existsSync(robotsPath)
  ? fs.readFileSync(robotsPath, "utf8")
  : "User-agent: *\nAllow: /\n";
if (!robots.includes("Sitemap:"))
  fs.writeFileSync(
    robotsPath,
    `${robots.trimEnd()}\nSitemap: ${siteUrl}/sitemap.xml\n`,
  );
console.log(
  `검색용 페이지 ${urls.length - 1}개·사이트맵 생성 (${exams.length}개 시험)`,
);
