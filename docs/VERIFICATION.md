# Verification

Stability takes priority over startup speed. Existing PowerPoint readiness, output placement, capture and complete-close checks remain in place.

## Windows 0.5.6 — remaining empty PowerPoint editor

An additional installed-app performance comparison on 10 November measured three consecutive open/close cycles of the same PPT with both outputs ready. Version 0.5.6 opened in 4790/4610/4479 ms (median 4610), and closed in 1450/1494/1424 ms (median 1450). A trial that precompiled the unchanged Win32 C# helper opened in 4309/5693/5182 ms (median 5182) and closed in 1485/1444/1375 ms (median 1444). It did not demonstrate a useful end-to-end speed improvement, so it was rejected and is not in the release. Readiness, routing, capture and complete-close checks were retained. These are local samples, not universal performance guarantees.

The user's follow-up exposed a gap in the 0.5.4 check: stopping removed the slideshow and Presenter View, but left a visible empty window titled `Microsoft PowerPoint`. This was reproduced in the installed app by tracking the editor HWND through start and stop. `Presentation.Close()` does not quit the PowerPoint application.

Windows now quits PowerPoint after the selected document closes only if both Presentations and ProtectedViewWindows are empty. Other documents remain open. It releases Office COM references and retires the PowerShell worker after quitting. Stop waits for tracked output/editor windows to disappear; a failed close retains LIVE so the same key can retry. Mac runtime paths are unchanged.

The first 0.5.5 physical-key check exposed delayed shutdown after repeated status polling: Office could retain its editor while the automation worker was still alive. Version 0.5.6 retires that worker before checking the tracked window handles from a fresh worker without Office COM references. Three real transport cycles, including 32 status polls before closing, passed with all three tracked windows gone.

The 0.5.6 NSIS package was installed on this computer and its application archive and three native scripts matched source hashes. On 10 November, the installed GUI selected a card without starting Office, GO opened actual slideshow/Presenter/editor windows, and Zatvori removed every PowerPoint-owned window. A second existing presentation also opened and closed fully. Screenshots of StageDeck outputs showed the complete slide on Philips and native Presenter View with notes on HP. Separate real Office checks passed three cycles preserving another open document. These are actual Office checks, in addition to the lifecycle guards and unit tests. The delivery report records the final physical-key result separately.

Physical XL key 1 was pressed at 12:24:05.952 UTC and again at 12:24:13.293 UTC on 10 November. The plugin reported both commands successful; app state was idle with no outputs or error at 12:24:15.283 UTC. The user confirmed the red LIVE indicator and disappearance of all presentation windows, including the empty editor. This is a physical-device check of the installed 0.5.6 package, not a simulated key command.

## Windows 0.5.4 — actual Office 2010 diagnosis

On 9 November 2026, installed 0.5.2 failed on Windows 11 Pro 23H2 (22631.6199), desktop PowerPoint 2010 x64 14.0.7162.5000, HP E24u G5 and Philips 243V7 monitors, both 1920×1080 at 100%. The exact error was `PowerPoint [route-windows, 80131501]: PowerPoint nije otvorio prozor sa slajdovima.` COM inspection showed a running slideshow and real audience/Presenter windows, but the public Office 2010 Application/DocumentWindow/SlideShowWindow interfaces did not expose HWND. Casting a missing property to zero caused the false failure.

0.5.3 retains directly exposed handles when available; otherwise it identifies the selected document's editor and correlates the same process's slideshow window with the COM geometry in points converted to physical pixels. Ambiguous document/window matches fail safely. Failures include actual window descriptions even when an application handle is unavailable. The Windows plugin logs registration, reconnection, first delivery of 32 key images, physical keyDown events and command results without tokens or document contents.

The built NSIS package was installed on this computer. Actual StageDeck screenshots confirmed audience slide 1 and 2 on the Philips monitor, native PowerPoint Presenter View and changing notes on HP, and removal of both outputs after stop. Actual PDF pages 1 and 2 rendered and navigation/close worked. An actual animation revealed its shape without advancing from slide 2. A separate Office integration check completed three open/next/previous/close cycles including slides-only routing while keeping another document open. See the delivery report for the final media and physical-device checks. None of these results establish behavior on the business laptop, mixed DPI, three physical monitors or untested Office versions. macOS runtime behavior was not changed or retested here.

Final 0.5.4 installation was verified by executable version, native-script hashes and the installed plugin hash. The bundled installer helper ran on this PC, backed up the previous library/plugin and resolved locked plugin files before replacement. Elgato 7.6 registered the new native plugin and delivered all 32 images. The user pressed physical XL key 1: the actual app became live at 18:56:51.750 UTC after keyDown at 18:56:48.122; a second physical keyDown at 18:57:01.076 closed it by 18:57:01.515. The user confirmed the red LIVE key and correct Slides/Controls placement. Both real profile pages contained slots 0–31; all 122 pre-existing profile files remained byte-identical. Restarting StageDeck caused an actual plugin disconnect/reconnect and a fresh delivery of 32 images. Final PPT/Presenter windows were visually checked again, and the app's Zatvori command removed every projection window. A generated WMV test copy also showed a changing on-video counter on the same slide; this was a secondary check, not the acceptance criterion for physical start/stop.


## Windows 0.5.2 — startup and Elgato corrections

[Successful Windows build and installed-app verification](https://github.com/srdjankotarlic/stagedeck/actions/runs/42610089545), 9 November 2026. All 19 unit tests passed, including the native Windows Elgato executable, its packaged entry point, all 32 key mappings, signed/unsigned native window IDs and populated default profile page. Additional tests capture real changing Windows window pixels without Office, move real Win32 windows to independent positions, register the Office STA retry filter, and run the full UI/PDF checks on the installed application.

Changes: Presenter View readiness waits up to 15 seconds instead of 3; the editor's process/window is captured before starting the show; native window placement is verified; Office rejected/busy calls use a bounded STA message filter; capture source enumeration retries until the exact window appears. Errors preserve their startup phase and HRESULT. Settings → Kopiraj detalje copies local diagnostics without the bridge token.

The Windows plugin is a native .NET Framework executable using local WebSockets, with no external Node runtime. The distribution is produced and validated by the official Elgato CLI. Both landing pages have 32 controls, and the XL profile is offered automatically on installation. Mac 0.5.1 and its working installation remain unchanged.

**Remaining boundary:** the reported Office error text was unavailable. The hosted Windows runner has no desktop PowerPoint or physical Stream Deck. These checks verify the changed Windows mechanisms and protocol, but cannot establish that the specific business laptop's Office problem is resolved; it must be retried there with 0.5.2. This release does not claim perfect Windows Office compatibility.

## Historical Mac 0.5.1 measurements

## Measured Mac performance

Three sequential runs per scenario on the same Mac with three connected monitors and generated test documents. PowerPoint was already running. Times end at ready native outputs / rendered PDF pixels. These are local measurements, not guarantees for other computers or larger files.

| Scenario | 0.5.0 median | 0.5.1 median |
| --- | ---: | ---: |
| ppt | 5952 ms | 5953 ms |
| pdf-one | 316 ms | 302 ms |
| pdf-all | 688 ms | 595 ms |

`ppt`: native PowerPoint with Slides + Notes. `pdf-one`: one Slides monitor. `pdf-all`: three Slides monitors. The multi-monitor PDF improvement is about 14%; PowerPoint timing is effectively unchanged. Closing is already sub-second in these tests and remains unchanged in behavior. File size, embedded media and a cold PowerPoint launch can take longer.

Independent output renderers now load concurrently. PDF file reads are asynchronous, keeping the main process responsive, with no stale document cache. On Windows, the PowerShell transport is prepared while the desk opens, without starting PowerPoint or opening a presentation. The first GO can reuse this transport.

## Windows verification and boundary

[Successful Windows build and installed-application test, 8 November 2026](https://github.com/srdjankotarlic/stagedeck/actions/runs/42515816805): all 16 unit tests passed, PowerShell/Win32 checks passed, UI/PDF/Stream Deck checks passed both from source and from the installed NSIS package. The released Windows installer is the artifact from this run.

GitHub Actions runs the unit suite, actual Windows PowerShell parser, Win32 C# compilation/DPI initialization, worker warmup/restart, Electron PDF/UI/Stream Deck protocol checks, and installer build on a Windows runner. The status of the workflow is the source of truth for those automated checks. GitHub hosted runners do not supply desktop PowerPoint. Native Office Presenter View, slideshow capture, embedded media and physical monitor routing still require the packaged `Proveri Windows.cmd` and hands-on checks on a Windows 10/11 x64 computer with Microsoft 365 / PowerPoint 2021+.

Mac tests cannot establish Windows Office compatibility. The release does not claim universal or perfect compatibility.

## Stable Mac permissions

The installed Mac application and release use the same persistent signing identity as 0.5.0. A prior update-replacement check confirmed that a changed application hash with the same designated requirement preserved approved permissions. The private signing identity is kept outside this repository and all installers. Do not replace it during normal updates.
