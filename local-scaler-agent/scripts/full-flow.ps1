$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root "_flow.log"
$env:Path = [Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [Environment]::GetEnvironmentVariable("Path","User")
"START" | Out-File $out -Encoding ascii

# Where could a key have been pasted? (file names only; values are never printed)
Get-ChildItem $root -Recurse -File -Include *.env,.env*,*.txt,*.md,*.json,*.js,*.jsx -ErrorAction SilentlyContinue |
  Where-Object { $_.FullName -notmatch "node_modules|package-lock|\\dist\\" } |
  ForEach-Object { if (Select-String -Path $_.FullName -Pattern "sk-ant-|sk-proj-" -Quiet) { "KEY-LIKE TEXT IN: " + $_.FullName.Substring($root.Length) | Out-File $out -Append -Encoding ascii } }

$p = Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev" -WorkingDirectory $root -PassThru -WindowStyle Hidden -RedirectStandardOutput (Join-Path $root "_flow-dev.log") -RedirectStandardError (Join-Path $root "_flow-dev.err")
Start-Sleep -Seconds 12
try {
  $h = Invoke-RestMethod http://localhost:3000/api/health -TimeoutSec 20
  "HEALTH via 3000: " + ($h | ConvertTo-Json -Compress -Depth 5) | Out-File $out -Append -Encoding ascii
  $b = @{ topic = "Agentic AI failure modes"; platform = "LinkedIn"; goals = "Increase brand awareness" } | ConvertTo-Json
  $r = Invoke-WebRequest -UseBasicParsing -Method Post -Uri http://localhost:3000/api/generate-post -ContentType "application/json" -Body $b -TimeoutSec 120
  $j = $r.Content | ConvertFrom-Json
  "POST: status=$($r.StatusCode) source=$($r.Headers['X-Content-Source']) len=$($j.content_package.post_copy.Length)" | Out-File $out -Append -Encoding ascii
  $ib = @{ topic = $j.content_package.topic; platform = $j.content_package.platform; goals = "Increase brand awareness"; visualStyle = "dark"; postCopy = $j.content_package.post_copy; basePrompt = $j.content_package.visual_asset_concept.ai_image_prompt; palette = $j.content_package.visual_asset_concept.color_palette; mode = "auto" } | ConvertTo-Json
  $ir = Invoke-WebRequest -UseBasicParsing -Method Post -Uri http://localhost:3000/api/generate-image -ContentType "application/json; charset=utf-8" -Body ([Text.Encoding]::UTF8.GetBytes($ib)) -TimeoutSec 180
  $ij = $ir.Content | ConvertFrom-Json
  "IMAGE: status=$($ir.StatusCode) source=$($ij.source) format=$($ij.format) points=$($ij.key_points -join '|') warning=$($ij.warning)" | Out-File $out -Append -Encoding ascii
} catch {
  $detail = ""
  try { $detail = (New-Object IO.StreamReader($_.Exception.Response.GetResponseStream())).ReadToEnd() } catch {}
  "ERROR: $($_.Exception.Message) $detail" | Out-File $out -Append -Encoding ascii
}
& taskkill.exe /PID $p.Id /T /F | Out-Null
"DONE" | Out-File $out -Append -Encoding ascii
