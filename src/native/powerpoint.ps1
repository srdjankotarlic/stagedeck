$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = New-Object System.Text.UTF8Encoding($false)
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
. (Join-Path $PSScriptRoot 'windows-display.ps1')
[PptDisplay]::RegisterOfficeMessageFilter() | Out-Null
$ppt = $null
while ($null -ne ($line = [Console]::ReadLine())) {
  $stage='request'
  $rootHandle=0
  try {
    $req = $line | ConvertFrom-Json
    $stage='status'
    if ($req.operation -eq 'status') {
      if (-not (Get-Process POWERPNT -ErrorAction SilentlyContinue)) {
        $ppt = $null
        $result = @{ running = $false; windows = @(); documentCount = 0 }
      } else {
        if ($null -eq $ppt) { $ppt = [Runtime.InteropServices.Marshal]::GetActiveObject('PowerPoint.Application') }
        $windows = @()
        for ($i = 1; $i -le $ppt.SlideShowWindows.Count; $i++) {
          $w = $ppt.SlideShowWindows.Item($i)
          $windows += @{ path = $w.Presentation.FullName; slide = $w.View.CurrentShowPosition; total = $w.Presentation.Slides.Count; state = [string]$w.View.State }
        }
        $result = @{ running = $true; windows = $windows; documentCount = $ppt.Presentations.Count; officeVersion = [string]$ppt.Version }
      }
    } else {
      $stage='connect-office'
      if ($null -eq $ppt) {
        try { $ppt = [Runtime.InteropServices.Marshal]::GetActiveObject('PowerPoint.Application') }
        catch { $ppt = New-Object -ComObject PowerPoint.Application }
      }
      $stage='open-document'
      if ($req.operation -eq 'start' -or $req.operation -eq 'thumbnail') {
        $deck = $null
        $openedForPreview = $false
        for ($i=1; $i -le $ppt.Presentations.Count; $i++) {
          if ($ppt.Presentations.Item($i).FullName -eq $req.path) { $deck = $ppt.Presentations.Item($i); break }
        }
        if ($null -eq $deck) {
          $withWindow = if ($req.operation -eq 'thumbnail') { 0 } else { -1 }
          $deck = $ppt.Presentations.Open($req.path, -1, 0, $withWindow)
          $openedForPreview = $req.operation -eq 'thumbnail'
        }
        if($req.operation -eq 'start' -and $deck.Saved -eq 0){throw 'Sačuvaj postojeće izmene u PowerPointu pre pokretanja kroz StageDeck.'}
        if ($req.operation -eq 'thumbnail') {
          try {
            $deck.Slides.Item(1).Export($req.output, 'PNG', 960, 540)
            $result = @{ ok = $true; total = $deck.Slides.Count }
          } finally { if ($openedForPreview) { $deck.Close() } }
        } else {
          $stage='prepare-presenter'
          $ppt.Visible = -1
          if($deck.Windows.Count -gt 0){$deck.Windows.Item(1).Activate()}
          $rootHandle=[PptDisplay]::Handle([long]$ppt.HWND)
          $before=@([PptDisplay]::Windows($rootHandle))
          [PptDisplay]::Restore($rootHandle)
          $wasSaved = $deck.Saved
          $deck.SlideShowSettings.ShowType = 1
          $deck.SlideShowSettings.ShowPresenterView = if ($req.options.showPresenter -eq $false) { 0 } else { -1 }
          if($req.options.showPresenter -ne $false){
            try {
              if(-not $ppt.CommandBars.GetPressedMso('SlideShowUsePresenterView')){$ppt.CommandBars.ExecuteMso('SlideShowUsePresenterView')}
            } catch { # Office versions without this Ribbon control still use the document setting.
            }
          }
          if ($wasSaved -eq -1) { $deck.Saved = -1 }
          if($null -ne $req.options.control){$control=$req.options.control;[PptDisplay]::Move($rootHandle,$control.x,$control.y,$control.width,$control.height)}
          $stage='start-slideshow'
          $show = $deck.SlideShowSettings.Run()
          $stage='route-windows'
          $handles=Set-ProjectionWindows $ppt $show $req.options $rootHandle $before
          $result=@{ok=$true;handles=$handles}
        }
      } else {
        $stage=$req.operation
        $closingDeck = $null
        for ($i=1; $i -le $ppt.SlideShowWindows.Count; $i++) {
          $w = $ppt.SlideShowWindows.Item($i)
          if ($w.Presentation.FullName -eq $req.path) {
            $closingDeck = $w.Presentation
            switch ($req.operation) {
              'stop' { $w.View.Exit() }
              'next' { $w.View.Next() }
              'previous' { $w.View.Previous() }
            }
            break
          }
        }
        if ($req.operation -eq 'stop' -or $req.operation -eq 'close') {
          if ($null -eq $closingDeck) {
            for ($i=1; $i -le $ppt.Presentations.Count; $i++) {
              if ($ppt.Presentations.Item($i).FullName -eq $req.path) { $closingDeck = $ppt.Presentations.Item($i); break }
            }
          }
          if ($null -ne $closingDeck) {
            if ($closingDeck.Saved -eq 0) { throw 'Prezentacija ima nesačuvane izmene. Sačuvaj je u PowerPointu pre zatvaranja.' }
            $closingDeck.Close()
          }
        }
      }
      if ($req.operation -ne 'thumbnail' -and $req.operation -ne 'start') { $result = @{ ok = $true } }
    }
    @{ id = $req.id; result = $result } | ConvertTo-Json -Depth 10 -Compress | ForEach-Object { [Console]::WriteLine($_) }
  } catch {
    $cause=$_.Exception
    while($null -ne $cause.InnerException){$cause=$cause.InnerException}
    $detail=$cause.Message
    $code=('{0:X8}' -f ([long]$cause.HResult -band 4294967295L))
    if($detail -match '80040154|Class not registered'){$detail='Desktop Microsoft PowerPoint nije registrovan na Windowsu. Otvori PowerPoint ručno ili popravi Office instalaciju.'}
    elseif($detail -match '80010001|8001010A'){$detail='PowerPoint je zauzet ili čeka dijalog. Zatvori dijalog u PowerPointu i ponovi GO.'}
    $windows=@();if($rootHandle -ne 0){$windows=@([PptDisplay]::Windows($rootHandle) | ForEach-Object { [PptDisplay]::Describe($_) })}
    @{ id = $req.id; error = ('PowerPoint ['+$stage+', '+$code+']: '+$detail); diagnostics=@{stage=$stage;hresult=$code;message=$detail;windows=$windows} } | ConvertTo-Json -Depth 6 -Compress | ForEach-Object { [Console]::WriteLine($_) }
    $ppt = $null
  }
}
