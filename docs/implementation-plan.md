# Chrome Tab File Copier 実装計画

## 目的と実装方針

`docs/spec.md` の初期版を、Manifest V3 の Chrome Extension と Node.js / TypeScript
Native Messaging Host として実装する。Extension は URL とタブの処理および UI を担当し、
ローカルファイル操作はすべて Native Host に閉じ込める。コピーの原子性は「コピー開始前の
全件事前検証」までとし、コピー中に失敗した場合は既にコピーされたファイルを残す。

最初に開発用の固定 Extension ID を用意し、その ID を Native Host Manifest の
`allowed_origins` に設定する。これにより Native Host が任意の拡張機能から起動されないようにする。

## 想定ディレクトリ構成

```text
extension/
  manifest.json
  package.json
  tsconfig.json
  src/
    background.ts
    settings.ts
    tabTargets.ts
    nativeClient.ts
    popup/{popup.html,popup.ts,popup.css}
    options/{options.html,options.ts,options.css}
native-host/
  package.json
  tsconfig.json
  src/{main.ts,protocol.ts,validate.ts,copy.ts}
  manifests/
  launchers/
install/{windows.ps1,macos.sh,linux.sh}
tests/
docs/
```

ビルド出力 (`dist/`) はソース管理せず、各パッケージのビルドで生成する。Extension は
Chrome が読み込めるディレクトリへビルド成果物を出力し、Native Host は Node.js で
`dist/main.js` を実行する。

## 実装フェーズ

### 1. 開発基盤と共有する契約を整える

1. ルートにワークスペース設定、TypeScript 設定、lint / format / test コマンドを追加する。
2. Extension と Native Host を別パッケージとして初期化し、ビルド成果物を分離する。
3. `COPY_FILES` リクエスト、成功、`PRECHECK_FAILED`、`COPY_FAILED` の TypeScript 型を
   `native-host/src/protocol.ts` に定義する。
4. Native Messaging の 4 バイト little-endian 長 + UTF-8 JSON フレーミングを実装し、
   stdout がプロトコル出力だけであることをテストする。診断ログは stderr に限定する。

完了条件: 空の有効なリクエストを読み書きでき、型不正・JSON 不正・未知の `type` を安全な
エラー応答として処理できる。

### 2. Native Host のコピー計画・検証・コピーを実装する

1. 入力値を実行時にも検証する。`sourceRoot` と `destination` は空でない文字列、`keys` は
   空でない文字列の配列とし、重複キーは拒否または Extension 側と同じく正規化して扱う。
2. 各 key から `path.resolve(sourceRoot, key)` と `path.resolve(destination, key)` を作り、
   source が解決後も sourceRoot 内であることを、パス境界を考慮して確認する。絶対パス、
   `..`、区切り文字を含む key は明示的に拒否する。
3. コピー開始前に sourceRoot、destination、すべての source と destination を走査する。
   source は通常ファイル、destination は既存しないことを確認し、問題を `issues` に集約する。
4. すべての検証成功後、計画順に `fs.copyFile(..., COPYFILE_EXCL)` を実行する。失敗時は
   後続を実行せず、成功済みキーと失敗キーを含む `COPY_FAILED` を返す。
5. `main.ts` で上記を結線し、例外をプロトコル外に漏らさない。

完了条件: 正常コピー、source 不在、destination 衝突、トラバーサル、コピー途中失敗、競合時の
上書き防止を一時ディレクトリを使う自動テストで検証できる。

### 3. Extension の設定とオプション画面を実装する

1. MV3 manifest に storage、tabs、nativeMessaging 権限、popup、options page、service worker を
   定義する。Native Host 名は定数に一元化する。
2. `settings.ts` で `chrome.storage.local` への読み書き、必須文字列の検証、既定値を実装する。
3. options 画面に URL 正規表現、コピー元、コピー先、「成功後にタブを閉じる」、保存 UI を置く。
4. 正規表現テスト UI は `RegExp` の構築エラー、第 1 キャプチャの不足・空文字列、一致、抽出値を
   画面に表示する。

完了条件: 設定がブラウザ再起動後もローカルに保持され、Sync を使用せず、無効な正規表現を保存前に
利用者が確認できる。

### 4. タブ抽出と Native Host 呼び出しを実装する

1. 実行ボタン押下時に `chrome.tabs.query({ highlighted: true, currentWindow: true })` を一度だけ
   呼び、tab ID と URL のスナップショットを固定する。
2. 設定済み正規表現を全タブに適用し、URL 不在、不一致、第 1 キャプチャなし・空文字列が一件でも
   あれば Native Host を呼ばずに失敗として返す。
3. 抽出 key ごとに tab ID をグループ化し、key は一度だけ Native Host へ送る。
4. `sendNativeMessage` の通信失敗、Host の不正応答、各成功・失敗応答を利用者向けの結果モデルへ
   変換する。

完了条件: 重複 URL は一回だけコピー要求に含まれ、URL 検証失敗時にはコピー要求もタブ削除も行われない。

### 5. Popup の実行体験とタブクローズを実装する

1. popup に実行ボタン、設定画面への導線、実行中の二重送信防止、結果領域を実装する。
2. 成功時はコピーしたユニークなファイル数を表示する。設定で許可されている場合だけ、最初に固定した
   tab ID 全件を削除する。
3. タブ削除では、既に閉じられた tab ID によるエラーを許容し、残存タブの削除を試みる。コピー成功を
   タブ削除エラーで失敗扱いに戻さない。
4. URL 不一致、事前検証失敗、コピー途中失敗、Native Host 通信失敗を仕様の日本語メッセージで表示し、
   コピー失敗時にはタブを一切閉じない。

完了条件: 全コピー成功の場合だけ対象スナップショットのタブを閉じ、設定がオフならコピー成功でも閉じない。

### 6. OS 別の配布・登録を実装する

1. Native Host Manifest テンプレートを作り、ホスト名、ランチャー絶対パス、Extension ID を差し込む。
2. macOS / Linux 用シェルスクリプト、Windows PowerShell スクリプトで Node.js 実体を検出し、
   ランチャーと Manifest を配置・登録する。
3. 各 OS の Chrome NativeMessagingHosts 配置先または Windows レジストリを正確に扱い、
   インストール完了後の確認方法とアンインストール方法を文書化する。
4. パスの空白、Node.js 未導入、Extension ID 未設定を明示的にエラーにする。

完了条件: 各対象 OS の手順で Chrome から Native Host を一回起動でき、許可した Extension ID 以外は
起動できない。

### 7. テスト、手動検証、リリース準備を行う

1. Native Host の単体・結合テストと、Extension の純粋ロジック（設定、URL 抽出、重複排除、結果変換）の
   単体テストを CI で実行する。
2. Chrome API はテスト用アダプターまたはモックに隔離し、タブ取得、Native 呼び出し、タブ削除の
   成否を検証する。
3. Chrome の unpacked extension を使う手動受け入れテストを作成する。対象は単一・複数・重複タブ、
   URL 異常、各 precheck 異常、途中失敗、タブクローズ設定のオン・オフ。
4. README に開発、ビルド、拡張機能の読み込み、Host のインストール、トラブルシュートを記載する。

完了条件: CI が成功し、3 OS で Host 登録を、少なくとも一つの OS で end-to-end コピーを確認してから
初期リリースとする。

## 主要な受け入れ基準

- 選択された全タブが URL 要件を満たすまで、Native Host は起動されない。
- 同一 key は一度だけコピーされるが、成功後は関連する全タブが閉じられる。
- 事前検証に一つでも失敗があればファイルは一件もコピーされない。
- コピー中に失敗した場合、後続コピーとタブクローズを行わず、既にコピー済みのファイルは残る。
- sourceRoot 外へのアクセス、コピー先の既存パスへの上書き、許可外 Extension からの Host 起動を防ぐ。
- 設定は `chrome.storage.local` だけに保存する。

## 実装前に確定する事項

1. 配布する Extension ID（開発版・配布版の運用を含む）。`allowed_origins` に必須である。
2. Extension のビルド手段（素の TypeScript、Vite 等）と対応する最低 Chrome バージョン。
3. `keys` に許可する文字集合。初期版は basename のみを許可し、プラットフォーム固有の危険文字も
   拒否する方針を推奨する。
4. Native Host のインストーラーが必要とする権限と、署名・配布方式。
5. コピー先の書き込み可能判定の定義。事前検証は権限を確認しても競合を完全には防げないため、
   最終的な安全性は `COPYFILE_EXCL` と実コピー時のエラーで担保する。
