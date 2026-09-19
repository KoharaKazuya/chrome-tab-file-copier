param(
    [Parameter(Mandatory = $true)]
    [ValidatePattern('^[a-p]{32}$')]
    [string]$ExtensionId
)

$ErrorActionPreference = 'Stop'
$hostName = 'com.chrome_tab_file_copier'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$nodePath = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $nodePath) {
    throw 'Node.js が見つかりません。Node.js をインストールしてから再実行してください。'
}
$sourceHost = Join-Path $projectDirectory 'native-host'
if (-not (Test-Path (Join-Path $sourceHost 'dist/main.js'))) {
    throw 'native-host/dist/main.js がありません。先に npm run build を実行してください。'
}

$installRoot = Join-Path $env:LOCALAPPDATA 'ChromeTabFileCopier'
$hostDirectory = Join-Path $installRoot 'native-host'
$launcher = Join-Path $installRoot "$hostName.cmd"
$manifest = Join-Path $installRoot "$hostName.json"
New-Item -ItemType Directory -Force -Path $installRoot | Out-Null
if (Test-Path $hostDirectory) { Remove-Item -Recurse -Force $hostDirectory }
Copy-Item -Recurse -Force $sourceHost $hostDirectory
Set-Content -LiteralPath $launcher -Encoding Ascii -Value "@echo off`r`n`"$nodePath`" `"$hostDirectory\dist\main.js`""

$manifestObject = @{
    name = $hostName
    description = 'Chrome Tab File Copier Native Messaging Host'
    path = $launcher
    type = 'stdio'
    allowed_origins = @("chrome-extension://$ExtensionId/")
}
$manifestObject | ConvertTo-Json | Set-Content -LiteralPath $manifest -Encoding utf8
New-Item -Path "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName" -Force | Out-Null
Set-ItemProperty -Path "HKCU:\Software\Google\Chrome\NativeMessagingHosts\$hostName" -Name '(Default)' -Value $manifest

Write-Host "Native Host を登録しました: $manifest"
Write-Host "Chrome を再起動し、拡張機能 ID $ExtensionId から接続を確認してください。"
