export type TabRemover = { remove(tabId: number): Promise<void> };

/** 既に閉じられたタブのエラーを許容し、残りのタブの削除を継続する。 */
export async function closeTabsBestEffort(
  tabIds: number[],
  tabs: TabRemover = chrome.tabs,
): Promise<number> {
  let closedCount = 0;
  for (const tabId of tabIds) {
    try {
      await tabs.remove(tabId);
      closedCount += 1;
    } catch {
      // ユーザーが既に閉じたタブは無視する。
    }
  }
  return closedCount;
}
