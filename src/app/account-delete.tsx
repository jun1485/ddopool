import { LegalDocumentScreen } from "@/components/legal-document-screen";
import { ThemedText } from "@/components/themed-text";
import { Link } from "expo-router";
import { LEGAL_EFFECTIVE_DATE, SUPPORT_EMAIL } from "@/constants/legal";

// 앱 없이 계정 삭제 요청 방법 안내
export default function AccountDeleteScreen() {
  return (
    <LegalDocumentScreen
      document={{
        title: "또풀 계정 삭제",
        description: "앱 설치 없이 계정과 개인정보 삭제를 요청하는 방법",
        writtenAt: "2026-09-05",
        effectiveDate: LEGAL_EFFECTIVE_DATE,
        markdown: `## 앱에서 삭제

설정 → 계정 → 계정 삭제에서 두 번 확인하면 계정과 학습 기록을 삭제합니다.

## 앱 없이 요청

${SUPPORT_EMAIL ? `${SUPPORT_EMAIL}로 가입한 이메일 주소를 알려 주세요. 아래 삭제 요청 이메일 링크를 이용할 수 있습니다. 비밀번호는 보내지 마세요. 본인 확인 후 처리 결과를 회신합니다.` : "공개 문의 이메일 설정 전입니다. 정식 출시 전에 요청 주소를 게시합니다."}

## 삭제·보존 범위

- 계정, 이메일, 서버 학습 기록, 복습 일정, 저장 문제, 시험 등록, 요청 투표, 푸시 토큰 삭제
- 공동 시험 요청은 작성자와 자유 서술을 지우고 시험명·수요 집계 유지
- 신고는 처리 완료 후 1년, 운영 감사 기록은 생성 후 1년 보존 후 삭제
- 다른 기기의 오프라인 기록과 직접 내려받은 백업 파일은 해당 기기에서도 삭제 필요

자세한 내용은 아래 개인정보처리방침에서 확인할 수 있습니다.`,
      }}
    >
      {SUPPORT_EMAIL && (
        <Link
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("또풀 계정 삭제 요청")}`}
          asChild
        >
          <ThemedText type="smallBold" themeColor="primary">
            삭제 요청 이메일 보내기
          </ThemedText>
        </Link>
      )}
      <Link href="/privacy" asChild>
        <ThemedText type="smallBold" themeColor="primary">
          개인정보처리방침
        </ThemedText>
      </Link>
    </LegalDocumentScreen>
  );
}
