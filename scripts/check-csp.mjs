// 웹 export 인라인 스크립트가 vercel.json CSP 해시에 모두 포함됐는지 검증
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const outputDir = process.argv[2] ?? "dist";
const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));
const policy = vercel.headers
  .flatMap((rule) => rule.headers)
  .find((header) => header.key === "Content-Security-Policy")?.value;
if (policy == null) throw new Error("vercel.json 에 CSP 헤더가 없습니다");
const scriptSources =
  policy
    .split(";")
    .map((directive) => directive.trim().split(/\s+/))
    .find(([name]) => name === "script-src")
    ?.slice(1) ?? [];

// HTML 파일 재귀 수집
function collectHtml(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectHtml(full);
    return entry.name.endsWith(".html") ? [full] : [];
  });
}

const missing = new Set();
for (const file of collectHtml(outputDir)) {
  const html = fs.readFileSync(file, "utf8");
  for (const match of html.matchAll(
    /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g,
  )) {
    const hash = `'sha256-${crypto.createHash("sha256").update(match[1]).digest("base64")}'`;
    if (!scriptSources.includes(hash)) missing.add(hash);
  }
}
if (missing.size > 0) {
  console.error("CSP script-src 에 없는 인라인 스크립트 해시:", [...missing]);
  process.exit(1);
}
console.log("CSP 인라인 스크립트 해시 확인 완료");
