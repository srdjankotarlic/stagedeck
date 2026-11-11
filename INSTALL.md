# Install StageDeck

Download and extract the ZIP for your system from the
[latest GitHub release](https://github.com/srdjankotarlic/stagedeck/releases/latest).
Both ZIPs include StageDeck, the Elgato plugin, and the 32-key Stream Deck XL profile.

- **Windows 10/11, x64:** Run `Install-StageDeck.cmd` to install StageDeck and
  the Windows plugin together. For manual installation, run `StageDeck-Setup.exe`,
  then open the plugin from the `Elgato` folder if you use a Stream Deck.
  Launch StageDeck from the desktop or Start menu.
- **macOS 13+, Intel and Apple Silicon:** Open `StageDeck.dmg` and drag
  StageDeck into Applications. For PowerPoint, grant StageDeck the macOS
  Accessibility, Automation and Screen & System Audio Recording permissions
  when prompted. This build is not notarized by Apple. Use macOS's per-app
  approval if necessary; keep system protections enabled.
- **PowerPoint:** Install the desktop Microsoft PowerPoint app. PDF playback
  does not need Office. Test the exact computer, display arrangement, and
  presentation files before a live event.
- **Optional Stream Deck:** Install Elgato Stream Deck 6.6 or later. In StageDeck,
  open **Settings → Install plugin**, approve the install or update in Elgato,
  then use **Import profile** if the StageDeck XL profile is not offered automatically.
  When upgrading StageDeck, install the bundled plugin update too.
  The Windows plugin does not require a separate Node.js installation.

## First presentation

1. Drag PowerPoint or PDF files onto the grid. You can also link a folder.
2. Open **Displays**. Use **Identify displays** and select **Controls only**,
   **Presenter View**, or **Slides** for each connected screen (up to three).
   PDFs use Slides outputs.
3. Select a presentation, then press **GO**. Use **Close** to end it.
   With a mapped Stream Deck key, press once to start and again to close.
4. Click a presentation name to rename it inside StageDeck. Click the keyboard
   icon to edit its separate Stream Deck label, font size and preview layout.
5. **Settings → Language** switches between English and Serbian (Latin script).
   English is the default. The language preference is saved locally.

If every display is in use, press **Ctrl+Shift+Space** (Windows) or
**Cmd+Shift+Space** (Mac) to bring the StageDeck controls forward.
Use **Settings → Copy details** when reporting an error. Review diagnostics
before sharing them publicly. For the Serbian guide, see [INSTALL-SR.md](INSTALL-SR.md).
