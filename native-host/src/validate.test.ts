import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

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

describe("コピー計画の事前検証", () => {
  it("通常ファイルだけをコピー計画に含める", async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const sourceRoot = path.join(temporaryDirectory, "source");
    const destination = path.join(temporaryDirectory, "destination");
    await mkdir(sourceRoot);
    await mkdir(destination);
    await writeFile(path.join(sourceRoot, "ABC.pdf"), "source");

    await expect(
      createCopyPlan(request(sourceRoot, destination, ["ABC.pdf"])),
    ).resolves.toEqual({
      entries: [
        {
          key: "ABC.pdf",
          source: path.join(sourceRoot, "ABC.pdf"),
          destination: path.join(destination, "ABC.pdf"),
        },
      ],
    });
  });

  it("コピー開始前に source 不在と destination 衝突を集約する", async () => {
    const temporaryDirectory = await createTemporaryDirectory();
    const sourceRoot = path.join(temporaryDirectory, "source");
    const destination = path.join(temporaryDirectory, "destination");
    await mkdir(sourceRoot);
    await mkdir(destination);
    await writeFile(path.join(sourceRoot, "exists.pdf"), "source");
    await writeFile(path.join(destination, "exists.pdf"), "destination");

    await expect(
      createCopyPlan(
        request(sourceRoot, destination, ["missing.pdf", "exists.pdf"]),
      ),
    ).resolves.toMatchObject({
      success: false,
      error: "PRECHECK_FAILED",
      issues: [
        { type: "SOURCE_NOT_FOUND", key: "missing.pdf" },
        { type: "DESTINATION_EXISTS", key: "exists.pdf" },
      ],
    });
  });

  it.each([
    "../outside.pdf",
    "/outside.pdf",
    "nested/file.pdf",
    "nested\\file.pdf",
  ])("危険な key %s を拒否する", async (key) => {
    const temporaryDirectory = await createTemporaryDirectory();
    const sourceRoot = path.join(temporaryDirectory, "source");
    const destination = path.join(temporaryDirectory, "destination");
    await mkdir(sourceRoot);
    await mkdir(destination);

    await expect(
      createCopyPlan(request(sourceRoot, destination, [key])),
    ).resolves.toMatchObject({
      success: false,
      error: "PRECHECK_FAILED",
      issues: [{ type: "UNSAFE_KEY", key }],
    });
  });
});
