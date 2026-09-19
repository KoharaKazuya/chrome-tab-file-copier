import { once } from "node:events";
import type { Readable, Writable } from "node:stream";

const HEADER_LENGTH = 4;
const MAX_MESSAGE_BYTES = 1024 * 1024;

export class NativeMessagingError extends Error {}

/** Native Messaging の 4 バイト長ヘッダー付き JSON フレームを読み取る。 */
export async function readNativeMessage(input: Readable): Promise<unknown> {
  const chunks: Buffer[] = [];

  for await (const chunk of input) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const frame = Buffer.concat(chunks);
  if (frame.length < HEADER_LENGTH) {
    throw new NativeMessagingError("メッセージヘッダーが不足しています。");
  }

  const messageLength = frame.readUInt32LE(0);
  if (messageLength > MAX_MESSAGE_BYTES) {
    throw new NativeMessagingError("メッセージが許容サイズを超えています。");
  }

  if (frame.length !== HEADER_LENGTH + messageLength) {
    throw new NativeMessagingError("メッセージ長がヘッダーと一致しません。");
  }

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
