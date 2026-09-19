# 現在の実装状況

最終更新: 2026-09-19

## 現在のフェーズ

フェーズ 7: テスト、手動検証、リリース準備を行う

状態: 作業中

## 完了済み

- 仕様書を `docs/spec.md` に保存した。
- 実装計画を `docs/implementation-plan.md` に保存した。
- コミット運用、資料の日本語記述、進捗管理のルールを `AGENTS.md` に記録した。
- フェーズ 2: Native Host のコピー計画・検証・コピーを実装した。

## 作業中

CI、手動受け入れテスト手順、README を整備中。実機 Chrome と OS 別登録の確認は未実施。

## 次に着手する項目

CI と文書を検証後、Extension ID を指定して実機受け入れテストを実施する。

## 直近の検証結果

- `npm run build`、`npm run format:check`、`npm run lint`、`npm test`、`git diff --check` が成功した。
- Native Messaging のフレーミングと安全なエラー応答を検証する自動テスト 7 件が成功した。
- `npm run build`、`npm run format:check`、`npm run lint`、`npm test`、`git diff --check` が成功した。
  Native Host のコピー計画・検証・コピーを検証する自動テスト 8 件を含め、全 15 件が成功した。
- `npm run build`、`npm run format:check`、`npm run lint`、`npm test`、`git diff --check` が成功した。
  設定ストレージと URL 正規表現の評価を含む全 21 件の自動テストが成功した。
- フェーズ 7 の準備として、`npm run format:check`、`npm run lint`、`npm test`、`npm run build`、
  `git diff --check` が成功した。自動テストは全 30 件が成功した。GitHub Actions の実行結果、
  3 OS の Host 登録、および Chrome 実機 end-to-end は未確認である。

## 運用メモ

- 実装計画のフェーズは、上から順に一つずつ完了させる。
- 各作業の開始、完了、保留、方針変更時にこのファイルを更新する。
- 作業のまとまりごとに、関連する進捗ファイルの更新を含めて Git コミットする。
- フェーズ 1 の項目 1 として、npm workspaces、共通 TypeScript 設定、ESLint、Prettier、Vitest の
  実行コマンドを追加した。既存資料への不要な整形変更を避けるため、format コマンドはコードと設定
  ファイルのみを検査対象とする。
- フェーズ 1 の項目 2 として、`extension` と `native-host` を npm workspace として初期化した。
  各パッケージは独自の TypeScript 設定で `src/` から `dist/` へビルドし、ルートの `npm run build` で
  両方を実行する。
- フェーズ 1 の項目 3 として、`native-host/src/protocol.ts` に `COPY_FILES` 要求と、成功、
  `PRECHECK_FAILED`、`COPY_FAILED` 応答の TypeScript 型を定義した。応答は `success` と `error` により
  判別可能な union 型として公開する。
- フェーズ 1 の項目 4 として、Native Messaging の 4 バイト little-endian 長と UTF-8 JSON による
  フレーミングを実装した。不正 JSON、型不正、未知の `type` は `INVALID_REQUEST` 応答へ変換し、診断は
  stderr のみに出力する。stdout はフレーム化したプロトコル応答だけを書き込む。
- フェーズ 1 の完了条件を満たした。有効な `COPY_FILES` 要求の入出力、および不正な要求の安全なエラー応答を
  自動テストで確認済みである。
- フェーズ 2 の項目 1 として、`sourceRoot`、`destination`、`keys` の空値を拒否し、重複した key を
  `INVALID_REQUEST` として拒否する実行時検証を実装した。
- フェーズ 2 の項目 2-3 として、basename 以外の key を拒否し、コピー元・先のディレクトリ、全 source、
  全 destination をコピー開始前に走査するコピー計画を実装した。問題は `PRECHECK_FAILED` に集約する。
- フェーズ 2 の項目 4-5 として、`COPYFILE_EXCL` を使う排他的コピーを実装した。コピー途中の失敗では後続を
  実行せず、成功済みと失敗した key を含む `COPY_FAILED` を返す。`main.ts` からの実行経路も結線した。
- フェーズ 2 の完了条件を満たした。正常コピー、source 不在、destination 衝突、トラバーサル、コピー途中の
  競合時における上書き防止を、一時ディレクトリを使用する自動テストで確認済みである。
- フェーズ 3 の項目 1 として、`storage`、`tabs`、`nativeMessaging` 権限、popup、options page、
  module Service Worker を含む Manifest V3 を追加した。Native Host 名は
  `extension/src/constants.ts` の `NATIVE_HOST_NAME` に一元化した。
- フェーズ 3 の項目 2 として、`chrome.storage.local` だけを使用する設定ストレージを実装した。
  URL 正規表現、コピー元・先、成功後のタブクローズ設定を読み書きし、保存時は必須文字列を検証・
  正規化する。設定ストレージの自動テストを追加し、Extension のビルド成果物をテスト対象から除外した。
- フェーズ 3 の項目 3-4 として、options 画面に設定フォーム、保存結果、URL 正規表現テストを追加した。
  テストは正規表現の構築エラー、不一致、第 1 キャプチャの不足・空文字列、一致時の抽出値を表示する。
  Extension の HTML/CSS はクロスプラットフォームの Node.js スクリプトで `dist/` へコピーする。
- フェーズ 3 の完了条件を満たした。設定は `chrome.storage.local` のみに保存され、URL 正規表現の
  構築エラーは保存前にテスト UI で確認できる。
- フェーズ 4 の項目 1 として、`chrome.tabs.query({ highlighted: true, currentWindow: true })` の結果を
  実行時点のスナップショットとして一度だけ取得する実行経路を追加した。
- フェーズ 4 の項目 2-3 として、全タブの URL と第 1 キャプチャを検証し、問題を集約して
  `URL_VALIDATION_FAILED` として返す処理を実装した。検証成功時は同一 key をグループ化し、Native Host
  へはユニークな key だけを送信する。
- フェーズ 4 の項目 4 として、Native Messaging の通信例外、不正応答、成功、事前検証失敗、コピー途中失敗を
  判別可能な結果モデルに変換した。Chrome API は依存性として差し替え可能にした。
- フェーズ 4 の完了条件を満たした。重複 key の一回送信、URL 検証失敗時の Native Host 非呼び出し、
  通信例外と不正応答の処理を含む自動テストを追加した。
- フェーズ 5 の項目 1 として、実行ボタン、設定画面への導線、結果表示を持つ Popup を追加した。実行中は
  ボタンを無効化し、二重送信を防止する。
- フェーズ 5 の項目 2-3 として、コピー成功時にユニークなコピー件数を表示し、設定が有効な場合だけ固定済みの
  tab ID を閉じるようにした。既に閉じられたタブのエラーを許容して、残りの削除を継続する。
- フェーズ 5 の項目 4 として、URL 検証、事前検証、コピー途中失敗、Native Host 通信失敗を日本語の
  結果メッセージに変換した。コピーが成功しない限りタブを閉じない。
- フェーズ 5 の完了条件を満たした。タブがない場合の Native Host 非呼び出し、タブ削除エラー時の継続を
  自動テストで確認した。
- フェーズ 6 の項目 1 として、Native Host 名、ランチャー絶対パス、許可する Extension ID を差し込む
  manifest テンプレートを追加した。Extension ID は各インストーラーの必須引数とし、未指定・形式不正を
  明示的にエラーにする。
- フェーズ 6 の項目 2-3 として、macOS、Linux、Windows のユーザー単位インストーラーを追加した。
  Node.js とビルド成果物を確認した後、Host をユーザー領域へ配置し、Chrome の NativeMessagingHosts
  配置先または `HKCU` レジストリへ登録する。
- フェーズ 6 の項目 4 として、空白を含めて引用した絶対パスのランチャーを生成し、Node.js 未導入と
  Extension ID 未設定を安全に停止するようにした。各 OS 向けアンインストーラーも追加した。
- フェーズ 6 の完了条件に必要な登録スクリプトと Native Host 起動経路を実装した。実際の 3 OS 登録と
  Chrome からの起動確認は、フェーズ 7 の手動受け入れテストとして記録・実施する。
