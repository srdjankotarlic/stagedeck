# StageDeck development

A local desktop presentation desk for Microsoft PowerPoint and PDFs, with an optional 32-key Stream Deck XL integration. Serbian instructions: [INSTALL-SR.md](../INSTALL-SR.md).

## Monitor roles

The Displays dialog lists connected displays by number, label, resolution and laptop status. A simultaneous identification overlay labels each physical display. Each of up to three monitors can independently be Controls only, Presenter View or Slides. Explicit assignments persist. Repeated roles are supported, including all-notes or all-slides. Routing edits are blocked on air; missing assigned displays never cause an automatic fallback onto another monitor.

On macOS, native PowerPoint continues rendering slides, embedded video, transitions and its own Presenter View. A bundled universal ScreenCaptureKit helper captures only the selected document's native windows. Frames are distributed locally to borderless monitor outputs, with fixed aspect ratio and complete monitor coverage. Native source windows remain on active output monitors underneath these outputs, where PowerPoint continues rendering. Unused native views can be placed off-screen; captured views are never moved off-screen, which would freeze PowerPoint rendering. The source placement is checked against control-only displays. Startup/switch/stop use black guards so a wrong native view does not flash onto an audience display. The desktop's main display and physical display layout remain unchanged. The CoreGraphics helper remains for recovery of an interrupted session from version 0.3.

Screen Recording access, Automation and Accessibility are required for native PowerPoint output on macOS. The Notes outputs are live views; application controls and presenter/clicker handle navigation. Output controls appear on mouse movement. Cmd/Ctrl+Shift+Space raises the desk; Escape closes the show. No Stream Deck connection is required.

Windows uses PowerPoint COM, Win32 window placement and Electron window capture. The installer builds and contains its native scripts, icons and plugin, but the Windows Office/capture path requires testing on actual Windows. It is not represented as verified by Mac tests.

PDFs render locally with PDF.js on all assigned Slides outputs. Navigation is shared, including clicks/keyboard input on an output. PDF documents have no native PowerPoint Presenter Notes; PDF playback uses the assigned Slides outputs and leaves Notes displays unused. Switching between PowerPoint and PDF does not require editing a common Notes + Slides layout.

## Mouse playback

Click a thumbnail to cue its stable document ID, then press GO. Selection and double-clicks never change output, including when a Stream Deck is connected. Selecting another deck while live only cues it; GO switches explicitly. The app GO command is idempotent for the current document, rejects stale event/document IDs and cannot toggle a live presentation off. Stop is separate. Hardware toggle remains one press to start and one press to close.

## Names and hardware

Drop a file to use its filename as the presentation name. Click that name to edit it inline; Enter/blur saves, Escape cancels. The context menu can restore the filename. A separate keyboard-label editor accepts a short alias, multiline text and a font size, with a real key-image preview. Text-only layout uses the full key for larger type, with Auto or explicit sizes up to 64 px; image-plus-text remains available. Alias and presentation name are independent and persist. Long text wraps/truncates visually; source files are never renamed. Changing a presentation name updates the default key label unless a custom alias exists.

The optional Elgato plugin receives generated key images and forwards stable slot indices over authenticated localhost WebSockets. The XL profile maps all 32 positions. The plugin and profile installers are included in both desktop installers. Installation is initiated through the official Elgato application. Existing profiles remain intact.

The English/Serbian preference and light/dark themes are stored locally. New libraries default to English and dark. Events, watched folders, reorder/replace/remove/reveal and locked layouts remain available. Slots reference original source files. A second press closes that document and its outputs without closing unrelated presentations.

## Development

Node.js 22.12+, npm, and macOS Command Line Tools for native helper builds.

```sh
npm ci
npm run assets
npm run native
npm start
npm test
node scripts/create-fixtures.cjs
node scripts/smoke-ui.cjs
node scripts/check-role-layouts.cjs
node scripts/check-media-and-recovery.cjs
npm run build:mac
npm run build:win
node scripts/capture-screenshots.cjs # generated public demo files and isolated library
```

The media test uses a generated `06 Video test.pptx` with embedded motion video. The native fixture is configured for autoplay with PowerPoint before that test. `check-role-layouts.cjs` exercises all 27 role combinations on three connected monitors with real PowerPoint, no Stream Deck peer, actual output-pixel changes after two advances, exact monitor bounds, source exclusion from control screens, on-air routing protection, complete document/output closure and unchanged display geometry. It writes `.test-output/role-matrix-report.json` and verified Notes/Slides screenshots. The UI smoke test covers selection/double-click/GO/stop, safe cueing while live, stale IDs, reorder/removal, the real Stream Deck bridge with hardware connected and disconnected, text fitting and GO visibility at minimum window size, roles/aliases/theme persistence, identification overlays, inline rename/cancel/reset, actual key preview, PDF navigation/close, thumbnails, reorder and lock. Unit tests cover all role combinations, disconnected-device rejection, source placement, library recovery/Unicode/overflow and plugin registration/images/commands/profile pages.

The Mac DMG/ZIP is universal Intel/Apple Silicon for macOS 13+. The NSIS installer targets Windows 10/11 x64 and creates desktop/Start menu shortcuts. Native binaries are bundled; installed users do not need developer tools. Builds are development releases: Mac uses a persistent local code-signing certificate without Developer ID/notarization, Windows has no commercial code-signing certificate.

State lives at `~/Library/Application Support/StageDeck` or `%APPDATA%\StageDeck`. Corrupt libraries are preserved before replacement. The localhost bridge uses an owner-readable random token, rejects browser-origin requests and allows only presentation commands. Native captured frames remain in the app and are never streamed to a network service.

## Actual Windows verification

For Microsoft 365 / PowerPoint 2021+, the packaged `resources/validation/Proveri Windows.cmd` runs the real installed executable against an isolated test library and a generated deck. It checks mouse selection/GO, repeat GO, a 64 px N23 label, native Office slide counts/positions, output pixel changes, native document/output closure and the authenticated hardware toggle protocol. Reports are saved to the Desktop with actual platform/Office/display details. Run off-air; it uses connected displays. This runner also runs on macOS to verify its orchestration, which does not establish Windows Office compatibility.

Windows source contracts were checked against [Microsoft SlideShowSettings](https://learn.microsoft.com/en-us/office/vba/api/powerpoint.slideshowsettings.showpresenterview) and [Electron capture APIs](https://www.electronjs.org/docs/latest/api/structures/desktop-capturer-source/). PowerShell parsing and embedded Win32 C# compilation are separate from Windows execution.

## Persistent local Mac signing

`afterSign` signs the app root with a persistent certificate in `~/Library/Application Support/StageDeck Signing`. The designated requirement binds the bundle identifier to that exact certificate, rather than the changing code hash of ad-hoc signing. This follows [Apple’s designated requirement model](https://developer.apple.com/documentation/technotes/tn3127-inside-code-signing-requirements). No system trust settings are changed; the certificate is not an Apple Developer ID certificate. The private identity and keychain password are outside the repository and are never bundled. Restore this identity from a secure backup if the build machine changes; do not generate a replacement during normal updates.

The main executable declares the Apple Events resource entitlement while retaining Hardened Runtime. PowerPoint receives the original file URL directly; AppleScript does not resolve it to a filesystem alias first. That avoids making the controlling process read a Desktop/Downloads document just to ask PowerPoint to open it.
