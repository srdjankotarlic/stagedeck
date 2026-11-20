function Close-EmptyPowerPoint($application) {
  if ($null -eq $application -or $application.Presentations.Count -ne 0) { return $false }
  # A document in Protected View is not counted in Presentations.
  $protected = $application.ProtectedViewWindows
  if ($null -ne $protected -and $protected.Count -gt 0) { return $false }
  $application.Quit()
  return $true
}

function Test-ProtectedPresentation($application, [string]$path) {
  try {
    for ($index=1; $index -le $application.ProtectedViewWindows.Count; $index++) {
      $protected = $application.ProtectedViewWindows.Item($index)
      if ((Join-Path $protected.SourcePath $protected.SourceName) -eq $path) { return $true }
    }
  } catch {
    # Preserve the original Open error if this Office version omits the properties.
  }
  return $false
}
