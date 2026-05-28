# DARS eEvidence — one-shot backup to GitHub.
#
# Stages everything (respecting .gitignore), commits with a message you
# supply, and pushes to `origin main`. Shows status + confirms before
# committing so a stray file can't sneak in.
#
# Usage
# ─────
#   .\scripts\backup.ps1 "short message describing what changed"
#
# If you omit the message you'll be prompted for one. Empty messages are
# rejected (git would reject them anyway).
#
# Examples
# ────────
#   .\scripts\backup.ps1 "wire EscalationNotesCard compose area"
#   .\scripts\backup.ps1            # then type the message at the prompt

[CmdletBinding()]
param(
    [Parameter(Position = 0)]
    [string]$Message,

    # Pass -SkipConfirm to skip the y/N prompt (useful for quick re-runs
    # after a small edit you already know is safe).
    [switch]$SkipConfirm
)

$ErrorActionPreference = "Stop"

# Always run relative to the repo root, regardless of where the script
# was invoked from.
$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

Write-Host ""
Write-Host "── DARS eEvidence backup ──────────────────────────────" -ForegroundColor Cyan
Write-Host "Repo: $repoRoot"
Write-Host ""

# 1. Sanity-check that we are inside a git repo.
try {
    git rev-parse --is-inside-work-tree 2>$null | Out-Null
} catch {
    Write-Host "ERROR: not a git repository. Run 'git init' first." -ForegroundColor Red
    exit 1
}

# 2. Sanity-check that `origin` is configured.
$origin = (git remote get-url origin 2>$null)
if (-not $origin) {
    Write-Host "ERROR: no 'origin' remote configured. Run:" -ForegroundColor Red
    Write-Host "  git remote add origin https://github.com/<user>/<repo>.git"
    exit 1
}
Write-Host "Origin: $origin"

# 3. Show what's about to be staged.
Write-Host ""
Write-Host "── Working tree status ─────────────────────────────────" -ForegroundColor Cyan
$status = git status --short
if (-not $status) {
    Write-Host "Nothing to commit — working tree clean." -ForegroundColor Yellow
    # Still attempt a push in case there are local commits ahead of origin.
    $ahead = git rev-list --count "@{u}..HEAD" 2>$null
    if ($ahead -and [int]$ahead -gt 0) {
        Write-Host ""
        Write-Host "Local has $ahead unpushed commit(s). Pushing…" -ForegroundColor Cyan
        git push
        exit $LASTEXITCODE
    }
    exit 0
}
$status | ForEach-Object { Write-Host "  $_" }

# 4. Get the commit message (param > prompt). Reject empty.
if (-not $Message) {
    Write-Host ""
    $Message = Read-Host "Commit message"
}
if (-not $Message.Trim()) {
    Write-Host "ERROR: commit message cannot be empty." -ForegroundColor Red
    exit 1
}

# 5. Confirm before committing (unless -SkipConfirm).
if (-not $SkipConfirm) {
    Write-Host ""
    $reply = Read-Host "Stage all changes above, commit, and push? [y/N]"
    if ($reply -notmatch '^(y|yes)$') {
        Write-Host "Cancelled — no changes staged." -ForegroundColor Yellow
        exit 0
    }
}

# 6. Stage, commit, push.
Write-Host ""
Write-Host "── Staging ─────────────────────────────────────────────" -ForegroundColor Cyan
git add .
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "── Committing ──────────────────────────────────────────" -ForegroundColor Cyan
git commit -m $Message
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

Write-Host "── Pushing ─────────────────────────────────────────────" -ForegroundColor Cyan
git push
if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Push failed. If this is an SSO authorization error, run:" -ForegroundColor Red
    Write-Host "  gh auth refresh -h github.com -s repo"
    Write-Host "…then re-run this script."
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "✓ Backup complete." -ForegroundColor Green
