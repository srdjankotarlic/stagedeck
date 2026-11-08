on run argv
  set presentationName to item 1 of argv
  tell application "Microsoft PowerPoint"
    activate
    run slide show slide show settings of presentation presentationName
    delay 0.4
    if (count of slide show windows) is 0 then
      if (count of argv) > 1 and (item 2 of argv) is "false" then
        tell application "System Events" to key code 36 using {command down, shift down}
      else
        tell application "System Events" to key code 36 using option down
      end if
      delay 0.5
    end if
    return "{\"ok\":true}"
  end tell
end run
