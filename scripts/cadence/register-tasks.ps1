# register-tasks.ps1 — registers the NBI local cadence tasks in Windows Task Scheduler.
# Idempotent: re-running replaces existing registrations.
# Tasks run as the logged-on user (interactive token). If the machine is off or
# Glen is logged out at trigger time, StartWhenAvailable runs the task at next logon.

$runner = 'D:\OneDrive\Claude_code\NBIAI_TEAM\scripts\cadence\run-cadence.ps1'
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 2)

function Register-Cadence {
    param([string]$Name, [string]$Task, $Trigger)
    $action = New-ScheduledTaskAction -Execute 'powershell.exe' `
        -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$runner`" -Task $Task"
    $principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Highest
    try { Unregister-ScheduledTask -TaskName $Name -Confirm:$false -ErrorAction Stop } catch {}
    Register-ScheduledTask -TaskName $Name -Action $action -Trigger $Trigger -Settings $settings -Principal $principal | Out-Null
    Write-Output "registered: $Name (runs whether logged on or not)"
}

$weekdays = 'Monday','Tuesday','Wednesday','Thursday','Friday'

Register-Cadence -Name 'NBI Cadence - morning-brief' -Task 'morning-brief' `
    -Trigger (New-ScheduledTaskTrigger -Weekly -DaysOfWeek $weekdays -At 07:30)

Register-Cadence -Name 'NBI Cadence - intel-research' -Task 'intel-research' `
    -Trigger (New-ScheduledTaskTrigger -Weekly -DaysOfWeek $weekdays -At 12:30)

Register-Cadence -Name 'NBI Cadence - intel-ingest' -Task 'intel-ingest' `
    -Trigger (New-ScheduledTaskTrigger -Daily -At 19:00)

Register-Cadence -Name 'NBI Cadence - recompile-banks' -Task 'recompile-banks' `
    -Trigger (New-ScheduledTaskTrigger -Daily -At 21:30)

Register-Cadence -Name 'NBI Cadence - system-audit' -Task 'system-audit' `
    -Trigger (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 08:30)

Register-Cadence -Name 'NBI Cadence - brain-freshness' -Task 'brain-freshness' `
    -Trigger (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Wednesday -At 08:30)

# Harness improvement — weekly Monday 09:00 (after system audit at 08:30)
Register-Cadence -Name 'NBI Cadence - harness-improvement' -Task 'harness-improvement' `
    -Trigger (New-ScheduledTaskTrigger -Weekly -DaysOfWeek Monday -At 09:00)

# Monthly trigger: schtasks for the trigger, then re-register with Register-ScheduledTask
# to get the same S4U principal as all other cadence tasks.
$monthlyName = 'NBI Cadence - financial-reconciliation'
schtasks /delete /tn $monthlyName /f 2>$null | Out-Null
schtasks --% /create /tn "NBI Cadence - financial-reconciliation" /sc MONTHLY /d 1 /st 09:00 /rl HIGHEST /tr "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File \"D:\OneDrive\Claude_code\NBIAI_TEAM\scripts\cadence\run-cadence.ps1\" -Task financial-reconciliation"
# Upgrade to S4U principal (schtasks cannot set S4U directly)
try {
    $existingTask = Get-ScheduledTask -TaskName $monthlyName -ErrorAction Stop
    $monthlyPrincipal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType S4U -RunLevel Highest
    Set-ScheduledTask -TaskName $monthlyName -Principal $monthlyPrincipal | Out-Null
    Write-Output "registered: $monthlyName (runs whether logged on or not)"
} catch {
    Write-Output "registered: $monthlyName (S4U upgrade failed: $($_.Exception.Message) -- will run as interactive)"
}

Write-Output "`nAll cadence tasks:"
Get-ScheduledTask -TaskName 'NBI Cadence*' | Select-Object TaskName, State | Format-Table -AutoSize
