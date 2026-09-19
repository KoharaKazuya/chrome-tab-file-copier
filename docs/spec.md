# Chrome Tab File Copier 仕様書

## 1. 目的

Chromeで手動選択した1つ以上のタブからURLを取得し、設定済みの正規表現を使ってファイル名を抽出する。

抽出したファイル名に対応するローカルファイルを、設定済みのコピー元ディレクトリからコピー先ディレクトリへコピーする。

コピー処理はChrome ExtensionからNative Messagingを使ってローカルのNode.jsプログラムを呼び出して実行する。

全ファイルのコピーに成功した場合のみ、対象となったChromeタブを閉じる。

---

## 2. 対象環境

### Chrome Extension

* Google Chrome
* Manifest V3

### Native Host

以下のOSを対象とする。

* Windows
* macOS
* Linux

Node.jsがインストールされている環境を前提とする。

Native Hostの処理は共通のNode.js / TypeScript実装を使用し、Native Messaging Hostの登録方法のみOSごとに分ける。

---

## 3. 全体構成

```text
Chrome
  │
  │ ユーザーが対象タブを選択
  ▼
Chrome Extension
  │
  ├─ 選択タブ取得
  ├─ URL検証
  ├─ ファイル名抽出
  ├─ 重複排除
  │
  │ Native Messaging
  ▼
Native Host
  │
  ├─ コピー計画作成
  ├─ 全ファイル事前検証
  ├─ ファイルコピー
  │
  ▼
コピー先ディレクトリ
```

コピーに全件成功した場合のみ、Chrome Extensionが対象タブを閉じる。

---

## 4. Chrome Extensionの責務

Chrome Extensionは以下を担当する。

* 設定の保存・読み込み
* Chromeで現在選択されているタブの取得
* 選択タブのURL検証
* URLからファイル名を抽出
* 同一ファイル名の重複排除
* Native Hostの呼び出し
* Native Hostの実行結果表示
* 全件成功後のタブクローズ

ローカルファイルの存在確認やコピー処理はChrome Extensionでは行わない。

---

## 5. Native Hostの責務

Native Hostは以下を担当する。

* Chrome Extensionからのリクエスト受信
* コピー元パスの生成
* コピー先パスの生成
* コピー前の全件検証
* ファイルコピー
* コピー結果の返却

Native HostはChromeのタブやURLについて認識しない。

入力されたファイル名を使ってローカルファイルを処理するだけの構成とする。

---

# 6. 設定

Chrome Extensionの設定画面で以下を設定する。

## 6.1 URL正規表現

選択されたタブのURL判定とファイル名抽出の両方に使用する。

正規表現の第1キャプチャをファイル名として使用する。

例:

```text
^https://example\.com/files/([^/?#]+)$
```

対象URL:

```text
https://example.com/files/ABC123.pdf
```

抽出結果:

```text
ABC123.pdf
```

### 要件

* 有効なJavaScript正規表現であること
* 第1キャプチャを持つこと
* 選択した全タブのURLが正規表現に一致すること
* 全タブについて第1キャプチャを取得できること

1タブでも条件を満たさない場合、処理全体を中断する。

---

## 6.2 コピー元ディレクトリ

ローカルファイルが存在するルートディレクトリ。

例:

Windows:

```text
C:\Users\user\source
```

macOS:

```text
/Users/user/source
```

Linux:

```text
/home/user/source
```

URLから抽出したファイル名が `ABC123.pdf` の場合、

```text
{sourceRoot}/ABC123.pdf
```

をコピー元ファイルとして扱う。

サブディレクトリの検索は行わない。

---

## 6.3 コピー先ディレクトリ

ファイルを配置するディレクトリ。

例:

```text
/Users/user/Desktop/export
```

コピー先には追加のディレクトリを作成しない。

例えば、

```text
ABC123.pdf
DEF456.pdf
```

をコピーする場合、

```text
export/
├── ABC123.pdf
└── DEF456.pdf
```

となる。

---

## 6.4 設定保存

設定は `chrome.storage.local` に保存する。

対象:

* URL正規表現
* コピー元ディレクトリ
* コピー先ディレクトリ
* コピー成功後にタブを閉じる設定

コピー元・コピー先はホストマシン固有の値であるため、Chrome Syncは使用しない。

---

# 7. タブ選択

## 7.1 対象タブ

Chrome上でユーザーが手動選択したタブのみを対象とする。

複数タブ選択に対応する。

Chrome Extensionでは以下の条件で取得する。

```ts
chrome.tabs.query({
  highlighted: true,
  currentWindow: true,
});
```

現在のChromeウィンドウで選択されているタブだけを対象とする。

---

## 7.2 タブ一覧の固定

実行ボタンを押した時点の選択タブ一覧を、その実行の対象として固定する。

実行開始後にユーザーがタブ選択状態を変更しても処理対象には反映しない。

---

# 8. URL検証

選択されたすべてのタブに設定された正規表現を適用する。

以下の場合は処理を中断する。

* URLを取得できない
* 正規表現に一致しない
* 第1キャプチャが存在しない
* 第1キャプチャが空文字列

例:

選択タブ:

```text
https://example.com/files/AAA.pdf
https://example.com/files/BBB.pdf
https://google.com/
```

3番目のURLが正規表現に一致しない場合、

```text
コピー対象: 0
Native Host: 呼び出さない
タブ: 閉じない
```

とする。

一致したタブだけを処理する動作は禁止する。

---

# 9. ファイル名の重複

複数のタブから同一の第1キャプチャが取得された場合、コピー対象ファイルとしては1件にまとめる。

例:

```text
Tab 1 → ABC.pdf
Tab 2 → ABC.pdf
Tab 3 → DEF.pdf
```

コピー対象:

```text
ABC.pdf
DEF.pdf
```

タブとの対応はChrome Extension側で保持する。

例:

```ts
[
  {
    key: "ABC.pdf",
    tabIds: [101, 102]
  },
  {
    key: "DEF.pdf",
    tabIds: [103]
  }
]
```

Native Hostには重複排除済みのファイル名だけを送る。

---

# 10. Native Messaging

Chrome ExtensionからNative Hostを呼び出す。

常駐プロセスは使用しない。

実行時に `chrome.runtime.sendNativeMessage()` を使用してNative Hostを起動する。

概念上の処理:

```text
Chrome Extension
↓
sendNativeMessage()
↓
Native Host起動
↓
ファイル検証・コピー
↓
結果JSON
↓
Native Host終了
```

---

# 11. Native Hostへのリクエスト

例:

```json
{
  "type": "COPY_FILES",
  "sourceRoot": "/Users/user/source",
  "destination": "/Users/user/export",
  "keys": [
    "ABC.pdf",
    "DEF.pdf"
  ]
}
```

型定義例:

```ts
type CopyRequest = {
  type: "COPY_FILES";
  sourceRoot: string;
  destination: string;
  keys: string[];
};
```

---

# 12. コピー計画

Native Hostは、コピー開始前に全ファイルについてコピー元・コピー先を決定する。

例:

```text
key:
ABC.pdf

source:
/Users/user/source/ABC.pdf

destination:
/Users/user/export/ABC.pdf
```

内部表現例:

```ts
type CopyPlanItem = {
  key: string;
  source: string;
  destination: string;
};
```

---

# 13. コピー前検証

ファイルコピーを開始する前に、対象となる全ファイルを検証する。

1件でも問題がある場合はコピーを1件も開始しない。

## 13.1 コピー元

以下を検証する。

* コピー元ディレクトリが存在する
* コピー元ファイルが存在する
* コピー元が通常ファイルである
* コピー元パスがコピー元ルートの外へ出ていない

以下のような値によるディレクトリトラバーサルを許可しない。

```text
../../secret.txt
```

`path.resolve()` 等を使って解決後のパスを確認する。

---

## 13.2 コピー先

以下を検証する。

* コピー先ディレクトリが存在する
* コピー先がディレクトリである
* コピー可能な状態である
* コピー先に同名のファイルが存在しない
* コピー先に同名のディレクトリ等が存在しない

1件でも既存パスとの衝突がある場合、処理全体を失敗とする。

既存ファイルへの上書きは行わない。

---

# 14. コピー実行

事前検証をすべて通過した場合のみコピーを開始する。

Node.jsでは上書きを防ぐため、排他的コピーを使用する。

例:

```ts
await fs.copyFile(
  source,
  destination,
  fs.constants.COPYFILE_EXCL,
);
```

これにより、事前検証後に別プロセスによってコピー先ファイルが作成された場合でも既存ファイルを上書きしない。

---

# 15. コピー途中の失敗

事前検証後でも、以下の理由などでコピーに失敗する可能性がある。

* ディスク容量不足
* 権限変更
* ファイル削除
* I/Oエラー
* 他プロセスとの競合

コピー途中で1件でも失敗した場合、その時点で以降のコピーを中断する。

すでにコピー済みのファイルは削除しない。

ロールバック処理は実装しない。

そのため、実行途中で失敗した場合は一部のファイルだけコピー済みとなる可能性がある。

ただし既存ファイルへの上書きは行わない。

---

# 16. Native Hostのレスポンス

## 16.1 成功

例:

```json
{
  "success": true,
  "copiedFiles": [
    "ABC.pdf",
    "DEF.pdf"
  ]
}
```

---

## 16.2 事前検証失敗

例:

```json
{
  "success": false,
  "error": "PRECHECK_FAILED",
  "issues": [
    {
      "type": "DESTINATION_EXISTS",
      "key": "ABC.pdf",
      "path": "/Users/user/export/ABC.pdf"
    },
    {
      "type": "SOURCE_NOT_FOUND",
      "key": "DEF.pdf",
      "path": "/Users/user/source/DEF.pdf"
    }
  ]
}
```

事前検証では可能な限り全対象を確認し、問題をまとめて返す。

---

## 16.3 コピー途中の失敗

例:

```json
{
  "success": false,
  "error": "COPY_FAILED",
  "failedFile": "DEF.pdf",
  "copiedFiles": [
    "ABC.pdf"
  ]
}
```

この場合、`ABC.pdf` はコピー先に残る。

---

# 17. タブのクローズ

Native Hostから、

```json
{
  "success": true
}
```

が返された場合のみ、Chrome Extensionが対象タブを閉じる。

対象となるのは、実行ボタンを押した時点で選択されていたタブすべて。

ファイル名が重複していた場合も、そのファイル名に対応していたすべてのタブを閉じる。

例:

```text
Tab 101 → ABC.pdf
Tab 102 → ABC.pdf
Tab 103 → DEF.pdf
```

全ファイルコピー成功後:

```ts
chrome.tabs.remove([101, 102, 103]);
```

コピーに失敗した場合はタブを1つも閉じない。

実行中にユーザーがすでにタブを閉じていた場合、そのタブが存在しないこと自体はコピー失敗とはしない。

---

# 18. 実行時UI

実行前の確認画面は設けない。

ユーザー操作は以下とする。

```text
1. Chromeで対象タブを選択
2. Extensionの実行ボタンを押す
3. 自動的に検証・コピー
4. 成功した場合は対象タブが閉じる
```

タブを手動選択する操作自体を実行対象の指定として扱う。

---

# 19. 実行結果表示

最低限、以下の状態をユーザーへ表示できるようにする。

## 成功

```text
3ファイルをコピーしました。
5タブを閉じました。
```

## URL不一致

```text
実行できません。

選択したタブの中に、
設定されたURLパターンに一致しないタブがあります。
```

可能であれば対象URLを表示する。

## コピー前検証失敗

```text
ファイルをコピーできませんでした。

ABC.pdf
コピー先に同名ファイルがあります。

DEF.pdf
コピー元ファイルが見つかりません。

ファイルはコピーされていません。
```

## コピー途中失敗

```text
コピー処理の途中で失敗しました。

コピー済み: 2
失敗: DEF.pdf

タブは閉じていません。
```

---

# 20. 設定画面

初期版では以下を提供する。

```text
URL正規表現
[                                        ]

コピー元ディレクトリ
[                                        ]

コピー先ディレクトリ
[                                        ]

☑ コピー成功後に対象タブを閉じる

[保存]
```

---

## 20.1 URL正規表現のテスト

設定ミスを見つけやすくするため、テスト機能を提供する。

```text
URL正規表現
[ ^https://example\.com/files/([^/?#]+)$ ]

テストURL
[ https://example.com/files/ABC.pdf ]

結果:
URL一致
第1キャプチャ: ABC.pdf
```

正規表現自体が不正な場合もエラーを表示する。

---

# 21. Native Host実装

Node.js + TypeScriptで実装する。

例:

```text
native-host/
├── src/
│   ├── main.ts
│   ├── protocol.ts
│   ├── validate.ts
│   └── copy.ts
├── dist/
│   └── main.js
├── package.json
└── tsconfig.json
```

役割:

### `main.ts`

* Native Messagingの入出力
* リクエストの処理開始
* 成功・失敗レスポンス返却

### `protocol.ts`

* Native Messagingのメッセージ形式
* Request / Response型

### `validate.ts`

* コピー計画作成
* パス検証
* コピー元検証
* コピー先検証

### `copy.ts`

* 実際のファイルコピー

---

# 22. Chrome Extension構成

例:

```text
extension/
├── manifest.json
└── src/
    ├── background.ts
    ├── settings.ts
    ├── tabTargets.ts
    ├── nativeClient.ts
    │
    ├── popup/
    │   ├── popup.html
    │   └── popup.ts
    │
    └── options/
        ├── options.html
        └── options.ts
```

### `background.ts`

実行処理全体の制御。

### `settings.ts`

設定の保存・取得。

### `tabTargets.ts`

* highlightedタブ取得
* URL正規表現検証
* 第1キャプチャ抽出
* ファイル名重複排除

### `nativeClient.ts`

Native Messagingとの通信。

### `popup`

実行ボタンおよび結果表示。

### `options`

設定画面。

---

# 23. OSごとの差異

ファイルコピー処理自体はNode.js標準APIを使って共通化する。

OS依存部分はNative Messaging Hostの登録処理に限定する。

## Windows

Native Messaging Host Manifestを任意の場所に配置し、Chrome用レジストリへ登録する。

## macOS

Native Messaging Host ManifestをChrome指定の `NativeMessagingHosts` ディレクトリへ配置する。

## Linux

Native Messaging Host ManifestをChrome指定の `NativeMessagingHosts` ディレクトリへ配置する。

OSごとにインストールスクリプトを用意する。

```text
install/
├── windows.ps1
├── macos.sh
└── linux.sh
```

---

# 24. Native Host起動

Node.jsがインストールされていることを前提とする。

OSごとに薄いランチャーを用意し、Node.jsで共通の `dist/main.js` を実行する。

概念:

```text
Chrome
↓
Native Messaging Host Manifest
↓
launcher
↓
node dist/main.js
```

インストール時にNode.jsの実パスを取得してランチャーへ設定する。

---

# 25. セキュリティ要件

最低限、以下を満たす。

* Native Host Manifestの `allowed_origins` で対象Extension IDを限定する
* コピー元ルート外へのアクセスを禁止する
* URLから取得したファイル名を信用しない
* パス解決後にコピー元ルート配下であることをNative Host側で再確認する
* コピー先既存ファイルへの上書きを禁止する
* Native Messagingの入力を型・値ともに検証する
* `stdout` はNative Messaging専用とする
* Native Hostのログは `stderr` に出力する

---

# 26. 初期版で対応しないもの

初期版では以下を対象外とする。

* コピー途中のキャンセル
* コピー失敗時のロールバック
* サブディレクトリからのファイル検索
* コピー先へのファイル名変更
* コピー先へのサブディレクトリ作成
* URLごとに異なるコピー元ルート
* 複数のURL正規表現
* Chromeの複数ウィンドウを横断した対象選択
* ファイル内容の変換
* コピー元・コピー先の自動生成

---

# 27. 処理全体

```text
ユーザー
↓
Chromeで1つ以上のタブを選択
↓
Extension実行
↓
選択タブを取得
↓
全URLを正規表現で検証
↓
1件でも不一致
├─ YES → 終了
└─ NO
    ↓
第1キャプチャ取得
↓
ファイル名を重複排除
↓
Native Host呼び出し
↓
全対象の事前検証
↓
1件でも問題あり
├─ YES
│   ├─ コピーしない
│   ├─ エラー表示
│   └─ タブを閉じない
│
└─ NO
    ↓
COPYFILE_EXCLで順次コピー
    ↓
途中失敗
├─ YES
│   ├─ 以降を中断
│   ├─ コピー済みファイルは残す
│   ├─ エラー表示
│   └─ タブを閉じない
│
└─ NO
    ↓
全件成功
    ↓
対象タブを閉じる
    ↓
成功表示
```

---

# 28. 完了条件

初期版は以下をすべて満たした時点で完成とする。

* Chromeで選択した複数タブを取得できる
* 全タブのURLを1つの正規表現で検証できる
* 第1キャプチャからファイル名を取得できる
* 同一ファイル名を1件にまとめられる
* Windows / macOS / Linux上のNode.js Native Hostを呼び出せる
* コピー前に全対象ファイルを検証できる
* コピー先に既存パスがあれば全体を中断できる
* コピー時に既存ファイルを上書きしない
* コピー成功時のみ対象タブを閉じられる
* コピー失敗時には対象タブを残せる
* 設定画面から正規表現・コピー元・コピー先を変更できる
