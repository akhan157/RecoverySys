param(
    [string]$ExePath,
    [string]$OutputPath
)

$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path

if ([string]::IsNullOrWhiteSpace($ExePath)) {
    $ExePath = Join-Path $projectRoot 'src-tauri\target\release\RecoverySys.exe'
}
else {
    $ExePath = [IO.Path]::GetFullPath($ExePath, $projectRoot)
}

if ([string]::IsNullOrWhiteSpace($OutputPath)) {
    $OutputPath = Join-Path $projectRoot 'RecoverySys-Portable.zip'
}
else {
    $OutputPath = [IO.Path]::GetFullPath($OutputPath, $projectRoot)
}

if (-not (Test-Path -LiteralPath $ExePath -PathType Leaf)) {
    throw "Portable executable not found: $ExePath. Run 'npm run tauri:build' first."
}

$stage = Join-Path ([IO.Path]::GetTempPath()) ("RecoverySys-Portable-" + [Guid]::NewGuid().ToString('N'))
try {
    New-Item -ItemType Directory -Path $stage | Out-Null
    Copy-Item -LiteralPath $ExePath -Destination (Join-Path $stage 'RecoverySys.exe')
    @'
RecoverySys Portable for Windows

Extract this ZIP before running RecoverySys.exe. It is portable: no installer,
installation, registry shortcut, or administrator access is required.

Windows system requirement: Microsoft Edge WebView2 Evergreen Runtime must be
installed separately. It is not bundled with RecoverySys. Install it from
https://developer.microsoft.com/microsoft-edge/webview2/ if it is missing.

The application stores local data independently under %LOCALAPPDATA%.
Moving or deleting the extracted application folder does not move that data.
'@ | Set-Content -LiteralPath (Join-Path $stage 'README.txt') -Encoding UTF8

    $outputDirectory = Split-Path -Parent $OutputPath
    if (-not (Test-Path -LiteralPath $outputDirectory)) {
        New-Item -ItemType Directory -Path $outputDirectory -Force | Out-Null
    }
    if (Test-Path -LiteralPath $OutputPath) {
        Remove-Item -LiteralPath $OutputPath -Force
    }
    Compress-Archive -Path (Join-Path $stage '*') -DestinationPath $OutputPath -CompressionLevel Optimal
    Write-Output "Created $OutputPath"
}
finally {
    if (Test-Path -LiteralPath $stage) {
        Remove-Item -LiteralPath $stage -Recurse -Force
    }
}
