on run argv
  set layoutText to ""
  set deckName to item 1 of argv
  tell application "System Events"
    tell process "Microsoft PowerPoint"
    repeat with windowTitle in (get name of windows)
      if (windowTitle as text) is deckName or (windowTitle as text) is (deckName & " [Compatibility Mode]") or (windowTitle as text) contains ("[" & deckName & "]") or (windowTitle as text) contains ("[" & deckName & " [Compatibility Mode]]") then
      set w to window (windowTitle as text)
        set p to position of w
        set s to size of w
        set n to count of buttons of w
        set layoutText to layoutText & "{\"buttons\":" & n & ",\"x\":" & item 1 of p & ",\"y\":" & item 2 of p & ",\"width\":" & item 1 of s & ",\"height\":" & item 2 of s & "},"
      end if
    end repeat
    end tell
  end tell
  if layoutText is not "" then set layoutText to text 1 thru -2 of layoutText
  return "{\"windows\":[" & layoutText & "]}"
end run
