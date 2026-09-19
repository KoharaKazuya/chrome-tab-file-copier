import { lstat } from "node:fs/promises";
import path from "node:path";

import type {
  CopyFilesRequest,
  PrecheckFailedResponse,
  PrecheckIssue,
} from "./protocol.js";

export type CopyPlanEntry = {
  key: string;
  source: string;
  destination: string;
};

export type CopyPlan = {
  entries: CopyPlanEntry[];
};

function isPathWithin(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return (
    relative === "" ||
    (!relative.startsWith(`..${path.sep}`) && relative !== "..")
  );
}

function isUnsafeKey(key: string): boolean {
  return (
    key === "." ||
    key === ".." ||
    path.isAbsolute(key) ||
    key.includes("/") ||
    key.includes("\\") ||
    key.includes("\0")
  );
}

async function pathIssue(
  targetPath: string,
  expected: "DIRECTORY" | "SOURCE_FILE" | "ABSENT",
  key?: string,
): Promise<PrecheckIssue | undefined> {
  try {
    const metadata = await lstat(targetPath);
    if (expected === "DIRECTORY" && !metadata.isDirectory()) {
      return { type: "NOT_DIRECTORY", key, path: targetPath };
    }
    if (expected === "SOURCE_FILE" && !metadata.isFile()) {
      return { type: "SOURCE_NOT_FILE", key, path: targetPath };
    }
    if (expected === "ABSENT") {
      return { type: "DESTINATION_EXISTS", key, path: targetPath };
    }
    return undefined;
  } catch (error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      if (expected === "ABSENT") {
        return undefined;
      }
      return {
        type:
          expected === "DIRECTORY" ? "DIRECTORY_NOT_FOUND" : "SOURCE_NOT_FOUND",
        key,
        path: targetPath,
      };
    }

    return { type: "PATH_UNREADABLE", key, path: targetPath };
  }
}

/** コピーを開始せずに、全パスを走査して安全なコピー計画を作成する。 */
export async function createCopyPlan(
  request: CopyFilesRequest,
): Promise<CopyPlan | PrecheckFailedResponse> {
  const sourceRoot = path.resolve(request.sourceRoot);
  const destinationRoot = path.resolve(request.destination);
  const issues: PrecheckIssue[] = [];
  const entries: CopyPlanEntry[] = [];

  const sourceRootIssue = await pathIssue(sourceRoot, "DIRECTORY");
  if (sourceRootIssue !== undefined) {
    issues.push({
      ...sourceRootIssue,
      type: `SOURCE_ROOT_${sourceRootIssue.type}`,
    });
  }

  const destinationRootIssue = await pathIssue(destinationRoot, "DIRECTORY");
  if (destinationRootIssue !== undefined) {
    issues.push({
      ...destinationRootIssue,
      type: `DESTINATION_${destinationRootIssue.type}`,
    });
  }

  for (const key of request.keys) {
    if (isUnsafeKey(key)) {
      issues.push({ type: "UNSAFE_KEY", key });
      continue;
    }

    const source = path.resolve(sourceRoot, key);
    const destination = path.resolve(destinationRoot, key);
    if (!isPathWithin(sourceRoot, source)) {
      issues.push({ type: "SOURCE_OUTSIDE_ROOT", key, path: source });
      continue;
    }

    entries.push({ key, source, destination });

    const sourceIssue = await pathIssue(source, "SOURCE_FILE", key);
    if (sourceIssue !== undefined) {
      issues.push(sourceIssue);
    }

    const destinationIssue = await pathIssue(destination, "ABSENT", key);
    if (destinationIssue !== undefined) {
      issues.push(destinationIssue);
    }
  }

  if (issues.length > 0) {
    return { success: false, error: "PRECHECK_FAILED", issues };
  }

  return { entries };
}
