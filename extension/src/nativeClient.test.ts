import { describe, expect, it } from "vitest";

import { parseNativeCopyResponse } from "./nativeClient.js";

describe("Native Host 応答", () => {
  it("既知の成功・失敗応答だけを受け入れる", () => {
    expect(
      parseNativeCopyResponse({ success: true, copiedFiles: ["A.pdf"] }),
    ).toEqual({ success: true, copiedFiles: ["A.pdf"] });
    expect(
      parseNativeCopyResponse({
        success: false,
        error: "COPY_FAILED",
        failedFile: "B.pdf",
        copiedFiles: ["A.pdf"],
      }),
    ).toMatchObject({ error: "COPY_FAILED" });
  });

  it("不正な応答を拒否する", () => {
    expect(() => parseNativeCopyResponse({ success: true })).toThrow(
      "不正な応答",
    );
  });
});
