import { describe, expect, it, vi } from "vitest";

import { closeTabsBestEffort } from "./tabCloser.js";

describe("成功後のタブクローズ", () => {
  it("既に閉じられたタブの失敗を許容し、残りを閉じる", async () => {
    const remove = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("No tab with id"))
      .mockResolvedValueOnce(undefined);

    await expect(closeTabsBestEffort([1, 2, 3], { remove })).resolves.toBe(2);
    expect(remove).toHaveBeenCalledTimes(3);
  });
});
