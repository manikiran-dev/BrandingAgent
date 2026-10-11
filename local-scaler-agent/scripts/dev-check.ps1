# Starts `npm run dev`, checks both ports, records output, then stops everything.
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root "dev-check.log"
$devOut = Join-Path $root "dev-output.log"
"" | Out-File $out -Encoding utf8

"EXEC_POLICY: " + ((Get-ExecutionPolicy -List | ForEach-Object { "$($_.Scope)=$($_.ExecutionPolicy)" }) -join "; ") | Out-File $out -Append -Encoding utf8
"NODE: " + (& node -v 2>&1) | Out-File $out -Append -Encoding utf8
"NPM.CMD: " + (& npm.cmd -v 2>&1) | Out-File $out -Append -Encoding utf8
try { "NPM.PS1: " + (& npm -v 2>&1) | Out-File $out -Append -Encoding utf8 } catch { "NPM.PS1 ERROR: " + $_.Exception.Message | Out-File $out -Append -Encoding utf8 }

$p = Start-Process -FilePath "cmd.exe" -ArgumentList "/c npm.cmd run dev > `"$devOut`" 2>&1" -WorkingDirectory $root -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 15

foreach ($url in @("http://localhost:5000/api/health", "http://localhost:3000/", "http://localhost:3000/api/health")) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 20
    "OK $url -> $($r.StatusCode)" | Out-File $out -Append -Encoding utf8
  } catch {
    "FAIL $url -> $($_.Exception.Message)" | Out-File $out -Append -Encoding utf8
  }
}

taskkill /PID $p.Id /T /F | Out-Null
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match "local-scaler-agent" } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
"FINISHED" | Out-File $out -Append -Encoding utf8
