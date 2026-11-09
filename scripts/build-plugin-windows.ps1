$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot '..\plugin\windows\StageDeckPlugin.cs'
$output = Join-Path $PSScriptRoot '..\plugin\com.stagedeck.presentations.sdPlugin\windows\StageDeckPlugin.exe'
New-Item -ItemType Directory -Force -Path (Split-Path $output) | Out-Null
$compiler = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
& $compiler /nologo /target:winexe /optimize+ /reference:System.Web.Extensions.dll /out:$output $source
if ($LASTEXITCODE -ne 0) { throw 'Windows Stream Deck plugin compilation failed.' }
Write-Host 'Built standalone Windows Elgato plugin: no Node.js runtime required.'
