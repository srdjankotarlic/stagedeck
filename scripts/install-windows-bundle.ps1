param([string]$StageDeckAppData=$env:APPDATA,[switch]$NoPause)
$ErrorActionPreference='Stop'
$expected='0.5.7'
$identity=[Security.Principal.WindowsIdentity]::GetCurrent()
$principal=New-Object Security.Principal.WindowsPrincipal($identity)
if(-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)){
  $arguments='-NoProfile -ExecutionPolicy Bypass -File "'+$PSCommandPath+'" -StageDeckAppData "'+$StageDeckAppData+'"'
  if($NoPause){$arguments+=' -NoPause'}
  $style=if($NoPause){'Hidden'}else{'Normal'}
  $elevated=Start-Process -FilePath (Join-Path $env:SystemRoot 'System32\WindowsPowerShell\v1.0\powershell.exe') -ArgumentList $arguments -Verb RunAs -WindowStyle $style -Wait -PassThru
  exit $elevated.ExitCode
}
try {
  Write-Host 'StageDeck 0.5.7 - instalacija aplikacije i Windows dodatka'
  $setup=Join-Path $PSScriptRoot 'StageDeck-Setup.exe'
  $archive=Join-Path $PSScriptRoot 'Elgato\com.stagedeck.presentations.streamDeckPlugin'
  if(-not (Test-Path -LiteralPath $setup) -or -not (Test-Path -LiteralPath $archive)){throw 'Raspakuj kompletan StageDeck Windows folder pre pokretanja.'}
  $backup=Join-Path $PSScriptRoot ('Backup\'+(Get-Date -Format 'yyyyMMdd-HHmmss'))
  New-Item -ItemType Directory -Path $backup -Force|Out-Null
  $library=Join-Path $StageDeckAppData 'StageDeck\library.json'
  if(Test-Path -LiteralPath $library){Copy-Item -LiteralPath $library -Destination (Join-Path $backup 'library.json')}
  $plugin=Join-Path $StageDeckAppData 'Elgato\StreamDeck\Plugins\com.stagedeck.presentations.sdPlugin'
  if(Test-Path -LiteralPath $plugin){Copy-Item -LiteralPath $plugin -Destination (Join-Path $backup 'com.stagedeck.presentations.sdPlugin') -Recurse}
  Write-Host 'Zatvaram StageDeck i Stream Deck...'
  Get-Process StageDeck -ErrorAction SilentlyContinue | ForEach-Object {$_.CloseMainWindow()|Out-Null}
  $deadline=[DateTime]::UtcNow.AddSeconds(15)
  while((Get-Process StageDeck -ErrorAction SilentlyContinue) -and [DateTime]::UtcNow -lt $deadline){Start-Sleep -Milliseconds 250}
  Get-Process StageDeck,StreamDeck,StageDeckPlugin -ErrorAction SilentlyContinue | Stop-Process -Force
  Start-Sleep -Milliseconds 700
  $programFiles=if($env:ProgramW6432){$env:ProgramW6432}else{$env:ProgramFiles}
  $installRoot=Join-Path $programFiles 'StageDeck'
  Write-Host 'Instaliram StageDeck...'
  $installed=Start-Process -FilePath $setup -ArgumentList '/S','/allusers',('/D='+$installRoot) -WindowStyle Hidden -Wait -PassThru
  if($installed.ExitCode -ne 0){throw ('Installer je vratio kod '+$installed.ExitCode)}
  $executable=Join-Path $installRoot 'StageDeck.exe'
  $version=(Get-Item -LiteralPath $executable).VersionInfo.ProductVersion
  if($version -ne ($expected+'.0')){throw ('Ocekivana verzija '+$expected+', pronadjena '+$version)}
  Add-Type -AssemblyName System.IO.Compression.FileSystem
  $temporary=Join-Path ([IO.Path]::GetTempPath()) ('StageDeck-plugin-'+[guid]::NewGuid().ToString('N'))
  [IO.Compression.ZipFile]::ExtractToDirectory($archive,$temporary)
  $source=Join-Path $temporary 'com.stagedeck.presentations.sdPlugin'
  $manifest=Get-Content -LiteralPath (Join-Path $source 'manifest.json') -Raw|ConvertFrom-Json
  if($manifest.Version -ne ($expected+'.0') -or $manifest.CodePath -ne 'windows/StageDeckPlugin.exe'){throw 'Pogresan Windows dodatak u paketu.'}
  Write-Host 'Instaliram samostalni Windows dodatak; postojeci profili ostaju sacuvani...'
  New-Item -ItemType Directory -Path $plugin -Force|Out-Null
  Get-ChildItem -LiteralPath $source|ForEach-Object {Copy-Item -LiteralPath $_.FullName -Destination $plugin -Recurse -Force}
  $sourceHash=(Get-FileHash -LiteralPath (Join-Path $source 'windows\StageDeckPlugin.exe')).Hash
  $installedHash=(Get-FileHash -LiteralPath (Join-Path $plugin 'windows\StageDeckPlugin.exe')).Hash
  if($sourceHash -ne $installedHash){throw 'Dodatak nije zamenjen. Zatvori Stream Deck potpuno i ponovi.'}
  @{time=[DateTime]::UtcNow.ToString('o');appVersion=$version;appPath=$executable;pluginVersion=$manifest.Version;pluginHash=$installedHash;pluginPath=$plugin;backup=$backup;profilesPreserved=$true}|ConvertTo-Json|Set-Content -LiteralPath (Join-Path $PSScriptRoot 'Instalacija-izvestaj.json') -Encoding UTF8
  Write-Host 'GOTOVO: StageDeck i dodatak su 0.5.7, verzije i fajlovi su provereni.' -ForegroundColor Green
  Write-Host 'Zatvori ovaj prozor. Pokreni StageDeck i Stream Deck preko njihovih ikonica (u uobicajenom korisnickom rezimu).'
  Write-Host 'U Stream Decku izaberi StageDeck XL profil. Ako se ne ponudi automatski, uvezi ga iz foldera Elgato.'
  if(-not $NoPause){Read-Host 'Enter za kraj'|Out-Null}
} catch {
  Write-Host ('GRESKA: '+$_.Exception.Message) -ForegroundColor Red
  if(-not $NoPause){Read-Host 'Enter za kraj'|Out-Null}
  exit 1
}
