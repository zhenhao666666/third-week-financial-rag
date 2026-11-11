$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$config = Get-Content (Join-Path $root 'config\companies.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$dest = Join-Path $root 'data\reports'
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$headers = @{ 'User-Agent' = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Financial-RAG-Student-Project/1.0' }
foreach ($item in $config) {
  $target = Join-Path $dest $item.reportFile
  if (Test-Path $target -PathType Leaf) {
    if ((Get-Item $target).Length -gt 10000) {
      Write-Host "skip $($item.name)"
      continue
    }
  }
  Write-Host "download $($item.name) <- $($item.reportUrl)"
  Invoke-WebRequest -Uri $item.reportUrl -Headers $headers -OutFile $target
  if ((Get-Item $target).Length -lt 10000) { throw "下载文件异常：$target" }
}
Write-Host "完成：$($config.Count) 份财报已保存到 data/reports"
