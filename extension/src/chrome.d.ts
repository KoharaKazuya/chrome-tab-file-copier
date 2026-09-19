interface ChromeStorageArea {
  get(defaults: Record<string, unknown>): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

declare const chrome: {
  storage: {
    local: ChromeStorageArea;
  };
};
