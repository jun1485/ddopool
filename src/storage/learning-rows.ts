import type * as NativeRows from "@/storage/learning-rows.native";

export type {
  LearningRows,
  LegacyImport,
} from "@/storage/learning-rows.native";

export const DEVICE_OWNER = "device";

// 웹 행 저장소 미지원 안내
export const withLearningRows: typeof NativeRows.withLearningRows = () =>
  Promise.reject(new Error("웹은 기기 키 저장소를 사용합니다"));

// 웹 기기 공용 행 저장소 미지원 안내
export const withDeviceRows: typeof NativeRows.withDeviceRows = () =>
  Promise.reject(new Error("웹은 기기 키 저장소를 사용합니다"));

// 웹은 계정 보관함 키로만 기록을 관리
export const deleteOwnerRows: typeof NativeRows.deleteOwnerRows = () =>
  Promise.resolve();
