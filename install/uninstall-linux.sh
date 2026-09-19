#!/usr/bin/env bash
set -euo pipefail
rm -f "${XDG_CONFIG_HOME:-$HOME/.config}/google-chrome/NativeMessagingHosts/com.chrome_tab_file_copier.json"
rm -rf "${XDG_DATA_HOME:-$HOME/.local/share}/chrome-tab-file-copier"
echo "Native Host の登録と配置済みファイルを削除しました。"
