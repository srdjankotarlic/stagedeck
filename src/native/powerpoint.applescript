on replaceText(sourceText, searchText, replacementText)
  set oldDelimiters to AppleScript's text item delimiters
  set AppleScript's text item delimiters to searchText
  set parts to text items of sourceText
  set AppleScript's text item delimiters to replacementText
  set resultText to parts as text
  set AppleScript's text item delimiters to oldDelimiters
  return resultText
end replaceText

on jsonQuote(t)
  set t to my replaceText(t as text, "\\", "\\\\")
  set t to my replaceText(t, "\"", "\\\"")
  set t to my replaceText(t, return, "\\r")
  set t to my replaceText(t, linefeed, "\\n")
  set t to my replaceText(t, tab, "\\t")
  return "\"" & t & "\""
end jsonQuote

on normalizedPath(p)
  tell application "Microsoft PowerPoint"
    return (get full name of p)
  end tell
end normalizedPath

on presentationNameForPath(targetPath)
  tell application "Microsoft PowerPoint"
    repeat with candidateName in (get name of presentations)
      try
        if (get full name of presentation (candidateName as text)) is targetPath then return candidateName as text
      end try
    end repeat
  end tell
  return missing value
end presentationNameForPath

on run argv
  set operation to item 1 of argv
  if operation is "reset-display-cache" then
    if application "Microsoft PowerPoint" is running then
      tell application "Microsoft PowerPoint"
        if (count of presentations) is 0 and (count of slide show windows) is 0 then quit
      end tell
      delay 0.3
    end if
    return "{\"ok\":true}"
  end if
  if operation is "status" then
    if application "Microsoft PowerPoint" is not running then return "{\"windows\":[],\"running\":false}"
    set output to "{\"running\":true,\"windows\":["
    set separator to ""
    tell application "Microsoft PowerPoint"
      repeat with windowIndex from 1 to count of slide show windows
        set w to slide show window windowIndex
        set p to presentation of w
        set currentPath to (get full name of p)
        set positionNumber to current show position of slideshow view of w
        set slideCount to count of slides of p
        set viewState to slide state of slideshow view of w as text
        set fullScreenFlag to is full screen of w as text
        set wb to bounds of w
        set boundsJSON to "[" & item 1 of wb & "," & item 2 of wb & "," & item 3 of wb & "," & item 4 of wb & "]"
        set output to output & separator & "{\"path\":" & my jsonQuote(currentPath) & ",\"slide\":" & positionNumber & ",\"total\":" & slideCount & ",\"state\":" & my jsonQuote(viewState) & ",\"fullscreen\":" & fullScreenFlag & ",\"bounds\":" & boundsJSON & "}"
        set separator to ","
      end repeat
    end tell
    tell application "Microsoft PowerPoint"
      set presenterCount to count of presenter view windows
      set documentCount to count of presentations
    end tell
    return output & "],\"presenterCount\":" & presenterCount & ",\"documentCount\":" & documentCount & "}"
  end if

  set targetPath to item 2 of argv
  if operation is "start" or operation is "prepare" then
    set targetFile to POSIX file targetPath
    tell application "Microsoft PowerPoint"
      activate
      if operation is "prepare" then
        set existingName to my presentationNameForPath(targetPath)
        if existingName is not missing value then
          if not (saved of presentation existingName) then error "Sačuvaj postojeće izmene u PowerPointu pre pokretanja kroz StageDeck."
        end if
        open targetFile
        delay 0.3
      end if
      set targetName to my presentationNameForPath(targetPath)
      repeat 20 times
        if targetName is not missing value then exit repeat
        delay 0.1
        set targetName to my presentationNameForPath(targetPath)
      end repeat
      set targetPresentation to missing value
      if targetName is not missing value then set targetPresentation to presentation targetName
      if targetPresentation is missing value then error "PowerPoint nije otvorio izabrani fajl."
      if operation is "prepare" then
        set wasSaved to saved of targetPresentation
        set show type of slide show settings of targetPresentation to slide show type speaker
        set show with presenter of slide show settings of targetPresentation to ((count of argv) < 3 or (item 3 of argv) is not "false")
        if wasSaved then set saved of targetPresentation to true
      else
        run slide show slide show settings of presentation targetName
      end if
    end tell
    if operation is "prepare" then return "{\"ok\":true,\"wasSaved\":" & (wasSaved as text) & "}"
    return "{\"ok\":true}"
  end if

  if application "Microsoft PowerPoint" is not running then return "{\"ok\":true}"
  tell application "Microsoft PowerPoint"
    set targetName to my presentationNameForPath(targetPath)
    set targetPresentation to missing value
    if targetName is not missing value then set targetPresentation to presentation targetName
    repeat with windowIndex from 1 to count of slide show windows
      set w to slide show window windowIndex
      if (get full name of presentation of w) is targetPath then
        set v to slideshow view of w
        if operation is "stop" then
          exit slide show v
        else if operation is "next" then
          go to next slide v
        else if operation is "previous" then
          go to previous slide v
        end if
        exit repeat
      end if
    end repeat
    if (operation is "stop" or operation is "close") and targetPresentation is not missing value then
      if saved of targetPresentation then
        close targetPresentation saving no
      else
        close targetPresentation saving ask
      end if
    end if
  end tell
  return "{\"ok\":true}"
end run
