# リポジトリ運用ルール

## プロジェクト概要

- Chrome Manifest V3 拡張機能と Node.js / TypeScript Native Messaging Host で構成する。
- Extension は選択タブの URL からファイル名を抽出して Native Host を呼び出す。ローカルファイルの検証とコピーは Native Host だけが担当する。
- 仕様の正本は `docs/spec.md` とする。

## 開発コマンド

- 依存関係のインストール: `npm ci`
- ビルド: `npm run build`
- 整形検査: `npm run format:check`
- lint: `npm run lint`
- テスト: `npm test`

変更後は、影響範囲に応じて上記コマンドを実行する。`dist/`、`node_modules/`、`coverage/` は生成物であり、コミットしない。

## 実装上の注意

- Native Messaging の stdout には、フレーム化したプロトコル応答だけを出力する。診断は stderr を使う。
- Native Host はコピー前に全対象を検証し、既存ファイルを上書きしない。コピー失敗時に対象タブを閉じない。
- 設定は `chrome.storage.local` に保存する。Chrome Sync は使わない。
- Native Host を変更した場合は `npm run build` 後に OS ごとのインストーラーを再実行する必要がある。詳細は `README.md` を参照する。

## 資料管理

- README、仕様書、運用手順など、このリポジトリで作成・更新する資料は日本語で記述する。
- 新しい仕様や恒久的な制約は `docs/spec.md` に記録する。一時的な実装計画やテスト記録は、完了後に不要なら削除する。

## Git コミット

- 完了した一つのまとまりごとに Git コミットを作成する。
- コミット前に作業ツリーを確認し、そのまとまりに属するファイルだけをステージする。無関係な変更を含めない。
- 利用可能な関連検証を実行してからコミットする。
- Conventional Commits 形式を使う。1 行目は利用者向けの現在形の要約、2 行目は空行、本文では変更理由と実装内容を記載する。
