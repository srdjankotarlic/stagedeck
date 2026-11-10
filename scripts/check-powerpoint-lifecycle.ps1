$ErrorActionPreference='Stop'
. (Join-Path $PSScriptRoot '..\src\native\powerpoint-lifecycle.ps1')
function New-OfficeFixture([int]$documents,[int]$protected) {
  $fixture=[pscustomobject]@{Presentations=[pscustomobject]@{Count=$documents};ProtectedViewWindows=[pscustomobject]@{Count=$protected};QuitCount=0}
  $fixture|Add-Member -MemberType ScriptMethod -Name Quit -Value {$this.QuitCount++}
  return $fixture
}
$empty=New-OfficeFixture 0 0
if(-not (Close-EmptyPowerPoint $empty) -or $empty.QuitCount -ne 1){throw 'Empty Office editor was not closed.'}
$other=New-OfficeFixture 1 0
if((Close-EmptyPowerPoint $other) -or $other.QuitCount -ne 0){throw 'An unrelated document would be closed.'}
$protected=New-OfficeFixture 0 1
if((Close-EmptyPowerPoint $protected) -or $protected.QuitCount -ne 0){throw 'A Protected View document would be closed.'}
$failed=New-OfficeFixture 0 0
$failed|Add-Member -MemberType ScriptMethod -Name Quit -Value {throw 'Office rejected shutdown'} -Force
$reported=$false
try{Close-EmptyPowerPoint $failed|Out-Null}catch{$reported=$true}
if(-not $reported){throw 'Rejected Office shutdown was incorrectly reported as success.'}
Write-Host 'PASS empty editor closes, unrelated and Protected View documents survive, failed Quit is reported'
