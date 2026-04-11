# post-results.ps1
# Posts task results back to the NBIAI App API after a Claude Desktop session.
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File post-results.ps1 -TaskId <uuid> -Status <done|failed> -OutputFile <path>
#
# Parameters:
#   -TaskId     The task UUID (matches the JSON file in queue/active/)
#   -Status     "done" or "failed"
#   -OutputFile  Path to a text file containing the Claude Desktop output
#   -Notes      Optional notes about the session
#
# Example:
#   .\post-results.ps1 -TaskId "550e8400-e29b-41d4-a716-446655440000" -Status "done" -OutputFile ".\output.txt"

param(
    [Parameter(Mandatory=$true)]
    [string]$TaskId,

    [Parameter(Mandatory=$true)]
    [ValidateSet("done", "failed")]
    [string]$Status,

    [Parameter(Mandatory=$true)]
    [string]$OutputFile,

    [string]$Notes = ""
)

$ErrorActionPreference = "Stop"

$ApiBase = $env:NBIAI_APP_URL
if (-not $ApiBase) {
    $ApiBase = "http://localhost:3001"
}

$RepoPath = $env:NBIAI_REPO_PATH
if (-not $RepoPath) {
    $RepoPath = "D:\OneDrive\Claude_code\NBIAI_TEAM"
}

$LogFile = Join-Path $RepoPath "queue\scripts\post-results.log"

function Write-Log {
    param([string]$Message)
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$timestamp] $Message"
    Add-Content -Path $LogFile -Value $line
    Write-Host $line
}

# Read output file
if (-not (Test-Path $OutputFile)) {
    Write-Log "ERROR: Output file not found: $OutputFile"
    exit 1
}

$output = Get-Content -Path $OutputFile -Raw

Write-Log "Posting results for task $TaskId (status: $Status, output: $($output.Length) chars)"

# Get auth token - read from env or .env file
$token = $env:NBIAI_AUTH_TOKEN
if (-not $token) {
    Write-Log "WARNING: NBIAI_AUTH_TOKEN not set. You need to authenticate first."
    Write-Log "Run: curl -X POST $ApiBase/api/v1/auth/login -H 'Content-Type: application/json' -d '{\"email\":\"glen@nbi.gg\",\"password\":\"your_password\"}'"
    exit 1
}

# Build request body
$body = @{
    taskId = $TaskId
    status = $Status
    output = $output
} | ConvertTo-Json -Depth 5

if ($Notes) {
    $bodyObj = $body | ConvertFrom-Json
    $bodyObj | Add-Member -NotePropertyName "notes" -NotePropertyValue $Notes
    $body = $bodyObj | ConvertTo-Json -Depth 5
}

# POST to API
try {
    $response = Invoke-RestMethod `
        -Uri "$ApiBase/api/v1/queue/results" `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "Authorization" = "Bearer $token"
        } `
        -Body $body

    Write-Log "SUCCESS: Task $TaskId marked as $Status"
    Write-Log "Response: $($response | ConvertTo-Json -Depth 3)"
} catch {
    Write-Log "ERROR: Failed to post results: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Log "Response body: $responseBody"
    }
    exit 1
}
