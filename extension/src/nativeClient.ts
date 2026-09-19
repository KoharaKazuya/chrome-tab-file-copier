import { NATIVE_HOST_NAME } from "./constants.js";

export type NativeCopyResponse =
  | { success: true; copiedFiles: string[] }
  | { success: false; error: "PRECHECK_FAILED"; issues: unknown[] }
  | {
      success: false;
      error: "COPY_FAILED";
      failedFile: string;
      copiedFiles: string[];
    }
  | { success: false; error: "INVALID_REQUEST"; message: string };

export type NativeMessenger = Pick<ChromeRuntime, "sendNativeMessage">;

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === "string")
  );
}

/** Native Host 応答を検証し、プロトコル外の値を利用者向けエラーへ変換する。 */
export function parseNativeCopyResponse(value: unknown): NativeCopyResponse {
  if (typeof value !== "object" || value === null) {
    throw new Error("Native Host から不正な応答を受信しました。");
  }
  const response = value as Record<string, unknown>;
  if (response.success === true && isStringArray(response.copiedFiles)) {
    return { success: true, copiedFiles: response.copiedFiles };
  }
  if (response.success !== false || typeof response.error !== "string") {
    throw new Error("Native Host から不正な応答を受信しました。");
  }
  if (response.error === "PRECHECK_FAILED" && Array.isArray(response.issues)) {
    return {
      success: false,
      error: "PRECHECK_FAILED",
      issues: response.issues,
    };
  }
  if (
    response.error === "COPY_FAILED" &&
    typeof response.failedFile === "string" &&
    isStringArray(response.copiedFiles)
  ) {
    return {
      success: false,
      error: "COPY_FAILED",
      failedFile: response.failedFile,
      copiedFiles: response.copiedFiles,
    };
  }
  if (
    response.error === "INVALID_REQUEST" &&
    typeof response.message === "string"
  ) {
    return {
      success: false,
      error: "INVALID_REQUEST",
      message: response.message,
    };
  }
  throw new Error("Native Host から不正な応答を受信しました。");
}

export async function requestNativeCopy(
  request: { sourceRoot: string; destination: string; keys: string[] },
  messenger: NativeMessenger = chrome.runtime,
): Promise<NativeCopyResponse> {
  const response = await messenger.sendNativeMessage(NATIVE_HOST_NAME, {
    type: "COPY_FILES",
    ...request,
  });
  return parseNativeCopyResponse(response);
}
