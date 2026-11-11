# Registers the catalog sync tasks on the Windows VPS (run as Administrator).
# RenderZ adds new players on Wednesday between about 17:00 and 02:00 (UTC+7).
$bash = 'C:\Program Files\Git\bin\bash.exe'
$script = '/c/opt/renderz/bin/catalog-sync.sh'
$principal = New-ScheduledTaskPrincipal -UserId Administrator -LogonType S4U -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 6)

$head = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Wednesday -At 17:00
$head.Repetition = (New-ScheduledTaskTrigger -Once -At 17:00 `
  -RepetitionInterval (New-TimeSpan -Hours 2) `
  -RepetitionDuration (New-TimeSpan -Hours 8 -Minutes 30)).Repetition
Register-ScheduledTask -TaskName renderz-catalog-head -Force `
  -Description 'RenderZ catalog: new players from the sitemap head' `
  -Action (New-ScheduledTaskAction -Execute $bash -Argument "-lc `"$script head`"") `
  -Trigger $head -Principal $principal -Settings $settings | Out-Null

$full = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Thursday -At 03:00
Register-ScheduledTask -TaskName renderz-catalog-full -Force `
  -Description 'RenderZ catalog: full sync' `
  -Action (New-ScheduledTaskAction -Execute $bash -Argument "-lc `"$script full`"") `
  -Trigger $full -Principal $principal -Settings $settings | Out-Null

if (Get-ScheduledTask renderz-daily-catalog -ErrorAction SilentlyContinue) {
  Disable-ScheduledTask renderz-daily-catalog | Out-Null
}

Get-ScheduledTask renderz-catalog-* | ForEach-Object {
  $info = $_ | Get-ScheduledTaskInfo
  '{0}  next={1}  args={2}' -f $_.TaskName, $info.NextRunTime, $_.Actions[0].Arguments
}
