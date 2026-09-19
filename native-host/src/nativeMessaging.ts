import { once } from "node:events";
import type { Readable, Writable } from "node:stream";

const HEADER_LENGTH = 4;
const MAX_MESSAGE_BYTES = 1024 * 1024;

export class NativeMessagingError extends Error {}

async function readFrameBytes(input: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];
  let byteLength = 0;
  let expectedLength: number | undefined;

  for await (const chunk of input) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    chunks.push(bytes);
    byteLength += bytes.length;

    if (expectedLength === undefined && byteLength >= HEADER_LENGTH) {
      const buffered = Buffer.concat(chunks);
      const messageLength = buffered.readUInt32LE(0);
      if (messageLength > MAX_MESSAGE_BYTES) {
        throw new NativeMessagingError(
          "メッセージが許容サイズを超えています。",
        );
      }
      expectedLength = HEADER_LENGTH + messageLength;
    }

    if (expectedLength !== undefined && byteLength >= expectedLength) {
      const frame = Buffer.concat(chunks);
      if (frame.length !== expectedLength) {
        throw new NativeMessagingError(
          "メッセージ長がヘッダーと一致しません。",
        );
      }
      return frame;
    }
  }

  if (byteLength < HEADER_LENGTH) {
    throw new NativeMessagingError("メッセージヘッダーが不足しています。");
  }
  throw new NativeMessagingError("メッセージ長がヘッダーと一致しません。");
}

/** Native Messaging の 4 バイト長ヘッダー付き JSON フレームを読み取る。 */
export async function readNativeMessage(input: Readable): Promise<unknown> {
  const frame = await readFrameBytes(input);

  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(
      frame.subarray(HEADER_LENGTH),
    );
  } catch {
    throw new NativeMessagingError("メッセージが有効な UTF-8 ではありません。");
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new NativeMessagingError("メッセージが有効な JSON ではありません。");
  }
}

/** 値を Native Messaging の 4 バイト長ヘッダー付き JSON フレームとして書き込む。 */
export async function writeNativeMessage(
  output: Writable,
  message: unknown,
): Promise<void> {
  const payload = Buffer.from(JSON.stringify(message), "utf8");
  if (payload.length > MAX_MESSAGE_BYTES) {
    throw new NativeMessagingError("応答が許容サイズを超えています。");
  }

  const header = Buffer.alloc(HEADER_LENGTH);
  header.writeUInt32LE(payload.length, 0);

  if (!output.write(Buffer.concat([header, payload]))) {
    await once(output, "drain");
  }
}
