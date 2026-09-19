import { PassThrough, Readable } from "node:stream";

import { describe, expect, it } from "vitest";

import { handleNativeMessage } from "./main.js";
import { readNativeMessage, writeNativeMessage } from "./nativeMessaging.js";
import type { NativeResponse } from "./protocol.js";

function nativeFrame(payload: Buffer): Buffer {
  const header = Buffer.alloc(4);
  header.writeUInt32LE(payload.length, 0);
  return Buffer.concat([header, payload]);
}

async function readOutput(output: PassThrough): Promise<unknown> {
  output.end();
  return readNativeMessage(output);
}

describe("Native Messaging フレーミング", () => {
  it("UTF-8 JSON を little-endian 長ヘッダーで往復できる", async () => {
    const output = new PassThrough();
    const message = { name: "日本語", keys: ["ABC.pdf"] };

    await writeNativeMessage(output, message);

    await expect(readOutput(output)).resolves.toEqual(message);
  });

  it("有効な COPY_FILES 要求を読み書きできる", async () => {
    const output = new PassThrough();
    const errors = new PassThrough();
    const request = {
      type: "COPY_FILES",
      sourceRoot: "/source",
      destination: "/destination",
      keys: ["ABC.pdf"],
    };

    await handleNativeMessage(
      Readable.from([nativeFrame(Buffer.from(JSON.stringify(request)))]),
      output,
      errors,
      async (received) => {
        expect(received).toEqual(request);
        return { success: true, copiedFiles: ["ABC.pdf"] };
      },
    );

    await expect(readOutput(output)).resolves.toEqual({
      success: true,
      copiedFiles: ["ABC.pdf"],
    });
  });

  it("入力ストリームの EOF を待たず、1 フレーム受信後に応答する", async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    const errors = new PassThrough();
    const response = readNativeMessage(output);

    input.write(
      nativeFrame(
        Buffer.from(
          JSON.stringify({
            type: "COPY_FILES",
            sourceRoot: "/source",
            destination: "/destination",
            keys: ["ABC.pdf"],
          }),
        ),
      ),
    );

    const handling = handleNativeMessage(input, output, errors, async () => ({
      success: true,
      copiedFiles: ["ABC.pdf"],
    }));

    await expect(response).resolves.toEqual({
      success: true,
      copiedFiles: ["ABC.pdf"],
    });
    await expect(handling).resolves.toBeUndefined();
    input.end();
  });

  it.each([
    ["JSON 不正", Buffer.from("{"), "メッセージが有効な JSON ではありません。"],
    [
      "未知の type",
      Buffer.from(JSON.stringify({ type: "DELETE_FILES" })),
      "未対応の要求 type です。",
    ],
    [
      "型不正",
      Buffer.from(JSON.stringify({ type: "COPY_FILES", sourceRoot: 1 })),
      "sourceRoot は文字列で指定してください。",
    ],
    [
      "空の keys",
      Buffer.from(
        JSON.stringify({
          type: "COPY_FILES",
          sourceRoot: "/source",
          destination: "/destination",
          keys: [],
        }),
      ),
      "keys には少なくとも 1 件の値を指定してください。",
    ],
    [
      "重複した keys",
      Buffer.from(
        JSON.stringify({
          type: "COPY_FILES",
          sourceRoot: "/source",
          destination: "/destination",
          keys: ["ABC.pdf", "ABC.pdf"],
        }),
      ),
      "keys に重複した値を含めることはできません。",
    ],
  ])("%s を安全なエラー応答にする", async (_name, payload, message) => {
    const output = new PassThrough();
    const errors = new PassThrough();

    await handleNativeMessage(
      Readable.from([nativeFrame(payload)]),
      output,
      errors,
      async (): Promise<NativeResponse> => ({ success: true, copiedFiles: [] }),
    );

    await expect(readOutput(output)).resolves.toEqual({
      success: false,
      error: "INVALID_REQUEST",
      message,
    });
  });
});
