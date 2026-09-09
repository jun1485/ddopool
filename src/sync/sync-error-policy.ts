// 일시적 통신·인증 오류 재시도 판정
export function isPermanentSyncError(code: string, status: number): boolean {
  if (
    [401, 408, 425, 429].includes(status) ||
    code === "PGRST301" ||
    code === "PGRST303"
  )
    return false;
  return (
    /^(22|23)/.test(code) || code === "42501" || (status >= 400 && status < 500)
  );
}
