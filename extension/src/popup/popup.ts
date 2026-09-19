import { executeCopyAction, type CopyActionResult } from "../copyAction.js";
import { loadSettings } from "../settings.js";
import { closeTabsBestEffort } from "../tabCloser.js";

function requiredElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`必要な要素 #${id} がありません。`);
  }
  return element as T;
}

const executeButton = requiredElement<HTMLButtonElement>("execute-copy");
const optionsButton = requiredElement<HTMLButtonElement>("open-options");
const resultElement = requiredElement<HTMLParagraphElement>("result");

function showResult(message: string, state: "success" | "error"): void {
  resultElement.textContent = message;
  resultElement.dataset.state = state;
}

function formatFailure(
  result: Exclude<CopyActionResult, { success: true }>,
): string {
  switch (result.error) {
    case "URL_VALIDATION_FAILED":
      return `URL を確認してください。\n${result.issues.map((issue) => issue.reason).join("\n")}`;
    case "PRECHECK_FAILED":
      return "コピー前の検証に失敗しました。ファイルはコピーされていません。";
    case "COPY_FAILED":
      return `コピー中に ${result.failedFile} で失敗しました。${result.copiedFiles.length} 件はコピー済みです。タブは閉じません。`;
    case "INVALID_REQUEST":
      return `Native Host が要求を受け付けませんでした: ${result.message}`;
    case "NATIVE_COMMUNICATION_FAILED":
      return `Native Host と通信できませんでした: ${result.message}`;
    case "NO_HIGHLIGHTED_TABS":
      return "選択されているタブがありません。";
  }
}

async function execute(): Promise<void> {
  executeButton.disabled = true;
  showResult("コピーを実行しています…", "success");
  try {
    const settings = await loadSettings();
    const result = await executeCopyAction(settings);
    if (!result.success) {
      showResult(formatFailure(result), "error");
      return;
    }

    if (!settings.closeTabsAfterSuccess) {
      showResult(
        `${result.copiedFiles.length} 件のファイルをコピーしました。`,
        "success",
      );
      return;
    }
    const closedCount = await closeTabsBestEffort(result.tabIds);
    showResult(
      `${result.copiedFiles.length} 件のファイルをコピーしました。${closedCount} 件のタブを閉じました。`,
      "success",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "不明なエラー";
    showResult(`実行できませんでした: ${message}`, "error");
  } finally {
    executeButton.disabled = false;
  }
}

executeButton.addEventListener("click", () => void execute());
optionsButton.addEventListener(
  "click",
  () => void chrome.runtime.openOptionsPage(),
);
