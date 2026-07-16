$ErrorActionPreference = 'Stop'
Remove-Item Env:SSL_CERT_FILE -ErrorAction SilentlyContinue

$owner = 'madidi688-ops'
$repo = 'petpal-ai'
$root = 'd:\vibe coding\petpal-ai'
Set-Location $root

function Write-JsonFile([string]$path, [string]$json) {
  $utf8NoBom = New-Object System.Text.UTF8Encoding $false
  [System.IO.File]::WriteAllText($path, $json, $utf8NoBom)
}

# 1) Bootstrap empty repo with Contents API
$readmePath = Join-Path $root 'README.md'
$readmeB64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($readmePath))
$boot = @{
  message = 'chore: bootstrap repository'
  content = $readmeB64
  branch  = 'main'
} | ConvertTo-Json -Compress
$bootTmp = Join-Path $env:TEMP ("petpal-boot-" + [guid]::NewGuid() + ".json")
Write-JsonFile $bootTmp $boot
Write-Host 'Bootstrapping repo with README via Contents API...'
try {
  & gh api -X PUT "repos/$owner/$repo/contents/README.md" --input $bootTmp | Out-Null
  Write-Host 'Bootstrap OK'
} catch {
  Write-Host "Bootstrap note: $($_.Exception.Message)"
}
Remove-Item $bootTmp -Force -ErrorAction SilentlyContinue

# 2) Create blobs for all tracked files
$files = @(git ls-files)
Write-Host "Creating blobs for $($files.Count) files..."
$treeItems = @()
$n = 0
foreach ($f in $files) {
  $n++
  $full = Join-Path $root $f
  $b64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($full))
  $payload = (@{ content = $b64; encoding = 'base64' } | ConvertTo-Json -Compress)
  $tmp = Join-Path $env:TEMP ("petpal-blob-" + [guid]::NewGuid() + ".json")
  Write-JsonFile $tmp $payload
  $sha = (& gh api -X POST "repos/$owner/$repo/git/blobs" --input $tmp --jq .sha)
  Remove-Item $tmp -Force -ErrorAction SilentlyContinue
  if (-not $sha) { throw "blob failed: $f" }
  $treeItems += @{ path = ($f -replace '\\','/'); mode = '100644'; type = 'blob'; sha = "$sha" }
  if ($n % 20 -eq 0 -or $n -eq $files.Count) { Write-Host "  $n / $($files.Count)" }
}

# 3) Create tree
$treeJson = (@{ tree = $treeItems } | ConvertTo-Json -Depth 8 -Compress)
$treeTmp = Join-Path $env:TEMP ("petpal-tree-" + [guid]::NewGuid() + ".json")
Write-JsonFile $treeTmp $treeJson
$treeSha = (& gh api -X POST "repos/$owner/$repo/git/trees" --input $treeTmp --jq .sha)
Remove-Item $treeTmp -Force
Write-Host "tree=$treeSha"

# 4) Create commit (parent = current main tip if any)
$parent = ''
try { $parent = (& gh api "repos/$owner/$repo/git/ref/heads/main" --jq .object.sha) } catch { $parent = '' }
$commitObj = @{ message = 'feat: initial PetPal AI MVP'; tree = "$treeSha" }
if ($parent) { $commitObj.parents = @("$parent") }
$commitTmp = Join-Path $env:TEMP ("petpal-commit-" + [guid]::NewGuid() + ".json")
Write-JsonFile $commitTmp ($commitObj | ConvertTo-Json -Compress)
$commitSha = (& gh api -X POST "repos/$owner/$repo/git/commits" --input $commitTmp --jq .sha)
Remove-Item $commitTmp -Force
Write-Host "commit=$commitSha"

# 5) Point main to new commit
$updateTmp = Join-Path $env:TEMP ("petpal-refu-" + [guid]::NewGuid() + ".json")
Write-JsonFile $updateTmp ((@{ sha = "$commitSha"; force = $true } | ConvertTo-Json -Compress))
& gh api -X PATCH "repos/$owner/$repo/git/refs/heads/main" --input $updateTmp
Remove-Item $updateTmp -Force

& gh repo view "$owner/$repo" --json url,visibility,isEmpty,defaultBranchRef
Write-Host 'DONE'
