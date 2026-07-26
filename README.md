# Exam Loop

시험(컴활·드론 자격·TOEIC 등)을 선택해 문제를 풀고 SM-2 간격 반복으로 복습하는 학습 앱.
원하는 시험이 없으면 요청·투표로 수요를 모으고, 운영자가 승인하면 AI 파이프라인으로 문제를 제작해 공개하는 구조.

## 저장소 구조

- `src/` — Expo 앱 (iOS·Android·웹). 로컬 우선 학습 + Supabase 로그인 시 동기화
- `db/migrations/` — Supabase 스키마 (0001→0002→0003→0004→0005→0006 순서 실행)
- `db/seed/bundles/` — 시험별 문항 번들 (시험 1개 + 문항 100+, `import-content`로 개별 업로드)
- `db/scripts/` — 콘텐츠·운영 CLI (아래 표)
- `packages/contracts/` — 앱↔DB API 계약 (타입·테이블/RPC 이름·매퍼)
- `apps/admin/` — 로컬 전용 단일 HTML 어드민 (요청 큐·문제 검수·신고 처리·이용 제한)
- `docs/legal/` — 개인정보처리방침·이용약관 초안 (배포 전 `{{...}}` 항목 채우고 웹 호스팅 필요)
- `services/content-worker/` — AI 문제 생성·분류·검증 워커

## 앱 실행

```sh
npm install
npm start        # 모바일 (Expo Go / 에뮬레이터)
npm run web      # 웹
```

Supabase 환경 변수 없이 실행하면 로컬(mock) 모드로 동작한다.

## Supabase 셋업 (최초 1회)

1. supabase.com에서 프로젝트 생성
2. SQL Editor에서 `db/migrations/0001_init.sql` → `0002` → `0003` → `0004` → `0005` → `0006` 순서 실행
3. Authentication → Providers에서 이메일(및 필요 시 Anonymous) 활성화
4. 앱 환경 변수 설정: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. 초기 콘텐츠 업로드:

```sh
cd db
npm install
$env:SUPABASE_URL="https://xxxx.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="..."
npm run import-content
```

6. 대시보드에서 본인 계정의 `profiles.role`을 `admin`으로 변경 (요청 상태 변경 RPC 권한)
7. 셋업 검증: `npm run verify-setup` (`SUPABASE_ANON_KEY`까지 주면 가입→요청→알림·RLS 차단 플로우 검증 포함)

## 콘텐츠 파이프라인

시험 요청 접수 → 승인 → AI 문제 생성(ContentBundle JSON) → 정답 교차 검증 → 업로드 → 검수 → 공개 순서로 흐른다.

시험별 번들은 `db/seed/bundles/<examId>.json`에 두고 개별로 업로드한다. 신규 문항은 `needs_review`로 올려 검수 후 공개한다.

```sh
cd db
node scripts/verify-content.mjs seed/bundles/computer-2.json     # Claude API 블라인드 풀이 검증 (ANTHROPIC_API_KEY 필요)
node scripts/import-content.mjs seed/bundles/computer-2.json --dry-run   # 구조·중복 검증만
node scripts/import-content.mjs seed/bundles/computer-2.json --status needs_review
node scripts/admin-questions.mjs list --status needs_review
node scripts/admin-questions.mjs review <questionId> approved
node scripts/admin-questions.mjs publish --exam <examId>
```

## 운영 CLI

| 명령 | 용도 |
|---|---|
| `npm run verify-setup` | 마이그레이션 적용 직후 구조·트리거·RPC·RLS 자동 검증 (테스트 데이터 자가 정리) |
| `npm run export-content` | 앱 번들 데이터 → 시드 JSON 추출 |
| `npm run import-content` | 콘텐츠 JSON 검증·업서트 (`--dry-run`, `--status`) |
| `npm run check-bundles` | 시드·번들 전체 교차 검증 (파일 간 id·문항 중복, 시험별 문항 수, 정답 위치 편중) |
| `npm run balance-answers` | 시험 단위 정답 위치 균등 재배치 (업로드 전에만 실행) |
| `npm run verify-content` | AI 정답 교차 검증 (통과 실패 시 exit 1) |
| `npm run admin-requests` | 시험 요청 목록·상태 변경 (`list`, `set-status`) |
| `npm run admin-questions` | 문제 검수·공개 (`list`, `show`, `review`, `publish`) |

전부 service role 키 필요(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). verify-content만 `ANTHROPIC_API_KEY` 사용.

## 어드민 웹

`apps/admin/index.html`을 브라우저로 열고 Supabase URL + service role key 입력.
키는 브라우저 localStorage에만 저장된다 — 이 파일은 절대 배포·호스팅하지 않는다.

탭 구성: 대시보드 · 시험 관리 · 시험 요청 · 문제 검수 · 오류 신고 · 요청 신고 · 이용 제한

## 콘텐츠 정책

- 실제 기출 원문은 공개가 허용된 경우(국가자격 공개 문제 등)만 사용하고 출처·라이선스를 `content_sources`에 기록
- 저작권 보호 시험(TOEIC 등)은 유형 기반 자체 제작 문제만 사용
- AI 생성 문제는 사람 검수(승인) 전에는 사용자에게 노출하지 않음

## 사용자 제출 콘텐츠 정책

- 시험 요청은 `triage` 이후 상태만 공개 — 등록 직후(`requested`)에는 작성자·관리자만 조회
- 같은 시험이 다른 이름으로 등록되면 어드민에서 대표 요청으로 병합 — 투표가 이관되고 원본 요청명은 `exam_request_aliases`에 검색 별칭으로 보존되어 이후 동일 이름 요청은 대표 요청에 자동 합류
- 요청 등록 시 `banned_terms` 금칙어를 요청명·기관·등급·사유 전체에 적용
- 요청 신고는 `report_exam_request` RPC로 접수하고 3건 누적 시 `blocked`로 자동 비공개 전환
- 이용 제한(`profiles.banned_at`) 계정은 요청·투표·신고가 차단되고 학습 기능만 유지
- 계정 삭제(`delete_my_account`)는 학습 기록·투표·푸시 토큰을 연쇄 삭제하고 커뮤니티 요청은 작성자 익명화 후 유지
