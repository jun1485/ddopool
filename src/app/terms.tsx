import { LegalDocumentScreen } from "@/components/legal-document-screen";
import { TERMS_OF_SERVICE_DOCUMENT } from "@/data/legal-documents";

// 이용약관 화면
export default function TermsOfServiceScreen() {
  return <LegalDocumentScreen document={TERMS_OF_SERVICE_DOCUMENT} />;
}
