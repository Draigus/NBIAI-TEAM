# process-inbox.ps1
# Scans queue/inbox/ for task JSON files and opens them in Claude Desktop.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File process-inbox.ps1
#
# This script is intended to be run manually or via Windows Task Scheduler.
# It processes ONE task per run (FIFO by file modification time).
#
# Flow:
# 1. Check queue/inbox/ for .json files
# 2. Pick the oldest file (by lastWriteTime)
# 3. Move it to queue/active/
# 4. Copy the session_prompt to clipboard
# 5. Open Claude Desktop (if not already open)
# 6. Log what happened
#
# After the Claude Desktop session completes, Glen posts results back via:
#   POST http://localhost:3001/api/v1/queue/results

$ErrorActionPreference = "Stop"

$RepoPath = $env:NBIAI_REPO_PATH
if (-not $RepoPath) {
    $RepoPath = "D:\OneDrive\Claude_code\NBIAI_TEAM"
}

$InboxDir  = Join-Path $RepoPath "queue\inbox"
$ActiveDir = Join-Path $RepoPath "queue\active"
$LogFile   = Join-Path $RepoPath "queue\scripts\process-inbox.log"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $Message"
    Add-Content -Path $LogFile -Value $line
    Write-Host $line
}

# Ensure directories exist
New-Item -ItemType Directory -Force -Path $ActiveDir | Out-Null

# Find task files in inbox
$taskFiles = Get-ChildItem -Path $InboxDir -Filter "*.json" -File | Sort-Object LastWriteTime

if ($taskFiles.Count -eq 0) {
    Write-Log "No tasks in inbox. Nothing to process."
    exit 0
}

# Pick the oldest task
$taskFile = $taskFiles[0]
$taskData = Get-Content -Path $taskFile.FullName -Raw | ConvertFrom-Json

Write-Log "Processing task: $($taskData.task_id) - $($taskData.title)"
Write-Log "Agent: $($taskData.assigned_to) | Model: $($taskData.model_tier) | Priority: $($taskData.priority)"

# Move to active
$activePath = Join-Path $ActiveDir $taskFile.Name
Move-Item -Path $taskFile.FullName -Destination $activePath -Force
Write-Log "Moved to active: $activePath"

# Update status in file
$taskData.status = "active"
$taskData.claimed_at = (Get-Date -Format "o")
$taskData | ConvertTo-Json -Depth 10 | Set-Content -Path $activePath

# Copy session prompt to clipboard
$taskData.session_prompt | Set-Clipboard
Write-Log "Session prompt copied to clipboard ($($taskData.session_prompt.Length) chars)"

# Try to open Claude Desktop
$claudeDesktop = Get-Process -Name "Claude" -ErrorAction SilentlyContinue
if (-not $claudeDesktop) {
    Write-Log "Claude Desktop not running. Attempting to launch..."
    $claudePath = "$env:LOCALAPPDATA\Programs\claude-desktop\Claude.exe"
    if (Test-Path $claudePath) {
        Start-Process $claudePath
        Write-Log "Claude Desktop launched. Paste the prompt (already on clipboard) to start the session."
    } else {
        Write-Log "WARNING: Claude Desktop not found at $claudePath. Please open it manually."
    }
} else {
    Write-Log "Claude Desktop is already running. Paste the prompt (already on clipboard) into a new conversation."
}

Write-Log "--- Task ready. Paste prompt into Claude Desktop, then POST results to: $($taskData.result_endpoint) ---"
Write-Log ""
