import type {
  CopyFilesRequest,
  InvalidRequestResponse,
  NativeRequest,
} from "./protocol.js";

function invalidRequest(message: string): InvalidRequestResponse {
  return { success: false, error: "INVALID_REQUEST", message };
}

/** 未検証の JSON 値を Native Host が受け付ける要求へ変換する。 */
export function parseNativeRequest(
  value: unknown,
): NativeRequest | InvalidRequestResponse {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalidRequest("要求は JSON オブジェクトで指定してください。");
  }

  const request = value as Record<string, unknown>;
  if (request.type !== "COPY_FILES") {
    return invalidRequest("未対応の要求 type です。");
  }

  if (typeof request.sourceRoot !== "string") {
    return invalidRequest("sourceRoot は文字列で指定してください。");
  }

  if (typeof request.destination !== "string") {
    return invalidRequest("destination は文字列で指定してください。");
  }

  if (
    !Array.isArray(request.keys) ||
    !request.keys.every((key) => typeof key === "string")
  ) {
    return invalidRequest("keys は文字列の配列で指定してください。");
  }

  return request as CopyFilesRequest;
}
