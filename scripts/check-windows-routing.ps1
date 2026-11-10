$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot '..\src\native\windows-display.ps1')
if ([PptDisplay]::RegisterOfficeMessageFilter() -ne 0) { throw 'Office STA message filter registration failed.' }
Add-Type -AssemblyName System.Windows.Forms
$editor = New-Object System.Windows.Forms.Form
$slides = New-Object System.Windows.Forms.Form
$notes = New-Object System.Windows.Forms.Form
try {
  foreach ($window in @($editor,$slides,$notes)) {
    $window.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::None
    $window.AutoScaleMode = [System.Windows.Forms.AutoScaleMode]::None
    $window.Width = 300; $window.Height = 200
  }
  $editor.Text='Office editor fixture'; $editor.Show()
  $root=[long]$editor.Handle
  $before=@([PptDisplay]::Windows($root))
  $slides.Text='Audience fixture'; $slides.Show()
  $notes.Text='Presenter fixture'; $notes.Show()
  [System.Windows.Forms.Application]::DoEvents()
  $options=@{showPresenter=$true;audience=@{x=50;y=50;width=320;height=180};control=@{x=450;y=50;width=320;height=180}}
  $handles=Set-ProjectionWindows ([pscustomobject]@{HWND=$root}) ([pscustomobject]@{HWND=[long]$slides.Handle}) $options $root $before
  if($handles.slides -ne [long]$slides.Handle -or $handles.notes -ne [long]$notes.Handle){throw 'Wrong native source selected.'}
  if(-not [PptDisplay]::Matches($handles.slides,50,50,320,180)){throw 'Slides position was not verified.'}
  if(-not [PptDisplay]::Matches($handles.notes,450,50,320,180)){throw 'Presenter position was not verified.'}
  if(-not [PptDisplay]::ShowGeometry($handles.slides,37.5,37.5,240,135)){throw 'Office points were not correlated with physical pixels.'}
  $slides.Text='PowerPoint Slide Show - [Specific deck.pptx [Read-Only]]'
  if(-not [PptDisplay]::DocumentTitle($handles.slides,'Specific deck.pptx')){throw 'Legacy document title was not recognized.'}
  if([PptDisplay]::DocumentTitle($handles.slides,'deck.pptx')){throw 'A substring incorrectly matched another document.'}
  $options.showPresenter=$false
  $single=Set-ProjectionWindows ([pscustomobject]@{HWND=$root}) ([pscustomobject]@{HWND=[long]$slides.Handle}) $options $root $before
  if($single.ContainsKey('notes')){throw 'Slides-only routing incorrectly requires Presenter View.'}
  Write-Host 'PASS Office STA retry filter, real Win32 handle discovery, verified independent window routing and slides-only mode'
} finally {
  foreach ($window in @($notes,$slides,$editor)) {$window.Close();$window.Dispose()}
}
