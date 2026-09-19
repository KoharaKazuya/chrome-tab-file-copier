import { constants, copyFile } from "node:fs/promises";

import type { CopyFailedResponse, CopySucceededResponse } from "./protocol.js";
import type { CopyPlan } from "./validate.js";

/** 事前検証済みの計画を順に実行し、失敗後のコピーは開始しない。 */
export async function executeCopyPlan(
  plan: CopyPlan,
): Promise<CopySucceededResponse | CopyFailedResponse> {
  const copiedFiles: string[] = [];

  for (const entry of plan.entries) {
    try {
      await copyFile(entry.source, entry.destination, constants.COPYFILE_EXCL);
      copiedFiles.push(entry.key);
    } catch {
      return {
        success: false,
        error: "COPY_FAILED",
        failedFile: entry.key,
        copiedFiles,
      };
    }
  }

  return { success: true, copiedFiles };
}
