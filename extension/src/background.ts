import { executeBackgroundCopy } from "./backgroundAction.js";

type ExecuteCopyMessage = { type: "EXECUTE_COPY" };

function isExecuteCopyMessage(message: unknown): message is ExecuteCopyMessage {
  return (
    typeof message === "object" &&
    message !== null &&
    (message as Record<string, unknown>).type === "EXECUTE_COPY"
  );
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!isExecuteCopyMessage(message)) {
    return false;
  }

  void executeBackgroundCopy()
    .then(sendResponse)
    .catch((error: unknown) => {
      sendResponse({
        success: false,
        error: "BACKGROUND_EXECUTION_FAILED",
        message: error instanceof Error ? error.message : "不明なエラーです。",
      });
    });
  return true;
});
