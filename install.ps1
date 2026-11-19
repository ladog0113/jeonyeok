# 전역까지 앱 설치 (Windows): irm https://raw.githubusercontent.com/ladog0113/jeonyeok/main/install.ps1 | iex
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'
$dir = Join-Path $env:LOCALAPPDATA 'Jeonyeok'
$tmp = Join-Path $env:TEMP ("jy-" + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Force -Path $tmp | Out-Null
Write-Host '전역까지 최신 버전을 받는 중...'
Invoke-WebRequest -UseBasicParsing -Uri 'https://github.com/ladog0113/jeonyeok/releases/latest/download/Jeonyeok-win.zip' -OutFile (Join-Path $tmp 'jy.zip')
Get-Process -Name 'Jeonyeok' -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1
Expand-Archive -Path (Join-Path $tmp 'jy.zip') -DestinationPath $tmp -Force
if (Test-Path $dir) { Remove-Item -Recurse -Force $dir }
Move-Item (Join-Path $tmp 'Jeonyeok') $dir
Remove-Item -Recurse -Force $tmp
$exe = Join-Path $dir 'Jeonyeok.exe'
Get-ChildItem -Recurse $dir | Unblock-File -ErrorAction SilentlyContinue
$shell = New-Object -ComObject WScript.Shell
$lnk = $shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Programs')) '전역까지.lnk'))
$lnk.TargetPath = $exe
$lnk.WorkingDirectory = $dir
$lnk.Save()
Start-Process $exe
Write-Host "설치 완료: $dir"
Write-Host '시작 메뉴에 전역까지 바로가기를 만들었습니다.'
