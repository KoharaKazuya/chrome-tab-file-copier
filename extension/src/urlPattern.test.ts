import { describe, expect, it } from "vitest";

import { testUrlPattern } from "./urlPattern.js";

describe("URL 正規表現テスト", () => {
  it("構築できない正規表現を判定する", () => {
    expect(testUrlPattern("[", "https://example.com")).toMatchObject({
      kind: "INVALID_PATTERN",
    });
  });

  it("不一致、第 1 キャプチャなし、空文字列を区別する", () => {
    expect(
      testUrlPattern("^https://example\\.com$", "https://other.example"),
    ).toEqual({ kind: "NO_MATCH" });
    expect(
      testUrlPattern("^https://example\\.com$", "https://example.com"),
    ).toEqual({ kind: "MISSING_CAPTURE" });
    expect(
      testUrlPattern("^https://example\\.com/(.*)$", "https://example.com/"),
    ).toEqual({ kind: "EMPTY_CAPTURE" });
  });

  it("一致時に第 1 キャプチャを抽出する", () => {
    expect(
      testUrlPattern(
        "^https://example\\.com/files/([^/?#]+)$",
        "https://example.com/files/ABC.pdf",
      ),
    ).toEqual({ kind: "MATCHED", key: "ABC.pdf" });
  });
});
