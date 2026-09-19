#!/usr/bin/env bash
set -euo pipefail

host_name="com.chrome_tab_file_copier"
extension_id="${1:-}"
if [[ -z "$extension_id" ]]; then
  echo "使用法: $0 <Extension ID>" >&2
  exit 1
fi
if ! [[ "$extension_id" =~ ^[a-p]{32}$ ]]; then
  echo "Extension ID は a-p から成る 32 文字で指定してください。" >&2
  exit 1
fi

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
project_dir="$(cd "$script_dir/.." && pwd)"
node_path="$(command -v node || true)"
if [[ -z "$node_path" ]]; then
  echo "Node.js が見つかりません。Node.js をインストールしてから再実行してください。" >&2
  exit 1
fi
if [[ ! -f "$project_dir/native-host/dist/main.js" ]]; then
  echo "native-host/dist/main.js がありません。先に npm run build を実行してください。" >&2
  exit 1
fi

install_root="${XDG_DATA_HOME:-$HOME/.local/share}/chrome-tab-file-copier"
host_dir="$install_root/native-host"
manifest_dir="${XDG_CONFIG_HOME:-$HOME/.config}/google-chrome/NativeMessagingHosts"
launcher="$install_root/$host_name.sh"
manifest="$manifest_dir/$host_name.json"

mkdir -p "$install_root" "$manifest_dir"
rm -rf "$host_dir"
cp -R "$project_dir/native-host" "$host_dir"
cat > "$launcher" <<EOF
#!/usr/bin/env bash
exec "$node_path" "$host_dir/dist/main.js"
EOF
chmod 755 "$launcher"
sed -e "s|__LAUNCHER_PATH__|$launcher|g" -e "s|__EXTENSION_ID__|$extension_id|g" \
  "$project_dir/native-host/manifests/$host_name.json.template" > "$manifest"

echo "Native Host を登録しました: $manifest"
echo "Chrome を再起動し、拡張機能 ID $extension_id から接続を確認してください。"
