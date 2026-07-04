# fix-opencode-zedra.ps1
# Reinstalls the opencode.exe wrapper after `npm install` overwrites it.
#
# The npm package ships broken shims that call `lildax` directly, bypassing
# the Go wrapper. This script:
#   1. Compiles the Go wrapper (if Go is available) or copies a prebuilt one.
#   2. Renames the npm opencode.exe → opencode-real.exe (if not already).
#   3. Installs the wrapper as opencode.exe.
#   4. Fixes the .ps1 / .cmd shims to call opencode.exe.
#
# Run after every `npm install -g @opencode-ai/cli`.

param([switch]$Force)

$ErrorActionPreference = "Stop"
$npmDir = Join-Path $env:APPDATA "npm"
$wrapperSrc = Join-Path $PSScriptRoot "wrapper"

$opencodeExe = Join-Path $npmDir "opencode.exe"
$realExe = Join-Path $npmDir "opencode-real.exe"
$ps1Shim = Join-Path $npmDir "opencode.ps1"
$cmdShim = Join-Path $npmDir "opencode.cmd"

# Step 1: Ensure opencode-real.exe exists (rename current opencode.exe if it's
# the raw Go wrapper, not our intercepting wrapper).
if (-not (Test-Path $realExe)) {
    if (Test-Path $opencodeExe) {
        # Check if current opencode.exe is already our wrapper (small, ~2.4MB)
        # vs the real Go wrapper (9.1MB).
        $size = (Get-Item $opencodeExe).Length
        if ($size -gt 5000000) {
            Rename-Item $opencodeExe $realExe
            Write-Host "Renamed opencode.exe → opencode-real.exe (size: $size bytes)"
        }
    } else {
        Write-Error "Neither opencode.exe nor opencode-real.exe found in $npmDir"
        exit 1
    }
}

# Step 2: Build the wrapper.
if (Test-Path $wrapperSrc) {
    & go build -trimpath -ldflags="-s -w" -o $opencodeExe $wrapperSrc
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Go build failed"
        exit 1
    }
    Write-Host "Built wrapper → $opencodeExe"
} else {
    Write-Error "Wrapper source not found at $wrapperSrc"
    exit 1
}

# Step 3: Fix shims to call opencode.exe directly.
Set-Content -Path $ps1Shim -Value @'
#!/usr/bin/env pwsh
$basedir = Split-Path $MyInvocation.MyCommand.Definition -Parent
if (-not $env:HOME) { $env:HOME = $env:USERPROFILE }
& "$basedir\opencode.exe" @args
exit $LASTEXITCODE
'@
Set-Content -Path $cmdShim -Value @'
@echo off
if not defined HOME set HOME=%USERPROFILE%
"%~dp0opencode.exe" %*
'@
Write-Host "Fixed shims → opencode.ps1, opencode.cmd"

# Step 4: Verify.
$result = & $opencodeExe session list 2>$null | ConvertFrom-Json
Write-Host "Verification: $($result.Count) sessions returned by opencode.exe"
Write-Host "Done. Zedra agent scan sessions opencode should now work."
