# Registers the catalog sync task on the Windows VPS (run as Administrator).
# One full sync every day at midnight (UTC+7).
$bash = 'C:\Program Files\Git\bin\bash.exe'
$script = '/c/opt/renderz/bin/catalog-sync.sh'
$principal = New-ScheduledTaskPrincipal -UserId Administrator -LogonType S4U -RunLevel Highest
$settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 6)

$full = New-ScheduledTaskTrigger -Daily -At '00:00'
Register-ScheduledTask -TaskName renderz-catalog-full -Force `
  -Description 'RenderZ catalog: full sync, daily at midnight' `
  -Action (New-ScheduledTaskAction -Execute $bash -Argument "-lc `"$script full`"") `
  -Trigger $full -Principal $principal -Settings $settings | Out-Null

foreach ($name in 'renderz-catalog-head', 'renderz-daily-catalog') {
  if (Get-ScheduledTask $name -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask $name -Confirm:$false
  }
}

Get-ScheduledTask renderz-catalog-* | ForEach-Object {
  $info = $_ | Get-ScheduledTaskInfo
  '{0}  next={1}  args={2}' -f $_.TaskName, $info.NextRunTime, $_.Actions[0].Arguments
}
