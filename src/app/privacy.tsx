import { LegalDocumentScreen } from "@/components/legal-document-screen";
import { PRIVACY_POLICY_DOCUMENT } from "@/data/legal-documents";

// 개인정보처리방침 화면
export default function PrivacyPolicyScreen() {
  return <LegalDocumentScreen document={PRIVACY_POLICY_DOCUMENT} />;
}
