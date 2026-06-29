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

$stateDir = Join-Path $repo 'scripts\cadence\state'
if (-not (Test-Path $stateDir)) { New-Item -ItemType Directory -Force $stateDir | Out-Null }
$stateFile = Join-Path $stateDir 'routine_runs.json'
$stateTmp = Join-Path $stateDir "routine_runs_$([guid]::NewGuid().ToString('N').Substring(0,8)).tmp"

function Read-RunState {
    if (Test-Path $stateFile) {
        try { return (Get-Content $stateFile -Raw | ConvertFrom-Json) }
        catch { return @{} }
    }
    return @{}
}

function Write-RunState($obj) {
    $obj | ConvertTo-Json -Depth 5 | Out-File $stateTmp -Encoding utf8 -Force
    Move-Item -Force $stateTmp $stateFile
}

$runStart = Get-Date -Format 'o'
"[$(Get-Date -Format o)] cadence task '$Task' starting" | Out-File $log -Encoding utf8
& claude -p $prompt --model claude-sonnet-4-6 --permission-mode bypassPermissions 2>&1 |
    Out-File $log -Append -Encoding utf8
$code = $LASTEXITCODE
"[$(Get-Date -Format o)] cadence task '$Task' finished, exit $code" | Out-File $log -Append -Encoding utf8

$runEntry = @{
    routine = $Task
    actual_start = $runStart
    actual_end = (Get-Date -Format 'o')
    status = $(if ($code -eq 0) { 'success' } else { 'failed' })
    exit_code = $code
    log_path = $log
}

$state = Read-RunState
if (-not $state.$Task) { $state | Add-Member -NotePropertyName $Task -NotePropertyValue @() -Force }
$runs = @($state.$Task) + @($runEntry)
if ($runs.Count -gt 10) { $runs = $runs[($runs.Count - 10)..($runs.Count - 1)] }
$state.$Task = $runs
Write-RunState $state

Get-ChildItem $logDir -Filter "$Task`_*.log" | Sort-Object LastWriteTime -Descending |
    Select-Object -Skip 30 | Remove-Item -Force -ErrorAction SilentlyContinue

exit $code
