# 現在の実装状況

最終更新: 2026-09-19

## 現在のフェーズ

フェーズ 1: 開発基盤と共有する契約を整える

状態: 進行中（項目 3 完了）

## 完了済み

- 仕様書を `docs/spec.md` に保存した。
- 実装計画を `docs/implementation-plan.md` に保存した。
- コミット運用、資料の日本語記述、進捗管理のルールを `AGENTS.md` に記録した。

## 作業中

フェーズ 1: 開発基盤と共有する契約を整える

## 次に着手する項目

実装計画フェーズ 1 の次の項目: Native Messaging の 4 バイト little-endian 長 + UTF-8 JSON
フレーミングを実装し、stdout がプロトコル出力だけであることをテストする。

## 直近の検証結果

- `npm run build`、`npm run format:check`、`npm run lint`、`npm test`、`git diff --check` が成功した。
- テスト対象はまだ存在しないため、Vitest はテスト 0 件で成功している。

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
