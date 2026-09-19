import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { executeCopyPlan } from "./copy.js";
import { processCopyRequest } from "./main.js";
import type { CopyFilesRequest } from "./protocol.js";
import { createCopyPlan } from "./validate.js";

const temporaryDirectories: string[] = [];

async function createTemporaryDirectory(): Promise<string> {
  const directory = await mkdtemp(path.join(os.tmpdir(), "tab-file-copier-"));
  temporaryDirectories.push(directory);
  return directory;
}

function request(
  sourceRoot: string,
  destination: string,
  keys: string[],
): CopyFilesRequest {
  return { type: "COPY_FILES", sourceRoot, destination, keys };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true })),
  );
});

describe("コピー計画の実行", () => {
  it("COPYFILE_EXCL で計画順に通常ファイルをコピーする", async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const sourceRoot = path.join(temporaryDirectory, "source");
    const destination = path.join(temporaryDirectory, "destination");
    await mkdir(sourceRoot);
    await mkdir(destination);
    await writeFile(path.join(sourceRoot, "ABC.pdf"), "ABC");
    await writeFile(path.join(sourceRoot, "DEF.pdf"), "DEF");

    await expect(
      processCopyRequest(
        request(sourceRoot, destination, ["ABC.pdf", "DEF.pdf"]),
      ),
    ).resolves.toEqual({
      success: true,
      copiedFiles: ["ABC.pdf", "DEF.pdf"],
    });
    await expect(
      readFile(path.join(destination, "ABC.pdf"), "utf8"),
    ).resolves.toBe("ABC");
    await expect(
      readFile(path.join(destination, "DEF.pdf"), "utf8"),
    ).resolves.toBe("DEF");
  });

  it("コピー開始後の destination 競合では上書きせず後続のコピーを行わない", async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const sourceRoot = path.join(temporaryDirectory, "source");
    const destination = path.join(temporaryDirectory, "destination");
    await mkdir(sourceRoot);
    await mkdir(destination);
    await writeFile(path.join(sourceRoot, "first.pdf"), "first source");
    await writeFile(path.join(sourceRoot, "second.pdf"), "second source");
    await writeFile(path.join(sourceRoot, "third.pdf"), "third source");

    const plan = await createCopyPlan(
      request(sourceRoot, destination, [
        "first.pdf",
        "second.pdf",
        "third.pdf",
      ]),
    );
    if ("error" in plan) {
      throw new Error("コピー計画の作成に失敗しました。");
    }

    await writeFile(
      path.join(destination, "second.pdf"),
      "existing destination",
    );

    await expect(executeCopyPlan(plan)).resolves.toEqual({
      success: false,
      error: "COPY_FAILED",
      failedFile: "second.pdf",
      copiedFiles: ["first.pdf"],
    });
    await expect(
      readFile(path.join(destination, "first.pdf"), "utf8"),
    ).resolves.toBe("first source");
    await expect(
      readFile(path.join(destination, "second.pdf"), "utf8"),
    ).resolves.toBe("existing destination");
    await expect(
      readFile(path.join(destination, "third.pdf")),
    ).rejects.toMatchObject({
      code: "ENOENT",
    });
  });
});
