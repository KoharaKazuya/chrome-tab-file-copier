import type { BackgroundCopyResult } from "../backgroundAction.js";

type BackgroundExecutionFailure = {
  success: false;
  error: "BACKGROUND_EXECUTION_FAILED";
  message: string;
};
type BackgroundMessageResponse =
  BackgroundCopyResult | BackgroundExecutionFailure;

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
  result: Exclude<BackgroundMessageResponse, { success: true }>,
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
    case "BACKGROUND_EXECUTION_FAILED":
      return `バックグラウンド処理を実行できませんでした: ${result.message}`;
  }
}

function isBackgroundMessageResponse(
  value: unknown,
): value is BackgroundMessageResponse {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const response = value as Record<string, unknown>;
  if (response.success === true) {
    return (
      Array.isArray(response.copiedFiles) &&
      response.copiedFiles.every((file) => typeof file === "string") &&
      typeof response.closedTabCount === "number"
    );
  }
  return response.success === false && typeof response.error === "string";
}

async function execute(): Promise<void> {
  executeButton.disabled = true;
  showResult("コピーを実行しています…", "success");
  try {
    const response = await chrome.runtime.sendMessage({ type: "EXECUTE_COPY" });
    if (!isBackgroundMessageResponse(response)) {
      showResult("バックグラウンド処理から不正な応答を受信しました。", "error");
      return;
    }
    if (!response.success) {
      showResult(formatFailure(response), "error");
      return;
    }
    showResult(
      `${response.copiedFiles.length} 件のファイルをコピーしました。${response.closedTabCount} 件のタブを閉じました。`,
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
