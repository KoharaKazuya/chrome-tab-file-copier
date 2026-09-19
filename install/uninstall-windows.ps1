$ErrorActionPreference = 'Stop'
$hostName = 'com.chrome_tab_file_copier'
$registryPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName"
if (Test-Path $registryPath) { Remove-Item -Force $registryPath }
$installRoot = Join-Path $env:LOCALAPPDATA 'ChromeTabFileCopier'
if (Test-Path $installRoot) { Remove-Item -Recurse -Force $installRoot }
Write-Host 'Native Host の登録と配置済みファイルを削除しました。'
