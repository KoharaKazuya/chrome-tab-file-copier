import { testUrlPattern } from "./urlPattern.js";

export type TabSnapshot = { id?: number; url?: string };

export type CopyTargets = {
  keys: string[];
  tabIds: number[];
  tabIdsByKey: Map<string, number[]>;
};

export type TargetValidationFailure = {
  success: false;
  error: "URL_VALIDATION_FAILED";
  issues: Array<{ tabId?: number; reason: string }>;
};

/** URL を検証して key を抽出し、同一 key に紐付くタブをグループ化する。 */
export function createCopyTargets(
  tabs: TabSnapshot[],
  urlPattern: string,
): CopyTargets | TargetValidationFailure {
  const issues: TargetValidationFailure["issues"] = [];
  const tabIdsByKey = new Map<string, number[]>();
  const tabIds: number[] = [];

  for (const tab of tabs) {
    if (typeof tab.id === "number") {
      tabIds.push(tab.id);
    }
    if (!tab.url) {
      issues.push({ tabId: tab.id, reason: "URL を取得できません。" });
      continue;
    }

    const result = testUrlPattern(urlPattern, tab.url);
    if (result.kind !== "MATCHED") {
      const reasons = {
        INVALID_PATTERN: "URL 正規表現が不正です。",
        NO_MATCH: "URL が正規表現に一致しません。",
        MISSING_CAPTURE: "第 1 キャプチャがありません。",
        EMPTY_CAPTURE: "第 1 キャプチャが空文字列です。",
      } as const;
      issues.push({ tabId: tab.id, reason: reasons[result.kind] });
      continue;
    }

    const relatedTabs = tabIdsByKey.get(result.key) ?? [];
    if (typeof tab.id === "number") {
      relatedTabs.push(tab.id);
    }
    tabIdsByKey.set(result.key, relatedTabs);
  }

  if (issues.length > 0) {
    return { success: false, error: "URL_VALIDATION_FAILED", issues };
  }

  return { keys: [...tabIdsByKey.keys()], tabIds, tabIdsByKey };
}
