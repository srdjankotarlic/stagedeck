on run argv
 set deckName to item 1 of argv
 tell application "System Events"
  tell process "Microsoft PowerPoint"
   repeat with windowTitle in (get name of windows)
    if (windowTitle as text) is deckName or (windowTitle as text) is (deckName & " [Compatibility Mode]") or (windowTitle as text) contains ("[" & deckName & "]") or (windowTitle as text) contains ("[" & deckName & " [Compatibility Mode]]") then
      set w to window (windowTitle as text)
     set n to count of buttons of w
     if n is 0 then
      set position of w to {((item 4 of argv) as integer), ((item 5 of argv) as integer)}
     else if n ≥ 4 then
      set position of w to {((item 2 of argv) as integer), ((item 3 of argv) as integer)}
     else if n is 3 then
      set position of w to {((item 6 of argv) as integer), ((item 7 of argv) as integer)}
      set size of w to {((item 8 of argv) as integer), ((item 9 of argv) as integer)}
     end if
    end if
   end repeat
  end tell
 end tell
 return "{\"ok\":true}"
end run
