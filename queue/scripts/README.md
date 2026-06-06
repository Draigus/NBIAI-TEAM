# Queue Trigger Scripts

PowerShell scripts for managing the file-based task queue between the NBIAI App and Claude Desktop.

## Scripts

### process-inbox.ps1

Picks the oldest task from `queue/inbox/`, moves it to `queue/active/`, and copies the session prompt to the clipboard for pasting into Claude Desktop.

```powershell
powershell -ExecutionPolicy Bypass -File process-inbox.ps1
```

**What it does:**
1. Finds the oldest `.json` file in `queue/inbox/`
2. Moves it to `queue/active/` and updates the status
3. Copies the full session prompt to the clipboard
4. Launches Claude Desktop if not already running

**After running:** Paste the clipboard content into a new Claude Desktop conversation.

### post-results.ps1

Posts task results back to the NBIAI App API after a Claude Desktop session completes.

```powershell
powershell -ExecutionPolicy Bypass -File post-results.ps1 -TaskId "<uuid>" -Status "done" -OutputFile ".\output.txt"
```

**Parameters:**
- `-TaskId` -- The task UUID
- `-Status` -- `done` or `failed`
- `-OutputFile` -- Path to a text file containing the session output
- `-Notes` -- Optional notes about the session

**Prerequisites:**
- Set `NBIAI_AUTH_TOKEN` environment variable with a valid JWT token
- The API must be running on `localhost:3001` (or set `NBIAI_APP_URL`)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NBIAI_REPO_PATH` | `D:\OneDrive\Claude_code\NBIAI_TEAM` | Path to the NBIAI Team repository |
| `NBIAI_APP_URL` | `http://localhost:3001` | Base URL of the NBIAI App API |
| `NBIAI_AUTH_TOKEN` | (none) | JWT access token for API authentication |

## Windows Task Scheduler

To automate queue processing, create a scheduled task:

1. Open Task Scheduler
2. Create Basic Task: "NBIAI Queue Processor"
3. Trigger: every 15 minutes (or as desired)
4. Action: Start a program
   - Program: `powershell.exe`
   - Arguments: `-ExecutionPolicy Bypass -File "D:\OneDrive\Claude_code\NBIAI_TEAM\queue\scripts\process-inbox.ps1"`
5. Conditions: only run when logged in (needs clipboard access)
