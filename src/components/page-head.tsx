import Head from "expo-router/head";

import { SITE_DESCRIPTION, SITE_NAME, SITE_TITLE } from "@/constants/site";

type PageHeadProps = {
  title?: string;
  description?: string;
  noIndex?: boolean;
};

// 화면별 문서 제목·검색 색인 메타 지정
export function PageHead({ title, description, noIndex }: PageHeadProps) {
  return (
    <Head>
      <title>{title ? `${title} | ${SITE_NAME}` : SITE_TITLE}</title>
      <meta name="description" content={description ?? SITE_DESCRIPTION} />
      {noIndex ? <meta name="robots" content="noindex, nofollow" /> : null}
    </Head>
  );
}
