# Verification — 0.5.1

Stability takes priority over startup speed. Existing PowerPoint readiness, output placement, capture and complete-close checks remain in place. Native PowerPoint startup scripts and their waits were not changed.

## Measured Mac performance

Three sequential runs per scenario on the same Mac with three connected monitors and generated test documents. PowerPoint was already running. Times end at ready native outputs / rendered PDF pixels. These are local measurements, not guarantees for other computers or larger files.

| Scenario | 0.5.0 median | 0.5.1 median |
| --- | ---: | ---: |
| ppt | 5952 ms | 5953 ms |
| pdf-one | 316 ms | 302 ms |
| pdf-all | 688 ms | 595 ms |

`ppt`: native PowerPoint with Slides + Notes. `pdf-one`: one Slides monitor. `pdf-all`: three Slides monitors. The multi-monitor PDF improvement is about 14%; PowerPoint timing is effectively unchanged. Closing is already sub-second in these tests and remains unchanged in behavior. File size, embedded media and a cold PowerPoint launch can take longer.

Independent output renderers now load concurrently. PDF file reads are asynchronous, keeping the main process responsive, with no stale document cache. On Windows, the PowerShell transport is prepared while the desk opens, without starting PowerPoint or opening a presentation. The first GO can reuse this transport.

## Windows boundary

GitHub Actions runs the unit suite, actual Windows PowerShell parser, Win32 C# compilation/DPI initialization, worker warmup/restart, Electron PDF/UI/Stream Deck protocol checks, and installer build on a Windows runner. The status of the workflow is the source of truth for those automated checks. GitHub hosted runners do not supply desktop PowerPoint. Native Office Presenter View, slideshow capture, embedded media and physical monitor routing still require the packaged `Proveri Windows.cmd` and hands-on checks on a Windows 10/11 x64 computer with Microsoft 365 / PowerPoint 2021+.

Mac tests cannot establish Windows Office compatibility. The release does not claim universal or perfect compatibility.

## Stable Mac permissions

The installed Mac application and release use the same persistent signing identity as 0.5.0. A prior update-replacement check confirmed that a changed application hash with the same designated requirement preserved approved permissions. The private signing identity is kept outside this repository and all installers. Do not replace it during normal updates.
