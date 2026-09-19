export type Settings = {
  urlPattern: string;
  sourceRoot: string;
  destination: string;
  closeTabsAfterSuccess: boolean;
};

export type SettingsStorage = Pick<ChromeStorageArea, "get" | "set">;

export const DEFAULT_SETTINGS: Settings = {
  urlPattern: "",
  sourceRoot: "",
  destination: "",
  closeTabsAfterSuccess: true,
};

export class SettingsValidationError extends Error {
  constructor(readonly issues: string[]) {
    super(issues.join("\n"));
    this.name = "SettingsValidationError";
  }
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

/** 保存済みの値を読み込む。破損した値は項目ごとの既定値へ戻す。 */
export async function loadSettings(
  storage: SettingsStorage = chrome.storage.local,
): Promise<Settings> {
  const stored = await storage.get(DEFAULT_SETTINGS);

  return {
    urlPattern: readString(stored.urlPattern, DEFAULT_SETTINGS.urlPattern),
    sourceRoot: readString(stored.sourceRoot, DEFAULT_SETTINGS.sourceRoot),
    destination: readString(stored.destination, DEFAULT_SETTINGS.destination),
    closeTabsAfterSuccess:
      typeof stored.closeTabsAfterSuccess === "boolean"
        ? stored.closeTabsAfterSuccess
        : DEFAULT_SETTINGS.closeTabsAfterSuccess,
  };
}

/** フォーム入力を正規化し、コピーに必要な文字列を検証する。 */
export function validateSettings(values: Settings): Settings {
  const normalized: Settings = {
    urlPattern: values.urlPattern.trim(),
    sourceRoot: values.sourceRoot.trim(),
    destination: values.destination.trim(),
    closeTabsAfterSuccess: values.closeTabsAfterSuccess,
  };
  const issues: string[] = [];

  if (!normalized.urlPattern) {
    issues.push("URL 正規表現を入力してください。");
  }
  if (!normalized.sourceRoot) {
    issues.push("コピー元ディレクトリを入力してください。");
  }
  if (!normalized.destination) {
    issues.push("コピー先ディレクトリを入力してください。");
  }
  if (typeof normalized.closeTabsAfterSuccess !== "boolean") {
    issues.push("タブを閉じる設定が不正です。");
  }

  if (issues.length > 0) {
    throw new SettingsValidationError(issues);
  }

  return normalized;
}

/** 検証済み設定を Chrome のローカルストレージへ保存する。 */
export async function saveSettings(
  values: Settings,
  storage: SettingsStorage = chrome.storage.local,
): Promise<Settings> {
  const settings = validateSettings(values);
  await storage.set(settings);
  return settings;
}
