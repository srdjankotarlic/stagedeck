on run argv
  set deckName to item 1 of argv
  set controlX to (item 2 of argv) as integer
  set controlY to (item 3 of argv) as integer
  set monitorIndex to (item 4 of argv) as integer
  tell application "Microsoft PowerPoint" to activate
  tell application "System Events"
    tell process "Microsoft PowerPoint"
      set frontmost to true
      -- Office can publish its COM/AppleScript document before its editor exists.
      set editorReady to false
      repeat 80 times
        repeat with windowTitle in (get name of windows)
          if (windowTitle as text) is deckName or (windowTitle as text) is (deckName & " [Compatibility Mode]") then
            set w to window (windowTitle as text)
            perform action "AXRaise" of w
            set position of w to {controlX + 40, controlY + 40}
            set editorReady to true
            exit repeat
          end if
        end repeat
        if editorReady then exit repeat
        delay 0.1
      end repeat
      if not editorReady then error "PowerPoint prozor nije spreman. Ponovi GO." number -1700
      click last menu item of menu 1 of menu bar item 10 of menu bar 1
      set settingsWindow to missing value
      repeat 60 times
        repeat with w in windows
          if (count of pop up buttons of w) > 0 and (exists button "OK" of w) then
            set settingsWindow to w
            exit repeat
          end if
        end repeat
        if settingsWindow is not missing value then exit repeat
        delay 0.1
      end repeat
      if settingsWindow is missing value then error "PowerPoint nije otvorio podešavanje projekcije. Ponovi GO." number -1700
      click pop up button 1 of settingsWindow
      delay 0.2
      if monitorIndex is 1 then
        click menu item "Primary Monitor" of menu 1 of pop up button 1 of settingsWindow
      else
        click menu item ("Monitor " & monitorIndex) of menu 1 of pop up button 1 of settingsWindow
      end if
      delay 0.25
      click button "OK" of settingsWindow
      delay 0.25
    end tell
  end tell
  if (count of argv) > 4 and (item 5 of argv) is "true" then
    tell application "Microsoft PowerPoint" to set saved of presentation deckName to true
  end if
  return "{\"ok\":true}"
end run
