import { cp, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const sourceDirectory = path.join(packageDirectory, "src");
const outputDirectory = path.join(packageDirectory, "dist");

for (const directory of ["options"]) {
  await mkdir(path.join(outputDirectory, directory), { recursive: true });
  await cp(
    path.join(sourceDirectory, directory),
    path.join(outputDirectory, directory),
    {
      recursive: true,
      filter: (source) => !source.endsWith(".ts"),
    },
  );
}
