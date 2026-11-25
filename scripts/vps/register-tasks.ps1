# Registers the catalog sync tasks on the Windows VPS (run as Administrator).
# - renderz-catalog-head: Wednesday 19:30 and 21:30 (UTC+7), right after RenderZ's weekly release
# - renderz-catalog-full: daily at midnight (00:00, UTC+7)
$bash = 'C:\Program Files\Git\bin\bash.exe'
$script = '/c/opt/renderz/bin/catalog-sync.sh'
$principal = New-ScheduledTaskPrincipal -UserId Administrator -LogonType S4U -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 6)

$head = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Wednesday -At '19:30'
$head.Repetition = (New-ScheduledTaskTrigger -Once -At '19:30' `
  -RepetitionInterval (New-TimeSpan -Hours 2) `
  -RepetitionDuration (New-TimeSpan -Hours 3)).Repetition
Register-ScheduledTask -TaskName renderz-catalog-head -Force `
  -Description 'RenderZ catalog: Wednesday evening release check (19:30 & 21:30)' `
  -Action (New-ScheduledTaskAction -Execute $bash -Argument "-lc `"$script head`"") `
  -Trigger $head -Principal $principal -Settings $settings | Out-Null

$full = New-ScheduledTaskTrigger -Daily -At '00:00'
Register-ScheduledTask -TaskName renderz-catalog-full -Force `
  -Description 'RenderZ catalog: full sync, daily at midnight' `
  -Action (New-ScheduledTaskAction -Execute $bash -Argument "-lc `"$script full`"") `
  -Trigger $full -Principal $principal -Settings $settings | Out-Null

if (Get-ScheduledTask renderz-daily-catalog -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask renderz-daily-catalog -Confirm:$false
}

Get-ScheduledTask renderz-catalog-* | ForEach-Object {
  $info = $_ | Get-ScheduledTaskInfo
  '{0}  next={1}  args={2}' -f $_.TaskName, $info.NextRunTime, $_.Actions[0].Arguments
}
