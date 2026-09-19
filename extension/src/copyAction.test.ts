import { describe, expect, it, vi } from "vitest";

import { executeCopyAction } from "./copyAction.js";
import type { Settings } from "./settings.js";

const settings: Settings = {
  urlPattern: "^https://example\\.com/files/([^/?#]+)$",
  sourceRoot: "/source",
  destination: "/destination",
  closeTabsAfterSuccess: true,
};

describe("コピー実行", () => {
  it("検証済みのユニーク key だけを Native Host に送る", async () => {
    const requestCopy = vi
      .fn()
      .mockResolvedValue({ success: true, copiedFiles: ["A.pdf"] });
    await expect(
      executeCopyAction(settings, {
        queryHighlightedTabs: vi.fn().mockResolvedValue([
          { id: 1, url: "https://example.com/files/A.pdf" },
          { id: 2, url: "https://example.com/files/A.pdf" },
        ]),
        requestCopy,
      }),
    ).resolves.toEqual({
      success: true,
      copiedFiles: ["A.pdf"],
      tabIds: [1, 2],
    });
    expect(requestCopy).toHaveBeenCalledWith({
      sourceRoot: "/source",
      destination: "/destination",
      keys: ["A.pdf"],
    });
  });

  it("URL 検証失敗時は Native Host を呼び出さない", async () => {
    const requestCopy = vi.fn();
    const result = await executeCopyAction(settings, {
      queryHighlightedTabs: vi
        .fn()
        .mockResolvedValue([{ id: 1, url: "https://invalid.example/" }]),
      requestCopy,
    });
    expect(result).toMatchObject({
      success: false,
      error: "URL_VALIDATION_FAILED",
    });
    expect(requestCopy).not.toHaveBeenCalled();
  });

  it("Native Host 通信例外を結果モデルへ変換する", async () => {
    await expect(
      executeCopyAction(settings, {
        queryHighlightedTabs: vi
          .fn()
          .mockResolvedValue([
            { id: 1, url: "https://example.com/files/A.pdf" },
          ]),
        requestCopy: vi.fn().mockRejectedValue(new Error("host unavailable")),
      }),
    ).resolves.toEqual({
      success: false,
      error: "NATIVE_COMMUNICATION_FAILED",
      message: "host unavailable",
    });
  });
});
