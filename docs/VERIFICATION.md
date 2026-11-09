# Verification

Stability takes priority over startup speed. Existing PowerPoint readiness, output placement, capture and complete-close checks remain in place. Native PowerPoint startup scripts and their waits were not changed.


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
