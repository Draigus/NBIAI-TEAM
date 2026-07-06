# run-cadence.ps1 — generic runner for NBI local cadence tasks
# Usage: powershell -NoProfile -ExecutionPolicy Bypass -File run-cadence.ps1 -Task morning-brief
# Each task has a prompt file in scripts/cadence/prompts/<task>.md.
# Runs headless Claude (model per scripts/cadence/model-map.json, default Sonnet) in the repo working tree so output lands locally
# and is committed directly. Replaces the claude.ai cloud routines, which ran in
# isolated sandboxes against stale master and never delivered output anywhere
# (root-caused 2026-06-11, see session log).

param(
    [Parameter(Mandatory = $true)][string]$Task,
    [string]$Model = '',
    [switch]$DryRun
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

# --- Model resolution: explicit -Model beats model-map.json beats default ---
$modelMapFile = Join-Path $repo 'scripts\cadence\model-map.json'
if (-not $Model) {
    $Model = 'claude-sonnet-4-6'
    if (Test-Path $modelMapFile) {
        try {
            $map = Get-Content $modelMapFile -Raw | ConvertFrom-Json
            if ($map.tasks.$Task) { $Model = $map.tasks.$Task }
            elseif ($map.default) { $Model = $map.default }
        } catch {
            "[$(Get-Date -Format o)] WARN: model-map.json unreadable, using default" | Out-File $log -Append -Encoding utf8
        }
    }
}
# --- Banned model guard (Glen's standing rules: no 4.7, no 4.8, no bare opus alias) ---
$banned = @('claude-opus-4-7', 'claude-opus-4-8')
foreach ($b in $banned) {
    if ($Model.ToLowerInvariant().StartsWith($b)) {
        "[$(Get-Date -Format o)] FATAL: model '$Model' is banned by policy" | Out-File $log -Append -Encoding utf8
        exit 1
    }
}
if ($Model -eq 'opus') {
    "[$(Get-Date -Format o)] FATAL: bare 'opus' alias is banned by policy" | Out-File $log -Append -Encoding utf8
    exit 1
}
if ($Model -notmatch '^[a-zA-Z0-9.\-\[\]]+$') {
    "[$(Get-Date -Format o)] FATAL: model '$Model' contains disallowed characters" | Out-File $log -Append -Encoding utf8
    exit 1
}
if ($DryRun) {
    Write-Output "DRYRUN task=$Task model=$Model prompt=$promptFile"
    exit 0
}

& claude -p $prompt --model $Model --permission-mode bypassPermissions 2>&1 |
    Out-File $log -Append -Encoding utf8
$code = $LASTEXITCODE

if ($code -ne 0) {
    # Retry once for transient failures
    "[$(Get-Date -Format o)] WARN: task '$Task' failed (exit $code), retrying once..." | Out-File $log -Append -Encoding utf8
    Start-Sleep -Seconds 10
    & claude -p $prompt --model $Model --permission-mode bypassPermissions 2>&1 |
        Out-File $log -Append -Encoding utf8
    $code = $LASTEXITCODE

    if ($code -ne 0) {
        "[$(Get-Date -Format o)] ERROR: task '$Task' failed after retry (exit $code)" | Out-File $log -Append -Encoding utf8

        # Create incident action via the internal API
        try {
            $incidentBody = @{
                source_system = 'cadence'
                source_id = $Task
                action_type = 'incident'
                title = "Cadence task '$Task' failed after retry (exit $code)"
                description = "Check log: $log"
                risk_class = 'medium'
                confidence = 'high'
                idempotency_key = "cadence-failure:${Task}:$(Get-Date -Format 'yyyy-MM-dd')"
                created_by_routine = 'run-cadence'
            } | ConvertTo-Json -Compress
            $headers = @{
                'Content-Type' = 'application/json'
                'x-nbi-internal-token' = $env:AIOS_INTERNAL_TOKEN
            }
            if ($env:AIOS_INTERNAL_TOKEN) {
                Invoke-RestMethod -Uri 'http://localhost:8888/api/internal/aios/actions' -Method POST -Headers $headers -Body $incidentBody -ErrorAction SilentlyContinue | Out-Null
                "[$(Get-Date -Format o)] Incident action created for failed task '$Task'" | Out-File $log -Append -Encoding utf8
            }
        } catch {
            "[$(Get-Date -Format o)] WARN: could not create incident action: $($_.Exception.Message)" | Out-File $log -Append -Encoding utf8
        }
    } else {
        "[$(Get-Date -Format o)] OK: task '$Task' succeeded on retry" | Out-File $log -Append -Encoding utf8
    }
}

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
