# Starts the API, calls the health + generate endpoints, then stops the API.
$ErrorActionPreference = "Continue"
$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')
$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root "smoke-test.log"
"" | Out-File $out -Encoding utf8

$proc = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory (Join-Path $root "server") -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 3
try {
  "HEALTH: " + (Invoke-RestMethod http://localhost:5000/api/health | ConvertTo-Json -Compress) | Out-File $out -Append -Encoding utf8
  $body = @{ topic = "System design basics: URL shortener"; platform = "LinkedIn"; goals = "Drive masterclass sign-ups" } | ConvertTo-Json
  $resp = Invoke-WebRequest -UseBasicParsing -Method Post -Uri http://localhost:5000/api/generate-post -ContentType "application/json" -Body $body
  $r = $resp.Content | ConvertFrom-Json
  "SOURCE_HEADER: " + $resp.Headers["X-Content-Source"] | Out-File $out -Append -Encoding utf8
  "TOP_KEYS: " + (($r.PSObject.Properties.Name) -join ",") | Out-File $out -Append -Encoding utf8
  "SETUP_KEYS: " + (($r.setup_instructions.PSObject.Properties.Name) -join ",") | Out-File $out -Append -Encoding utf8
  "PACKAGE_KEYS: " + (($r.content_package.PSObject.Properties.Name) -join ",") | Out-File $out -Append -Encoding utf8
  "VISUAL_KEYS: " + (($r.content_package.visual_asset_concept.PSObject.Properties.Name) -join ",") | Out-File $out -Append -Encoding utf8
  "HASHTAGS: " + ($r.content_package.hashtags -join " ") | Out-File $out -Append -Encoding utf8
  try {
    Invoke-RestMethod -Method Post -Uri http://localhost:5000/api/generate-post -ContentType "application/json" -Body "{}" | Out-Null
  } catch {
    "EMPTY_TOPIC_STATUS: " + [int]$_.Exception.Response.StatusCode | Out-File $out -Append -Encoding utf8
  }
} catch {
  "ERROR: " + $_.Exception.Message | Out-File $out -Append -Encoding utf8
} finally {
  Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
  "FINISHED" | Out-File $out -Append -Encoding utf8
}
