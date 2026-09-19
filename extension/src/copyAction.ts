import type { Settings } from "./settings.js";
import { requestNativeCopy, type NativeCopyResponse } from "./nativeClient.js";
import { createCopyTargets, type TabSnapshot } from "./tabTargets.js";

export type CopyActionResult =
  | { success: true; copiedFiles: string[]; tabIds: number[] }
  | Exclude<NativeCopyResponse, { success: true }>
  | {
      success: false;
      error: "URL_VALIDATION_FAILED";
      issues: Array<{ tabId?: number; reason: string }>;
    }
  | { success: false; error: "NATIVE_COMMUNICATION_FAILED"; message: string }
  | { success: false; error: "NO_HIGHLIGHTED_TABS" };

export type CopyActionDependencies = {
  queryHighlightedTabs(): Promise<TabSnapshot[]>;
  requestCopy(request: {
    sourceRoot: string;
    destination: string;
    keys: string[];
  }): Promise<NativeCopyResponse>;
};

const chromeDependencies: CopyActionDependencies = {
  queryHighlightedTabs: () =>
    chrome.tabs.query({ highlighted: true, currentWindow: true }),
  requestCopy: requestNativeCopy,
};

/** タブの固定スナップショットを検証し、全件有効な場合だけ Native Host を呼び出す。 */
export async function executeCopyAction(
  settings: Settings,
  dependencies: CopyActionDependencies = chromeDependencies,
): Promise<CopyActionResult> {
  const tabs = await dependencies.queryHighlightedTabs();
  if (tabs.length === 0) {
    return { success: false, error: "NO_HIGHLIGHTED_TABS" };
  }
  const targets = createCopyTargets(tabs, settings.urlPattern);
  if ("success" in targets) {
    return targets;
  }

  try {
    const response = await dependencies.requestCopy({
      sourceRoot: settings.sourceRoot,
      destination: settings.destination,
      keys: targets.keys,
    });
    return response.success
      ? {
          success: true,
          copiedFiles: response.copiedFiles,
          tabIds: targets.tabIds,
        }
      : response;
  } catch (error) {
    return {
      success: false,
      error: "NATIVE_COMMUNICATION_FAILED",
      message:
        error instanceof Error ? error.message : "不明な通信エラーです。",
    };
  }
}
