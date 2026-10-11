$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root "_endpoint.log"
$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
"START" | Out-File $out -Encoding utf8

Push-Location (Join-Path $root "client")
$b = & npm.cmd run build 2>&1 | Out-String
"BUILD_EXIT: $LASTEXITCODE" | Out-File $out -Append -Encoding utf8
($b -split "`n" | Select-Object -Last 8) -join "`n" | Out-File $out -Append -Encoding utf8
Pop-Location

# Start the API with no keys so the offline path is exercised.
$env:ANTHROPIC_API_KEY = ""
$env:GEMINI_API_KEY = ""
$env:OPENROUTER_API_KEY = ""
$env:OPENAI_API_KEY = ""
$p = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory (Join-Path $root "server") -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 3
try {
  $h = Invoke-RestMethod http://127.0.0.1:5000/api/health
  "HEALTH: " + ($h | ConvertTo-Json -Compress -Depth 5) | Out-File $out -Append -Encoding utf8
  $body = @{ topic = "Agentic AI failure modes"; platform = "LinkedIn"; goals = "Awareness"; postCopy = "Intro`n`n- Runaway loops`n- Tool errors`n- Non-idempotent actions`n- Prompt injection`n`n#Scaler" } | ConvertTo-Json
  $r = Invoke-WebRequest -UseBasicParsing -Method Post -Uri http://127.0.0.1:5000/api/generate-image -ContentType "application/json; charset=utf-8" -Body ([Text.Encoding]::UTF8.GetBytes($body))
  $j = $r.Content | ConvertFrom-Json
  "IMAGE: source=$($j.source) format=$($j.format) header=$($r.Headers['X-Image-Source']) points=$($j.key_points -join '|') b64len=$($j.image.Length)" | Out-File $out -Append -Encoding utf8
  try { Invoke-RestMethod -Method Post -Uri http://127.0.0.1:5000/api/generate-image -ContentType "application/json" -Body "{}" | Out-Null }
  catch { "EMPTY_POST_STATUS: " + [int]$_.Exception.Response.StatusCode | Out-File $out -Append -Encoding utf8 }
} catch { "ERROR: $_" | Out-File $out -Append -Encoding utf8 }
Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
"DONE" | Out-File $out -Append -Encoding utf8
