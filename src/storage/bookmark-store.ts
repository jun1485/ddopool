import AsyncStorage from "@react-native-async-storage/async-storage";

const BOOKMARKS_KEY = "exam-loop:bookmarks";
let bookmarkWriteQueue: Promise<void> = Promise.resolve();
const bookmarkListeners = new Set<(questionIds: string[]) => void>();

// 저장 문제 변경 상태 전파
function notifyBookmarks(questionIds: string[]) {
  bookmarkListeners.forEach((listener) => listener(questionIds));
}

// 저장 문제 변경 구독
export function subscribeBookmarks(
  listener: (questionIds: string[]) => void,
): () => void {
  bookmarkListeners.add(listener);
  return () => {
    bookmarkListeners.delete(listener);
  };
}

// 저장 문제 식별자 목록 로드
export async function loadBookmarks(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(BOOKMARKS_KEY);
    return raw != null ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

// 저장 문제 식별자 목록 순차 반영
export function saveBookmarks(questionIds: string[]): Promise<void> {
  notifyBookmarks(questionIds);
  bookmarkWriteQueue = bookmarkWriteQueue
    .catch(() => undefined)
    .then(() =>
      AsyncStorage.setItem(BOOKMARKS_KEY, JSON.stringify(questionIds)),
    );
  return bookmarkWriteQueue;
}

// 저장 문제 전체 삭제
export function clearBookmarks(): Promise<void> {
  notifyBookmarks([]);
  bookmarkWriteQueue = bookmarkWriteQueue
    .catch(() => undefined)
    .then(() => AsyncStorage.removeItem(BOOKMARKS_KEY));
  return bookmarkWriteQueue;
}
