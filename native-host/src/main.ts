import type { Readable, Writable } from "node:stream";
import { pathToFileURL } from "node:url";

import {
  NativeMessagingError,
  readNativeMessage,
  writeNativeMessage,
} from "./nativeMessaging.js";
import { parseNativeRequest } from "./requestHandler.js";
import type {
  InvalidRequestResponse,
  NativeRequest,
  NativeResponse,
} from "./protocol.js";

export type RequestProcessor = (
  request: NativeRequest,
) => Promise<NativeResponse>;

function isInvalidRequestResponse(
  request: NativeRequest | InvalidRequestResponse,
): request is InvalidRequestResponse {
  return "error" in request && request.error === "INVALID_REQUEST";
}

/** 標準入出力を使って Native Messaging の要求を 1 件処理する。 */
export async function handleNativeMessage(
  input: Readable,
  output: Writable,
  errorOutput: Writable,
  processRequest: RequestProcessor,
): Promise<void> {
  try {
    const request = parseNativeRequest(await readNativeMessage(input));
    if (isInvalidRequestResponse(request)) {
      await writeNativeMessage(output, request);
      return;
    }

    await writeNativeMessage(output, await processRequest(request));
  } catch (error) {
    const message =
      error instanceof NativeMessagingError
        ? error.message
        : "要求を処理できませんでした。";
    errorOutput.write(`Native Messaging error: ${message}\n`);
    await writeNativeMessage(output, {
      success: false,
      error: "INVALID_REQUEST",
      message,
    });
  }
}

const entrypoint = process.argv[1];
if (
  entrypoint !== undefined &&
  import.meta.url === pathToFileURL(entrypoint).href
) {
  void handleNativeMessage(
    process.stdin,
    process.stdout,
    process.stderr,
    async () => ({
      success: false,
      error: "PRECHECK_FAILED",
      issues: [{ type: "COPY_NOT_IMPLEMENTED" }],
    }),
  );
}
