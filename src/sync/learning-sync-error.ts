// 영구 학습 동기화 오류
export class PermanentLearningSyncError extends Error {
  // 영구 오류 정보 저장
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PermanentLearningSyncError";
  }
}
