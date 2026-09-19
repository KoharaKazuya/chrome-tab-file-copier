# 現在の実装状況

最終更新: 2026-09-19

## 現在のフェーズ

フェーズ 3: Extension の設定とオプション画面を実装する

状態: 作業中

## 完了済み

- 仕様書を `docs/spec.md` に保存した。
- 実装計画を `docs/implementation-plan.md` に保存した。
- コミット運用、資料の日本語記述、進捗管理のルールを `AGENTS.md` に記録した。
- フェーズ 2: Native Host のコピー計画・検証・コピーを実装した。

## 作業中

フェーズ 3 の項目 2: `chrome.storage.local` を使う設定ストレージを実装する。

## 次に着手する項目

フェーズ 3 の項目 1 を完了し、設定ストレージの実装へ進む。

## 直近の検証結果

- `npm run build`、`npm run format:check`、`npm run lint`、`npm test`、`git diff --check` が成功した。
- Native Messaging のフレーミングと安全なエラー応答を検証する自動テスト 7 件が成功した。
- `npm run build`、`npm run format:check`、`npm run lint`、`npm test`、`git diff --check` が成功した。
  Native Host のコピー計画・検証・コピーを検証する自動テスト 8 件を含め、全 15 件が成功した。

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
