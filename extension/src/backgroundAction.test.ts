import { describe, expect, it, vi } from "vitest";

import { executeBackgroundCopy } from "./backgroundAction.js";
import type { Settings } from "./settings.js";

const settings: Settings = {
  urlPattern: "^https://example\\.com/files/([^/?#]+)$",
  sourceRoot: "/source",
  destination: "/destination",
  closeTabsAfterSuccess: true,
};

describe("バックグラウンドコピー", () => {
  it("成功後に固定済みタブを閉じ、Popup に依存しない結果を返す", async () => {
    const closeTabs = vi.fn().mockResolvedValue(2);

    await expect(
      executeBackgroundCopy({
        loadSettings: vi.fn().mockResolvedValue(settings),
        executeCopyAction: vi.fn().mockResolvedValue({
          success: true,
          copiedFiles: ["A.pdf"],
          tabIds: [1, 2],
        }),
        closeTabs,
      }),
    ).resolves.toEqual({
      success: true,
      copiedFiles: ["A.pdf"],
      closedTabCount: 2,
    });
    expect(closeTabs).toHaveBeenCalledWith([1, 2]);
  });

  it("タブクローズが無効なら成功後も削除しない", async () => {
    const closeTabs = vi.fn();

    await expect(
      executeBackgroundCopy({
        loadSettings: vi.fn().mockResolvedValue({
          ...settings,
          closeTabsAfterSuccess: false,
        }),
        executeCopyAction: vi.fn().mockResolvedValue({
          success: true,
          copiedFiles: ["A.pdf"],
          tabIds: [1],
        }),
        closeTabs,
      }),
    ).resolves.toMatchObject({ success: true, closedTabCount: 0 });
    expect(closeTabs).not.toHaveBeenCalled();
  });

  it("コピー失敗時はタブを閉じない", async () => {
    const closeTabs = vi.fn();

    await expect(
      executeBackgroundCopy({
        loadSettings: vi.fn().mockResolvedValue(settings),
        executeCopyAction: vi.fn().mockResolvedValue({
          success: false,
          error: "NO_HIGHLIGHTED_TABS",
        }),
        closeTabs,
      }),
    ).resolves.toMatchObject({ success: false, error: "NO_HIGHLIGHTED_TABS" });
    expect(closeTabs).not.toHaveBeenCalled();
  });
});
