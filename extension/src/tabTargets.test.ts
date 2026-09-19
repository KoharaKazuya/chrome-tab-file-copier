import { describe, expect, it } from "vitest";

import { createCopyTargets } from "./tabTargets.js";

describe("コピー対象タブの抽出", () => {
  const pattern = "^https://example\\.com/files/([^/?#]+)$";

  it("URL を一度に検証し、同一 key のタブをグループ化する", () => {
    const targets = createCopyTargets(
      [
        { id: 1, url: "https://example.com/files/A.pdf" },
        { id: 2, url: "https://example.com/files/A.pdf" },
        { id: 3, url: "https://example.com/files/B.pdf" },
      ],
      pattern,
    );

    expect(targets).toMatchObject({
      keys: ["A.pdf", "B.pdf"],
      tabIds: [1, 2, 3],
    });
    if ("tabIdsByKey" in targets) {
      expect(targets.tabIdsByKey.get("A.pdf")).toEqual([1, 2]);
    }
  });

  it("URL 不在または不一致があれば全体を失敗にする", () => {
    expect(
      createCopyTargets(
        [{ id: 1 }, { id: 2, url: "https://invalid.example/" }],
        pattern,
      ),
    ).toEqual({
      success: false,
      error: "URL_VALIDATION_FAILED",
      issues: [
        { tabId: 1, reason: "URL を取得できません。" },
        { tabId: 2, reason: "URL が正規表現に一致しません。" },
      ],
    });
  });
});
