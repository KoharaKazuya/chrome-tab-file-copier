import { executeCopyAction, type CopyActionResult } from "./copyAction.js";
import { loadSettings, type Settings } from "./settings.js";
import { closeTabsBestEffort } from "./tabCloser.js";

export type BackgroundCopyResult =
  | {
      success: true;
      copiedFiles: string[];
      closedTabCount: number;
    }
  | Exclude<CopyActionResult, { success: true }>;

export type BackgroundCopyDependencies = {
  loadSettings(): Promise<Settings>;
  executeCopyAction(settings: Settings): Promise<CopyActionResult>;
  closeTabs(tabIds: number[]): Promise<number>;
};

const chromeDependencies: BackgroundCopyDependencies = {
  loadSettings,
  executeCopyAction,
  closeTabs: (tabIds) => closeTabsBestEffort(tabIds),
};

/** Popup の表示状態に依存せず、コピー成功後のタブクローズまで完了させる。 */
export async function executeBackgroundCopy(
  dependencies: BackgroundCopyDependencies = chromeDependencies,
): Promise<BackgroundCopyResult> {
  const settings = await dependencies.loadSettings();
  const result = await dependencies.executeCopyAction(settings);
  if (!result.success) {
    return result;
  }

  const closedTabCount = settings.closeTabsAfterSuccess
    ? await dependencies.closeTabs(result.tabIds)
    : 0;
  return {
    success: true,
    copiedFiles: result.copiedFiles,
    closedTabCount,
  };
}
