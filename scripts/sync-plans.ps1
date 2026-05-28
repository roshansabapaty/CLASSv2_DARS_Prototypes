# DARS eEvidence — sync plan files into the repo.
#
# Mirrors C:\Users\lisawu\.claude\plans\*.md into <repo>\docs\plans\.
# After the sync, run `.\scripts\backup.ps1` to commit + push.
#
# Mirror semantics
# ────────────────
#   - New files in the source are copied in.
#   - Files modified in the source overwrite the repo copy.
#   - Files removed from the source are deleted from the repo copy
#     (so the two folders stay in sync). Run with -NoDelete if you
#     want add/update-only behaviour.
#
# Usage
# ─────
#   .\scripts\sync-plans.ps1                       # interactive sync
#   .\scripts\sync-plans.ps1 -SkipConfirm          # no y/N prompt
#   .\scripts\sync-plans.ps1 -NoDelete             # never delete in dest
#   .\scripts\sync-plans.ps1 -Source <path>        # override source folder

[CmdletBinding()]
param(
    [string]$Source = "$env:USERPROFILE\.claude\plans",
    [switch]$SkipConfirm,
    [switch]$NoDelete
)

$ErrorActionPreference = "Stop"

# Anchor everything to the repo root regardless of where the script
# was invoked from.
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot
$dest = Join-Path $repoRoot "docs\plans"

Write-Host ""
Write-Host "── DARS eEvidence plan sync ────────────────────────────" -ForegroundColor Cyan
Write-Host "Source : $Source"
Write-Host "Dest   : $dest"
Write-Host ""

if (-not (Test-Path $Source)) {
    Write-Host "ERROR: source folder not found: $Source" -ForegroundColor Red
    exit 1
}

# Make sure the destination exists (first-time runs).
if (-not (Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest | Out-Null
}

# Enumerate .md files on both sides. Use Sort-Object for stable diff output.
$srcFiles = Get-ChildItem -Path $Source -Filter "*.md" -File | Sort-Object Name
$dstFiles = Get-ChildItem -Path $dest   -Filter "*.md" -File | Sort-Object Name

$srcNames = $srcFiles | Select-Object -ExpandProperty Name
$dstNames = $dstFiles | Select-Object -ExpandProperty Name

# Classify into add / update / unchanged / remove.
$toAdd    = @()
$toUpdate = @()
$unchanged = @()
$toRemove = @()

foreach ($s in $srcFiles) {
    $match = $dstFiles | Where-Object { $_.Name -eq $s.Name } | Select-Object -First 1
    if ($null -eq $match) {
        $toAdd += $s.Name
    } else {
        # Content-equality check: hash compare so timestamp / line-ending
        # drift doesn't trigger a needless overwrite.
        $srcHash = (Get-FileHash -Path $s.FullName     -Algorithm SHA256).Hash
        $dstHash = (Get-FileHash -Path $match.FullName -Algorithm SHA256).Hash
        if ($srcHash -ne $dstHash) {
            $toUpdate += $s.Name
        } else {
            $unchanged += $s.Name
        }
    }
}
foreach ($d in $dstFiles) {
    if ($srcNames -notcontains $d.Name) {
        $toRemove += $d.Name
    }
}

# Summary block — always shown so you can sanity-check before the sync.
Write-Host "── Plan diff ───────────────────────────────────────────" -ForegroundColor Cyan
Write-Host ("  +  add      : {0}" -f $toAdd.Count)    -ForegroundColor Green
Write-Host ("  ~  update   : {0}" -f $toUpdate.Count) -ForegroundColor Yellow
Write-Host ("  =  unchanged: {0}" -f $unchanged.Count)
if ($NoDelete) {
    Write-Host ("  -  remove   : {0} (suppressed by -NoDelete)" -f $toRemove.Count) -ForegroundColor DarkGray
} else {
    Write-Host ("  -  remove   : {0}" -f $toRemove.Count) -ForegroundColor Red
}

if ($toAdd.Count    -gt 0) { Write-Host ""; Write-Host "Add:"    -ForegroundColor Green;  $toAdd    | ForEach-Object { Write-Host "  + $_" -ForegroundColor Green } }
if ($toUpdate.Count -gt 0) { Write-Host ""; Write-Host "Update:" -ForegroundColor Yellow; $toUpdate | ForEach-Object { Write-Host "  ~ $_" -ForegroundColor Yellow } }
if ((-not $NoDelete) -and $toRemove.Count -gt 0) {
    Write-Host ""
    Write-Host "Remove:" -ForegroundColor Red
    $toRemove | ForEach-Object { Write-Host "  - $_" -ForegroundColor Red }
}

# Nothing to do — bail cleanly.
if ($toAdd.Count -eq 0 -and $toUpdate.Count -eq 0 -and ($NoDelete -or $toRemove.Count -eq 0)) {
    Write-Host ""
    Write-Host "✓ Already in sync — no changes." -ForegroundColor Green
    exit 0
}

# Confirm unless -SkipConfirm.
if (-not $SkipConfirm) {
    Write-Host ""
    $reply = Read-Host "Apply these changes to $dest ? [y/N]"
    if ($reply -notmatch '^(y|yes)$') {
        Write-Host "Cancelled — destination unchanged." -ForegroundColor Yellow
        exit 0
    }
}

# Apply: copy adds + updates, delete removals (unless -NoDelete).
Write-Host ""
Write-Host "── Applying ────────────────────────────────────────────" -ForegroundColor Cyan
foreach ($name in $toAdd + $toUpdate) {
    $src = Join-Path $Source $name
    $dst = Join-Path $dest $name
    Copy-Item -Path $src -Destination $dst -Force
    Write-Host "  copied $name"
}
if (-not $NoDelete) {
    foreach ($name in $toRemove) {
        $dst = Join-Path $dest $name
        Remove-Item -Path $dst -Force
        Write-Host "  removed $name"
    }
}

Write-Host ""
Write-Host "✓ Sync complete." -ForegroundColor Green
Write-Host "Next: run .\scripts\backup.ps1 ""<message>"" to commit + push." -ForegroundColor Cyan
