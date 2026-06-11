# run-cadence.ps1 — generic runner for NBI local cadence tasks
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File run-cadence.ps1 -Task morning-brief
# Each task has a prompt file in scripts/cadence/prompts/<task>.md.
# Runs headless Claude (Sonnet) in the repo working tree so output lands locally
# and is committed directly. Replaces the claude.ai cloud routines, which ran in
# isolated sandboxes against stale master and never delivered output anywhere
# (root-caused 2026-06-11, see session log).

param(
    [Parameter(Mandatory = $true)][string]$Task
)

$repo = 'D:\OneDrive\Claude_code\NBIAI_TEAM'
$promptFile = Join-Path $repo "scripts\cadence\prompts\$Task.md"
$logDir = Join-Path $repo 'scripts\cadence\logs'
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Force $logDir | Out-Null }
$stamp = Get-Date -Format 'yyyy-MM-dd_HHmm'
$log = Join-Path $logDir "$Task`_$stamp.log"

if (-not (Test-Path $promptFile)) {
    "[$(Get-Date -Format o)] FATAL: prompt file not found: $promptFile" | Out-File $log -Encoding utf8
    exit 1
}

$prompt = Get-Content $promptFile -Raw
Set-Location $repo

"[$(Get-Date -Format o)] cadence task '$Task' starting" | Out-File $log -Encoding utf8
& claude -p $prompt --model claude-sonnet-4-6 --permission-mode bypassPermissions 2>&1 |
    Out-File $log -Append -Encoding utf8
$code = $LASTEXITCODE
"[$(Get-Date -Format o)] cadence task '$Task' finished, exit $code" | Out-File $log -Append -Encoding utf8

# Keep the last 30 logs per task
Get-ChildItem $logDir -Filter "$Task`_*.log" | Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 30 | Remove-Item -Force -ErrorAction SilentlyContinue

exit $code
