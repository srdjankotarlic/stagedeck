on run argv
  set deckName to item 1 of argv
  set hideSlides to (item 2 of argv) is "true"
  set hideNotes to (item 3 of argv) is "true"
  if hideSlides or hideNotes then
    tell application "System Events" to tell process "Microsoft PowerPoint"
      repeat with windowTitle in (get name of windows)
        if (windowTitle as text) is deckName or (windowTitle as text) contains ("[" & deckName & "]") then
      set w to window (windowTitle as text)
          if ((count of buttons of w) is 0 and hideSlides) or ((count of buttons of w) ≥ 4 and hideNotes) then
            set position of w to {-30000, -30000}
          end if
        end if
      end repeat
    end tell
  end if
  return "{\"ok\":true}"
end run
