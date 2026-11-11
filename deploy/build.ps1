# 生成可上传到腾讯云 COS / EdgeOne 的静态站点包（输出到项目根目录 _site/）
$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$out = Join-Path $root "_site"
if ((Split-Path -Leaf $out) -ne "_site") { throw "输出目录异常：$out" }

if (Test-Path -LiteralPath $out) { Remove-Item -LiteralPath $out -Recurse -Force }
New-Item -ItemType Directory -Path $out | Out-Null

# 只复制 git 跟踪的站点文件，保证与 GitHub Actions 构建一致
$tracked = & git -C $root ls-files
$siteFiles = $tracked | Where-Object {
  $_ -eq "index.html" -or $_ -eq "styles.css" -or $_ -match '^[^/]+\.js$' -or $_ -match '^assets/'
}
foreach ($rel in $siteFiles) {
  $src = Join-Path $root $rel
  if (-not (Test-Path -LiteralPath $src)) { continue }
  $dest = Join-Path $out $rel
  $destDir = Split-Path -Parent $dest
  if (-not (Test-Path -LiteralPath $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
  Copy-Item -LiteralPath $src -Destination $dest
}

try { $version = (& git -C $root rev-parse --short HEAD).Trim() } catch { $version = "" }
if (-not $version) { $version = Get-Date -Format "yyyyMMddHHmmss" }

$indexPath = Join-Path $out "index.html"
$html = Get-Content -LiteralPath $indexPath -Raw
$html = $html -replace '\.js"', ('.js?v=' + $version + '"') -replace '\.css"', ('.css?v=' + $version + '"')
Set-Content -LiteralPath $indexPath -Value $html -NoNewline -Encoding UTF8

$size = [math]::Round(((Get-ChildItem -LiteralPath $out -Recurse -File | Measure-Object -Property Length -Sum).Sum / 1MB), 1)
Write-Host "已生成：$out"
Write-Host "版本：$version，体积：$size MB"
Write-Host "把 _site 里的内容整体上传到 COS 桶根目录即可。"
