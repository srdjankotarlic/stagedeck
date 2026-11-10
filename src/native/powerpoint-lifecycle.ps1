function Close-EmptyPowerPoint($application) {
  if ($null -eq $application -or $application.Presentations.Count -ne 0) { return $false }
  # A document in Protected View is not counted in Presentations.
  $protected = $application.ProtectedViewWindows
  if ($null -ne $protected -and $protected.Count -gt 0) { return $false }
  $application.Quit()
  return $true
}
