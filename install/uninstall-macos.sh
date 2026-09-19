#!/usr/bin/env bash
set -euo pipefail
rm -f "$HOME/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.chrome_tab_file_copier.json"
rm -rf "$HOME/Library/Application Support/Chrome Tab File Copier"
echo "Native Host の登録と配置済みファイルを削除しました。"
