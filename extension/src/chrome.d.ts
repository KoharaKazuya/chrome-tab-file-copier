interface ChromeStorageArea {
  get(defaults: Record<string, unknown>): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

interface ChromeTab {
  id?: number;
  url?: string;
}

interface ChromeTabs {
  query(queryInfo: {
    highlighted: boolean;
    currentWindow: boolean;
  }): Promise<ChromeTab[]>;
  remove(tabIds: number | number[]): Promise<void>;
}

interface ChromeRuntime {
  sendNativeMessage(hostName: string, message: unknown): Promise<unknown>;
  openOptionsPage(): Promise<void>;
}

declare const chrome: {
  storage: {
    local: ChromeStorageArea;
  };
  tabs: ChromeTabs;
  runtime: ChromeRuntime;
};
