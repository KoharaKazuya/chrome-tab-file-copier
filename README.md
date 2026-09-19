# Chrome Tab File Copier

Chrome で選択したタブの URL からファイル名を抽出し、ローカルのコピー元ディレクトリからコピー先へコピーする拡張機能です。ローカルファイルの操作は Native Messaging Host が担当します。

## 動作要件

- Google Chrome
- Node.js 22 以降
- macOS、Linux、または Windows

## インストール

1. このリポジトリを取得し、依存関係のインストールとビルドを行います。

   ```sh
   npm ci
   npm run build
   ```

2. Chrome で `chrome://extensions` を開き、デベロッパーモードを有効にします。「パッケージ化されていない拡張機能を読み込む」から、このリポジトリの `extension/` ディレクトリを選択します。

3. 拡張機能一覧に表示された Extension ID を控え、使用している OS のコマンドで Native Host を登録します。

   ```sh
   # macOS
   bash install/macos.sh <EXTENSION_ID>

   # Linux
   bash install/linux.sh <EXTENSION_ID>
   ```

   ```powershell
   # Windows PowerShell
   .\install\windows.ps1 -ExtensionId <EXTENSION_ID>
   ```

4. Chrome を完全に再起動します。拡張機能の詳細画面から「拡張機能のオプション」を開き、URL 正規表現、コピー元ディレクトリ、コピー先ディレクトリ、成功後にタブを閉じるかを設定します。

正規表現の第 1 キャプチャをファイル名として使います。たとえば `^https://example\\.com/files/([^/?#]+)$` は、`https://example.com/files/ABC.pdf` から `ABC.pdf` を抽出します。

## 使い方

1. 現在の Chrome ウィンドウで対象タブを選択します。複数選択にも対応します。
2. 拡張機能の Popup を開き、「コピーを実行」を選択します。
3. すべてのコピーに成功した場合のみ、設定に応じて対象タブを閉じます。同じファイル名を抽出したタブは、ファイルを一度だけコピーしてすべて閉じます。

コピー先に同名ファイルがある、コピー元が存在しない、または URL が正規表現に一致しない場合、コピーとタブのクローズは行いません。

## 更新・アンインストール

拡張機能または Native Host を更新した場合は、`npm run build` を実行してから Native Host のインストーラーを再実行し、Chrome を完全に再起動してください。

アンインストールは使用 OS に応じて次を実行します。Native Host の登録と配置済みファイルを削除します。

```sh
# macOS
bash install/uninstall-macos.sh

# Linux
bash install/uninstall-linux.sh
```

```powershell
# Windows PowerShell
.\install\uninstall-windows.ps1
```

## 開発と検証

```sh
npm run format:check
npm run lint
npm test
npm run build
```

## トラブルシュート

- Native Host 通信エラー: `npm run build` 後、Chrome に読み込まれている Extension ID でインストーラーを再実行し、Chrome を完全に再起動します。
- コピー前の検証エラー: コピー元・コピー先が存在するディレクトリか、抽出したファイルがコピー元にあるか、コピー先に同名ファイルがないかを確認します。
- URL エラー: 設定画面のテスト欄で URL と正規表現を確認します。第 1 キャプチャは空にできません。
- コピー成功後にタブが残る: 「コピー成功後にタブを閉じる」が有効かを確認します。コピーとタブのクローズはバックグラウンドで実行されるため、Popup を閉じても処理は継続します。

詳細な仕様は [docs/spec.md](docs/spec.md) を参照してください。
