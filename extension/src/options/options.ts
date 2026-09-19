import {
  SettingsValidationError,
  loadSettings,
  saveSettings,
} from "../settings.js";
import { testUrlPattern } from "../urlPattern.js";

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`必要な要素 #${id} がありません。`);
  }
  return element as T;
}

const form = requiredElement<HTMLFormElement>("settings-form");
const urlPattern = requiredElement<HTMLInputElement>("url-pattern");
const sourceRoot = requiredElement<HTMLInputElement>("source-root");
const destination = requiredElement<HTMLInputElement>("destination");
const closeTabs = requiredElement<HTMLInputElement>("close-tabs");
const saveStatus = requiredElement<HTMLParagraphElement>("save-status");
const testUrl = requiredElement<HTMLInputElement>("test-url");
const testButton = requiredElement<HTMLButtonElement>("test-pattern");
const testResult = requiredElement<HTMLParagraphElement>("pattern-test-result");

function showSaveStatus(message: string, state: "success" | "error"): void {
  saveStatus.textContent = message;
  saveStatus.dataset.state = state;
}

function showPatternTestResult(): void {
  const result = testUrlPattern(urlPattern.value, testUrl.value);
  const messages = {
    INVALID_PATTERN: `正規表現が不正です: ${result.kind === "INVALID_PATTERN" ? result.message : ""}`,
    NO_MATCH: "URL は正規表現に一致しません。",
    MISSING_CAPTURE: "第 1 キャプチャがありません。",
    EMPTY_CAPTURE: "第 1 キャプチャが空文字列です。",
    MATCHED: `一致しました。抽出値: ${result.kind === "MATCHED" ? result.key : ""}`,
  } as const;
  const state = result.kind === "MATCHED" ? "success" : "error";

  testResult.textContent = messages[result.kind];
  testResult.dataset.state = state;
}

async function initialize(): Promise<void> {
  try {
    const settings = await loadSettings();
    urlPattern.value = settings.urlPattern;
    sourceRoot.value = settings.sourceRoot;
    destination.value = settings.destination;
    closeTabs.checked = settings.closeTabsAfterSuccess;
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    showSaveStatus(`設定を読み込めませんでした: ${message}`, "error");
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  void (async () => {
    try {
      await saveSettings({
        urlPattern: urlPattern.value,
        sourceRoot: sourceRoot.value,
        destination: destination.value,
        closeTabsAfterSuccess: closeTabs.checked,
      });
      showSaveStatus("設定を保存しました。", "success");
    } catch (error) {
      const message =
        error instanceof SettingsValidationError
          ? error.issues.join(" ")
          : error instanceof Error
            ? error.message
            : "不明なエラー";
      showSaveStatus(`設定を保存できませんでした: ${message}`, "error");
    }
  })();
});

testButton.addEventListener("click", showPatternTestResult);

void initialize();
