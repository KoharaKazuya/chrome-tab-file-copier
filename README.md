# Chrome Tab File Copier

Chrome で選択したタブの URL からファイル名を抽出し、ローカルのコピー元ディレクトリからコピー先へ安全にコピーする Manifest V3 拡張機能です。ローカルファイルの操作は Native Messaging Host のみが担当します。

## 開発

Node.js 22 以降を用意して、依存関係をインストールします。

```sh
npm ci
npm run build
npm run format:check
npm run lint
npm test
```

`npm run build` は `extension/dist/` と `native-host/dist/` を生成します。CI でも整形、lint、単体・結合テスト、ビルド、差分の空白エラー検査を実行します。

## 拡張機能の読み込みと設定

1. Chrome の `chrome://extensions` を開き、デベロッパーモードを有効にする。
2. 「パッケージ化されていない拡張機能を読み込む」から、このリポジトリの `extension/` ディレクトリを選択する。
3. 表示された Extension ID を控える。
4. 拡張機能の詳細画面から「拡張機能のオプション」を開き、URL 正規表現、コピー元、コピー先、成功後にタブを閉じるかを保存する。

正規表現の第 1 キャプチャをファイル名として使用します。たとえば `^https://example\\.com/files/([^/?#]+)$` は `https://example.com/files/ABC.pdf` から `ABC.pdf` を抽出します。

## Native Host のインストール

先に `npm run build` を実行してから、Chrome に表示された Extension ID を渡します。ID 未指定、形式不正、Node.js 未導入、ビルド成果物未生成の場合はインストーラーが停止します。

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

各インストーラーはユーザー領域へ Host とランチャーを配置し、macOS/Linux では Chrome の `NativeMessagingHosts` ディレクトリへ manifest を、Windows では `HKCU\Software\Google\Chrome\NativeMessagingHosts` へ登録します。完了後は Chrome を完全に再起動してください。

アンインストールは、使用 OS に応じて `bash install/uninstall-macos.sh`、`bash install/uninstall-linux.sh`、または `./install/uninstall-windows.ps1` を実行します。これらは登録と配置済み Host を削除します。

## トラブルシュート

- Popup に Native Host 通信エラーが出る: `npm run build` 後に、現在 Chrome に読み込んでいる Extension ID でインストーラーを再実行し、Chrome を再起動する。
- コピー前の検証エラーが出る: コピー元・コピー先が存在するディレクトリか、抽出名に対応する通常ファイルが存在するか、コピー先に同名ファイルがないかを確認する。
- URL エラーが出る: 設定画面のテスト欄で URL と正規表現を確認する。第 1 キャプチャは空にできない。
- コピー成功後にタブが残る: 「コピー成功後にタブを閉じる」が有効か確認する。既に閉じられたタブは安全に無視される。

実機での確認項目は [手動受け入れテスト](docs/manual-acceptance-test.md) を参照してください。
