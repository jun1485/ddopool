import { captureHandledError } from "@/lib/monitoring";

let failed = false;
let resume: (() => void) | undefined;
let queue = Promise.resolve();
const listeners = new Set<() => void>();

// 저장 실패 상태 조회
export const hasStorageFailure = () => failed;
// 저장 상태 변경 구독
export function subscribeStorageFailure(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
// 실패한 저장 재시도
export function retryStorageWrite() {
  resume?.();
}
// 저장 순서 유지 및 실패한 동일 값 재시도
export function retryableWrite(write: () => Promise<void>): Promise<void> {
  queue = queue.then(async () => {
    for (;;) {
      try {
        await write();
        failed = false;
        resume = undefined;
        listeners.forEach((listener) => listener());
        return;
      } catch (error) {
        captureHandledError(error, "local-storage-write");
        await new Promise<void>((resolve) => {
          resume = resolve;
          failed = true;
          listeners.forEach((listener) => listener());
        });
      }
    }
  });
  return queue;
}
