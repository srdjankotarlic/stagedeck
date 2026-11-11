# StageDeck — Free PDF & PowerPoint viewer for live events

**Open PDFs and PowerPoint presentations from one screen and show them fullscreen on another.** StageDeck is free and open source for Windows and macOS. It gives AV technicians, event operators, and presenters a 32-slot grid to organize a show's files before the audience arrives.

[**Download for Windows**](https://github.com/srdjankotarlic/stagedeck/releases/latest/download/StageDeck-Windows.zip) · [**Download for Mac**](https://github.com/srdjankotarlic/stagedeck/releases/latest/download/StageDeck-Mac.zip) · [All releases](https://github.com/srdjankotarlic/stagedeck/releases)

PDFs play directly in StageDeck. PowerPoint files use the desktop Microsoft PowerPoint app, so you can show its native Presenter View with speaker notes on a separate display. Run the show with a mouse or use the included Elgato Stream Deck XL plugin. StageDeck runs locally and requires no account.

![StageDeck's 32-slot grid with PDF and PowerPoint previews for a sample conference](docs/media/stage-deck-powerpoint-pdf-grid.webp)

[What it does](#what-stagedeck-does) · [First show](#run-your-first-show) · [Stream Deck XL](#elgato-stream-deck-xl) · [Installation](#installation-and-requirements) · [Project website](https://srdjankotarlic.github.io/stagedeck/)

## What StageDeck does

| For your show | What you can do |
| --- | --- |
| **View and present PDFs** | Open PDFs directly, advance through pages, and send them fullscreen to one or more audience displays. PDF playback works without Office. |
| **Present PowerPoint files** | Play a deck in desktop PowerPoint. Send slides to the audience and keep the current slide, next slide, and speaker notes on the presenter display. |
| **Route up to three displays** | Identify connected screens and assign **Controls only**, **Presenter View**, or **Slides** to each. You can repeat a role on multiple displays. |
| **Prepare an event** | Drag files into a 32-slot grid or link a folder to pick up new files. See filenames and available previews, reorder slots, save separate events, and lock the layout before going live. |
| **Control playback** | Select a card, then press **GO** to put it live. The active cue turns red. Use the navigation arrows and **Close** from the desk. |
| **Run from a Stream Deck XL** | Use the included 32-key profile to start a presentation with one press and close it with the next. Live keys turn red. Use a short key label or a preview with text. |

| PDF viewer · audience output | PowerPoint · audience output |
| --- | --- |
| ![An event agenda PDF shown fullscreen on the audience display](docs/media/fullscreen-pdf-slides.webp) | ![A PowerPoint keynote shown fullscreen on the audience display](docs/media/fullscreen-powerpoint-slides.webp) |
| **PowerPoint · what the presenter sees** | **Display routing · what the operator sets** |
| ![Native PowerPoint Presenter View with current and next slides plus private speaker notes](docs/media/native-powerpoint-presenter-view.webp) | ![StageDeck display settings assigning Presenter View and Slides to separate monitors](docs/media/powerpoint-presenter-view-display-routing.webp) |

## Run your first show

1. **Load your files.** Drop your decks and PDFs onto the grid in show order. Click a card name to edit it in StageDeck. Right-click to replace a source, restore its filename, reveal it in its folder, or remove the cue.
2. **Assign your screens.** Open **Displays** and select **Identify displays**. Give the projector the **Slides** role. For PowerPoint, give the speaker's screen **Presenter View**. With a third screen, the operator can keep **Controls only**.
3. **Select a presentation and press GO.** A click on a card selects it for review. **GO** starts the show. Use **Previous slide**, **Next slide**, and **Close** from StageDeck.

| Selected cue ready for GO | Live cue with navigation and Close |
| --- | --- |
| ![The opening keynote selected with a separate GO button](docs/media/cue-presentation-with-go.webp) | ![Red LIVE indicator beside previous, next, and close controls](docs/media/live-status-and-slide-controls.webp) |

Use **Escape** to close the active presentation. When every screen is in use, **Ctrl+Shift+Space** on Windows or **Cmd+Shift+Space** on Mac brings the control window forward.

## Elgato Stream Deck XL

The Windows and Mac downloads both include the plugin and the 32-key **StageDeck XL** profile. You can run the entire show from StageDeck if you don't have a Stream Deck.

1. Install the Elgato Stream Deck desktop app. In StageDeck, open **Settings → Install plugin** and approve the install in Elgato.
2. Select the **StageDeck XL** profile. If needed, choose **Import profile** in StageDeck to map all 32 key positions.
3. Click the keyboard icon on any presentation card to set a key label, such as `KEYNOTE` or `N23`. The presentation can keep its full name in StageDeck. Choose **Text only** or **Image + text**, preview the key, and set the text size up to 64 px.
4. With both desktop apps running, press a key to go live. The key turns red. Press it again to close that presentation.

| Plugin installation and profile import | Live preview of a custom key label |
| --- | --- |
| ![StageDeck Settings with the Elgato plugin installation and profile import controls](docs/media/elgato-stream-deck-plugin-setup.webp) | ![Stream Deck key editor with a large KEYNOTE label and a preview of the actual key image](docs/media/stream-deck-xl-key-label.webp) |

## Installation and requirements

| Download | How to install |
| --- | --- |
| [**Windows ZIP**](https://github.com/srdjankotarlic/stagedeck/releases/latest/download/StageDeck-Windows.zip) | Windows 10 or 11, x64. Extract the ZIP and run `Install-StageDeck.cmd` for StageDeck and the Elgato plugin. Run `StageDeck-Setup.exe` to install the app on its own. |
| [**Mac ZIP**](https://github.com/srdjankotarlic/stagedeck/releases/latest/download/StageDeck-Mac.zip) | macOS 13 or newer, Intel or Apple Silicon. Extract the ZIP, open `StageDeck.dmg`, and drag StageDeck into Applications. Follow the installation guide for macOS permissions. |

| File or device | Requirement |
| --- | --- |
| **PDF** (`.pdf`) | Plays in StageDeck. |
| **PowerPoint** (`.ppt`, `.pptx`, `.pptm`, `.pps`, `.ppsx`) | Requires the desktop Microsoft PowerPoint app for playback and Presenter View. |
| **Elgato Stream Deck XL** | Optional. Requires Elgato Stream Deck 6.6 or later. |

[Installation guide](INSTALL.md) · [Uputstvo na srpskom](INSTALL-SR.md) · [Tested setups and verification](docs/VERIFICATION.md)

## Language and appearance

StageDeck opens in English and uses dark mode on a new installation. Switch to Serbian in **Settings → Language** or choose **Light** in the sidebar. Your choices are saved locally.

| Optional light mode | Serbian interface |
| --- | --- |
| ![The presentation grid in light mode](docs/media/stage-deck-light-theme.webp) | ![StageDeck with Serbian navigation, menus, and controls](docs/media/stage-deck-serbian-interface.webp) |

StageDeck is free under the [MIT license](LICENSE). If it helps you run a show, star the repository or share it with your crew. Use GitHub Issues to report a problem or tell us what would help in your setup.

[Report an issue](https://github.com/srdjankotarlic/stagedeck/issues/new) · [Build from source](docs/DEVELOPMENT.md)

StageDeck is an independent project and is not affiliated with Microsoft or Elgato.
