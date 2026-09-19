import { describe, expect, it } from "vitest";

import {
  DEFAULT_SETTINGS,
  SettingsValidationError,
  loadSettings,
  saveSettings,
  validateSettings,
} from "./settings.js";

function createStorage(initial: Record<string, unknown> = {}) {
  const values = { ...initial };

  return {
    get: async (defaults: Record<string, unknown>) => ({
      ...defaults,
      ...values,
    }),
    set: async (items: Record<string, unknown>) => {
      Object.assign(values, items);
    },
    values,
  };
}

describe("設定ストレージ", () => {
  it("保存した設定を local storage から読み戻す", async () => {
    const storage = createStorage();
    const settings = {
      urlPattern: "^https://example\\.com/files/(.+)$",
      sourceRoot: "/source",
      destination: "/destination",
      closeTabsAfterSuccess: false,
    };

    await expect(saveSettings(settings, storage)).resolves.toEqual(settings);
    await expect(loadSettings(storage)).resolves.toEqual(settings);
  });

  it("未保存または破損した項目には既定値を使う", async () => {
    const storage = createStorage({
      sourceRoot: 42,
      closeTabsAfterSuccess: "yes",
    });

    await expect(loadSettings(storage)).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it("必須文字列が空白だけの場合は保存しない", () => {
    expect(() => validateSettings(DEFAULT_SETTINGS)).toThrow(
      SettingsValidationError,
    );
    expect(
      validateSettings({
        urlPattern: "  pattern  ",
        sourceRoot: "  /source  ",
        destination: "  /destination  ",
        closeTabsAfterSuccess: true,
      }),
    ).toEqual({
      urlPattern: "pattern",
      sourceRoot: "/source",
      destination: "/destination",
      closeTabsAfterSuccess: true,
    });
  });
});
