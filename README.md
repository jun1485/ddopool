# 또풀

시험(컴활·드론 자격·TOEIC 등)을 선택해 문제를 풀고 SM-2 간격 반복으로 복습하는 학습 앱.
원하는 시험이 없으면 요청·투표로 수요를 모으고, 운영자가 승인하면 AI 파이프라인으로 문제를 제작해 공개하는 구조.

## 저장소 구조

- `src/` — Expo 앱 (iOS·Android·웹). 로컬 우선 학습 + Supabase 로그인 시 동기화
- `db/migrations/` — Supabase 스키마 (0001→0002→0003→0004→0005→0006 순서 실행)
- `db/seed/bundles/` — 시험별 문항 번들 (시험 1개 + 문항 100+, `import-content`로 개별 업로드)
- `db/scripts/` — 콘텐츠·운영 CLI (아래 표)
- `packages/contracts/` — 앱↔DB API 계약 (타입·테이블/RPC 이름·매퍼)
- `apps/admin/` — 로컬 전용 단일 HTML 어드민 (요청 큐·문제 검수·신고 처리·이용 제한)
- `src/data/legal-documents.ts` — 개인정보처리방침·이용약관 본문 (앱 `/privacy`·`/terms` 라우트와 웹 정적 페이지의 단일 정본)
- `services/content-worker/` — AI 문제 생성·분류·검증 워커
- `public/` — 웹 정적 파일 (`og-image.png`·`robots.txt`, 빌드 시 `dist/` 루트로 복사)

## 앱 실행

```sh
npm install
npm start        # 모바일 (Expo Go / 에뮬레이터)
npm run web      # 웹
```

Supabase 환경 변수 없이 실행하면 로컬(mock) 모드로 동작한다. 환경 변수 목록은 `.env.example` 참고.

## 웹 배포 (SEO)

웹은 `expo export --platform web`으로 라우트별 정적 HTML을 생성하며, 화면 제목·설명은 `src/components/page-head.tsx`의 `PageHead`로 지정한다. 신규 화면 추가 시 `PageHead`를 넣지 않으면 `src/app/_layout.tsx`의 기본값(사이트 제목·설명)이 적용된다.

배포 도메인이 정해지면 `EXPO_PUBLIC_SITE_URL`을 설정해야 공유 카드(`og:image`)가 절대 URL로 출력된다. 미설정 시 상대 경로로 떨어져 카카오톡·페이스북 썸네일이 표시되지 않는다.

```sh
EXPO_PUBLIC_SITE_URL=https://example.com npx expo export --platform web
```

## Google Play 출시

### 제출 전 반드시 채워야 하는 값

| 위치                     | 항목                                                                             | 용도                                                                               |
| ------------------------ | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/constants/legal.ts` | `OPERATOR_NAME`, `PRIVACY_OFFICER_NAME`, `SUPPORT_EMAIL`, `LEGAL_EFFECTIVE_DATE` | 개인정보처리방침·이용약관 본문 표기. 미기입 시 `IS_LEGAL_PROFILE_COMPLETE`가 false |
| `.env`                   | `EXPO_PUBLIC_SITE_URL`                                                           | 개인정보처리방침 공개 URL(`/privacy`) 절대 경로 생성. Play 등록정보에 그대로 입력  |
| `.env`                   | `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`               | 미설정 시 mock 데이터로 동작                                                       |
| `.env`                   | `EXPO_PUBLIC_SENTRY_DSN`                                                         | 미설정 시 오류 수집 비활성                                                         |
| `app.json`               | `plugins`의 `@sentry/react-native` 항목에 `organization`·`project`               | 소스맵 업로드(선택). 미설정이어도 오류 수집은 동작                                 |

법률 문서는 앱 라우트 `/privacy`·`/terms`로 제공되며, `expo export --platform web` 시 같은 경로의 정적 HTML이 생성되어 그대로 공개 URL이 된다.

### 데이터 안전(Data safety) 양식 기준

| 데이터 유형                        | 수집                      | 공유                       | 필수 여부         | 목적                     |
| ---------------------------------- | ------------------------- | -------------------------- | ----------------- | ------------------------ |
| 이메일 주소                        | 계정 연결 시              | 없음                       | 선택(로그인 시)   | 계정 관리·인증           |
| 사용자 ID                          | 계정 연결 시              | 없음                       | 선택(로그인 시)   | 계정 관리·기기 간 동기화 |
| 앱 활동(학습 기록)                 | 계정 연결 시              | 없음                       | 선택(로그인 시)   | 앱 기능·기기 간 동기화   |
| 사용자 작성 콘텐츠(시험 요청·신고) | 사용자 전송 시            | 없음                       | 선택              | 앱 기능                  |
| 기기 ID(푸시 토큰)                 | 알림 권한 허용 시         | 없음                       | 선택              | 알림 발송                |
| 진단 정보(오류 로그)               | Sentry 설정 빌드에서 수집 | 수탁자 예외 적용 여부 검토 | 해당 빌드 이용 시 | 앱 안정성 진단           |

- 전송 중 암호화: 예 (HTTPS/TLS)
- 데이터 삭제 요청 가능: 예 (앱 내 설정 → 계정 → 계정 삭제, 앱 외 경로는 문의 이메일)
- 광고 식별자·위치·연락처·사진·결제 정보: 수집하지 않음

위 표는 입력 초안입니다. 수탁자 처리는 [Google 데이터 안전 정의](https://support.google.com/googleplay/android-developer/answer/10787469?hl=ko)의 공유 예외 조건과 실제 계약·SDK 설정을 대조해야 합니다. 공개 요청은 다른 사용자에게 보이며, 진단 수집을 포함한 모든 활성 SDK를 신고 범위에 포함합니다.

### Android 권한

라이브러리가 자동 추가하는 권한 중 실제로 쓰지 않는 항목은 `app.json`의 `android.blockedPermissions`로 제거한다.

| 권한                                              | 상태 | 사유                                                                 |
| ------------------------------------------------- | ---- | -------------------------------------------------------------------- |
| `INTERNET`, `ACCESS_NETWORK_STATE`                | 사용 | API 통신·오프라인 배너                                               |
| `POST_NOTIFICATIONS`, `RECEIVE_BOOT_COMPLETED`    | 사용 | 학습 리마인더·재부팅 후 예약 복원                                    |
| `READ_EXTERNAL_STORAGE`, `WRITE_EXTERNAL_STORAGE` | 차단 | 앱 캐시·시스템 문서 선택·공유로 백업 처리, 광범위 저장소 권한 불필요 |
| `ACCESS_WIFI_STATE`                               | 차단 | 연결 여부만 확인하고 네트워크 상세 정보는 사용하지 않음              |

### 빌드·제출

```sh
npx eas-cli@latest login
npx eas-cli@latest init            # app.json에 projectId·owner 기록
npx eas-cli@latest build --platform android --profile production
npx eas-cli@latest submit --platform android --profile production
```

`submit` 프로필은 internal 트랙·draft 상태로 올린다. [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts)에서 서비스 계정 키를 발급하고 [Play Console](https://play.google.com/console/) → 사용자 및 권한에서 필요한 앱 권한을 부여하면 제출이 비대화형으로 끝난다.

### Play Console에서 별도로 처리해야 하는 항목

- 스토어 등록정보 자산: 512×512 아이콘, 1024×500 피처 그래픽, 폰 스크린샷 2~8장
- 콘텐츠 등급 설문, 타깃 사용자층·광고 포함 여부 신고
- 데이터 안전 양식 (위 표 기준으로 입력)
- 개인정보처리방침 URL 입력 (`EXPO_PUBLIC_SITE_URL` + `/privacy`)
- 2023년 11월 13일 이후 생성한 개인 계정은 비공개 테스트에서 12명 이상이 연속 14일 참여해야 하며, 실제 적용 여부는 [Play Console](https://play.google.com/console/)의 앱 대시보드에서 확인

## Supabase 셋업 (최초 1회)

1. [Supabase 대시보드](https://supabase.com/dashboard)에서 프로젝트 생성
2. SQL Editor에서 `db/migrations/0001_init.sql` → `0002` → `0003` → `0004` → `0005` → `0006` → `0007` → `0008` → `0009` → `0010` 순서 실행
3. Authentication → Providers에서 이메일 활성화. 비회원 학습은 기기 저장이며 Anonymous 계정 생성은 사용하지 않습니다.
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

| 명령                      | 용도                                                                            |
| ------------------------- | ------------------------------------------------------------------------------- |
| `npm run verify-setup`    | 마이그레이션 적용 직후 구조·트리거·RPC·RLS 자동 검증 (테스트 데이터 자가 정리)  |
| `npm run export-content`  | 앱 번들 데이터 → 시드 JSON 추출                                                 |
| `npm run import-content`  | 콘텐츠 JSON 검증·업서트 (`--dry-run`, `--status`)                               |
| `npm run check-bundles`   | 시드·번들 전체 교차 검증 (파일 간 id·문항 중복, 시험별 문항 수, 정답 위치 편중) |
| `npm run balance-answers` | 시험 단위 정답 위치 균등 재배치 (업로드 전에만 실행)                            |
| `npm run verify-content`  | AI 정답 교차 검증 (통과 실패 시 exit 1)                                         |
| `npm run admin-requests`  | 시험 요청 목록·상태 변경 (`list`, `set-status`)                                 |
| `npm run admin-questions` | 문제 검수·공개 (`list`, `show`, `review`, `publish`)                            |

전부 service role 키 필요(`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`). verify-content만 `ANTHROPIC_API_KEY` 사용.

## 어드민 웹

`apps/admin/index.html`을 브라우저로 열고 Supabase URL·공개 API 키와 관리자 계정으로 로그인합니다.
service role 키는 입력하지 않습니다. 로그인 세션은 메모리에만 유지하고 창을 닫으면 다시 로그인합니다.

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

### 출시 전 추가 설정

- production 빌드는 `.env.example`의 공개 서버·운영자·문의·시행일·사이트 값과 EAS 연결 식별자가 없으면 차단됩니다. 비밀키를 EXPO_PUBLIC 변수에 넣지 마세요.
- 웹의 `/privacy`, `/terms`, `/account-delete`를 같은 공개 HTTPS 주소로 제공해야 합니다. 로컬 경로 생성만으로 웹 공개가 이루어지지는 않습니다.
- 문제 import는 imported·needs_review만 허용합니다. content_sources의 출처·라이선스·권리 증빙 확인과 현재 버전의 승인 검수를 마친 뒤 공개하세요. 포함된 콘텐츠의 사실 정확성과 권리 증빙은 별도 확인 대상입니다.
- 관리자 웹은 공개 API 키와 관리자 계정으로 로그인하며, 서비스 키와 로그인 세션을 영구 저장하지 않습니다.
- [GitHub 설정](https://github.com/jun1485/ddopool/settings/environments)에서 production 환경의 운영 secrets를 등록하고 OPERATIONS_ENABLED 변수를 true로 설정하면 15분 간격 운영 작업이 동작합니다. 활성화 전 DB 마이그레이션과 발송 자격증명을 준비하세요.
- 백업 복원은 로그아웃 상태에서 비회원 기기 기록을 교체합니다. 계정별 보관 기록과 직접 보관한 백업 파일의 삭제는 별도로 관리하세요.
- 비회원 기록은 로그인 계정에 자동 병합하지 않습니다. 계정을 바꾸면 각 계정의 보관 기록을 복원하며, 로그아웃하면 비회원 기록으로 돌아갑니다.
- 시험 목록을 먼저 표시하고 등록·열람한 시험만 다운로드합니다. 시험별 15분 캐시와 동시 요청 3개 제한을 사용하며, 실패한 시험은 이전 다운로드가 있으면 유지합니다.
- 권리 증빙에는 공개 가능한 라이선스 주소·확인 결과만 기재하세요. 개인정보나 비공개 계약서 원문은 입력하지 마세요.

### 로컬 검증

- `npm run typecheck`, `npm run lint`, `npm run test:unit`: 타입·정적 검사·학습 회귀 검사
- `npm run test:db`: 임시 PostgreSQL 환경의 전체 마이그레이션·권한·공개 제한 검사. 운영 Supabase에 접속하지 않습니다.
- `npm run test:release-config`: 출시 환경 누락·주소·시행일 검사
- `npx playwright install chromium` 실행 뒤 `npx playwright test e2e/exam-request.spec.ts e2e/readiness.spec.ts`: 비회원 웹 동작 검사
- `e2e/release-flows.spec.ts`는 별도 테스트 서버와 계정이 필요합니다. 웹 검사와 JavaScript 번들 생성만으로 Android 실기기·서명 AAB 검증을 대체하지 않습니다.
- `xcode` 하위 `uuid`는 보안 패치가 있는 11.1.1로 고정합니다. CommonJS의 v4 호출 호환성과 네이티브 설정 생성 경로를 함께 점검하세요.
