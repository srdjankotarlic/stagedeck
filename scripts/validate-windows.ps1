$ErrorActionPreference = 'Stop'
$native = Join-Path $PSScriptRoot '..\src\native'
foreach ($name in @('powerpoint.ps1', 'windows-display.ps1', 'powerpoint-lifecycle.ps1')) {
  $parseErrors = $null
  $tokens = $null
  [System.Management.Automation.Language.Parser]::ParseFile((Join-Path $native $name), [ref]$tokens, [ref]$parseErrors) | Out-Null
  if ($parseErrors.Count -gt 0) { throw ($parseErrors | Out-String) }
  Write-Host "PASS PowerShell syntax: $name"
}
. (Join-Path $native 'windows-display.ps1')
[PptDisplay]::DpiAware()
Write-Host 'PASS Win32 C# compilation and DPI initialization'
