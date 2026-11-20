Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Diagnostics;
using System.IO;
using System.Text.RegularExpressions;
[ComImport, Guid("00000016-0000-0000-C000-000000000046"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IOleMessageFilter {
  [PreserveSig] int HandleInComingCall(int type, IntPtr caller, int ticks, IntPtr info);
  [PreserveSig] int RetryRejectedCall(IntPtr callee, int ticks, int rejectType);
  [PreserveSig] int MessagePending(IntPtr callee, int ticks, int pendingType);
}
[ComVisible(true)]
public class OfficeMessageFilter : IOleMessageFilter {
  public int HandleInComingCall(int type, IntPtr caller, int ticks, IntPtr info) { return 0; }
  public int RetryRejectedCall(IntPtr callee, int ticks, int rejectType) { return (rejectType == 2 || rejectType == 1) && ticks < 12000 ? 150 : -1; }
  public int MessagePending(IntPtr callee, int ticks, int pendingType) { return 2; }
}
public class PptWindowInfo { public long Handle; public string ClassName; public string Title; public int X; public int Y; public int Width; public int Height; public uint ProcessId; }
public class PptDisplay {
  [DllImport("ole32.dll")] static extern int CoRegisterMessageFilter(IOleMessageFilter filter, out IOleMessageFilter oldFilter);
  [DllImport("ole32.dll")] static extern int OleInitialize(IntPtr reserved);
  static IOleMessageFilter currentFilter;
  public static int RegisterOfficeMessageFilter() { int initialized=OleInitialize(IntPtr.Zero); if(initialized<0)return initialized; currentFilter = new OfficeMessageFilter(); IOleMessageFilter oldFilter; return CoRegisterMessageFilter(currentFilter, out oldFilter); }
  [StructLayout(LayoutKind.Sequential)] public struct Rect { public int Left, Top, Right, Bottom; }
  [StructLayout(LayoutKind.Sequential)] public struct Point { public int X, Y; }
  [StructLayout(LayoutKind.Sequential)] struct MonitorInfo { public int Size; public Rect Monitor, Work; public uint Flags; }
  [DllImport("user32.dll")] static extern IntPtr MonitorFromPoint(Point point, uint flags);
  [DllImport("user32.dll", EntryPoint="GetMonitorInfoW")] static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfo info);
  public static Rect MonitorBounds(int x, int y) {
    var handle = MonitorFromPoint(new Point { X=x, Y=y }, 0);
    var info = new MonitorInfo { Size=Marshal.SizeOf(typeof(MonitorInfo)) };
    if (handle==IntPtr.Zero || !GetMonitorInfo(handle,ref info))
      throw new InvalidOperationException("Izabrani ekran više nije dostupan. Proveri režim Proširi (Win+P) i raspored u Ekranima.");
    return info.Monitor;
  }
  [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr h, out Rect rect);
  [DllImport("user32.dll")] static extern bool IsIconic(IntPtr h);
  [DllImport("user32.dll")] static extern bool IsZoomed(IntPtr h);
  [DllImport("user32.dll")] static extern bool ShowWindowAsync(IntPtr h,int command);
  public static long Handle(long h) { return h < 0 ? (long)unchecked((uint)h) : h; }
  public static void Restore(long h) { IntPtr w=new IntPtr(Handle(h)); if(IsIconic(w)||IsZoomed(w))ShowWindowAsync(w,9); }
  public delegate bool EnumProc(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc fn, IntPtr p);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  public static bool Visible(long h) { return h != 0 && IsWindowVisible(new IntPtr(Handle(h))); }
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr h,StringBuilder s,int n);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h,StringBuilder s,int n);
  [DllImport("user32.dll",SetLastError=true)] public static extern bool SetWindowPos(IntPtr h,IntPtr after,int x,int y,int width,int height,uint flags);
  [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
  [DllImport("user32.dll")] static extern uint GetDpiForWindow(IntPtr window);
  public static void DpiAware() { try { SetThreadDpiAwarenessContext(new IntPtr(-4)); } catch {} }
  public static long[] Windows(long app) {
    if(app==0)return PowerPointWindows();
    uint pid; GetWindowThreadProcessId(new IntPtr(Handle(app)),out pid);
    var result=new List<long>();
    EnumWindows(delegate(IntPtr h,IntPtr p) {
      uint owner; GetWindowThreadProcessId(h,out owner);
      if(owner==pid && IsWindowVisible(h))result.Add(h.ToInt64());return true;
    },IntPtr.Zero);return result.ToArray();
  }
  public static long[] PowerPointWindows() {
    var ids=new HashSet<uint>();
    foreach(var process in Process.GetProcessesByName("POWERPNT")) { ids.Add((uint)process.Id); process.Dispose(); }
    var result=new List<long>();
    EnumWindows(delegate(IntPtr h,IntPtr p) { uint owner;GetWindowThreadProcessId(h,out owner);if(ids.Contains(owner)&&IsWindowVisible(h))result.Add(h.ToInt64());return true; },IntPtr.Zero);
    return result.ToArray();
  }
  public static bool DocumentTitle(long h, string name) {
    var title=Describe(h).Title;
    var stem=Path.GetFileNameWithoutExtension(name);
    var extension=Path.GetExtension(name);
    if (String.IsNullOrEmpty(stem)) return false;
    var document=Regex.Escape(stem) + (String.IsNullOrEmpty(extension) ? "" : "(?:" + Regex.Escape(extension) + ")?");
    const RegexOptions flags=RegexOptions.IgnoreCase|RegexOptions.CultureInvariant;
    return Regex.IsMatch(title, "^"+document+@"(?=\s*(?:\[|[-–—]\s|$))", flags)
      || Regex.IsMatch(title, @"\["+document+@"(?=\s*(?:\[|\]))", flags);
  }
  public static long[] DocumentRoots(string name) {
    var result=new List<long>();
    foreach(long h in PowerPointWindows())
      if(Describe(h).ClassName=="PPTFrameClass" && DocumentTitle(h,name)) result.Add(h);
    return result.ToArray();
  }
  public static bool ShowGeometry(long h,double x,double y,double width,double height) {
    var frame=Describe(h);uint dpi=96;try { dpi=GetDpiForWindow(new IntPtr(h)); }catch{}
    foreach(double scale in new double[]{96.0/72.0,dpi/72.0})if(Math.Abs(frame.X-x*scale)<=8&&Math.Abs(frame.Y-y*scale)<=8&&Math.Abs(frame.Width-width*scale)<=8&&Math.Abs(frame.Height-height*scale)<=8)return true;
    return false;
  }
  public static bool IsPresenter(long h) {
    var cls=new StringBuilder(256);GetClassName(new IntPtr(Handle(h)),cls,256);
    var text=new StringBuilder(512);GetWindowText(new IntPtr(Handle(h)),text,512);
    return cls.ToString().IndexOf("screenClass",StringComparison.OrdinalIgnoreCase)>=0 || cls.ToString().IndexOf("Podium",StringComparison.OrdinalIgnoreCase)>=0 || text.ToString().IndexOf("Presenter",StringComparison.OrdinalIgnoreCase)>=0;
  }
  public static PptWindowInfo Describe(long h) {
    IntPtr handle=new IntPtr(Handle(h)); var cls=new StringBuilder(256);var text=new StringBuilder(512);Rect rect;
    GetClassName(handle,cls,256);GetWindowText(handle,text,512);GetWindowRect(handle,out rect);
    uint pid;GetWindowThreadProcessId(handle,out pid);
    return new PptWindowInfo { Handle=Handle(h),ClassName=cls.ToString(),Title=text.ToString(),X=rect.Left,Y=rect.Top,Width=rect.Right-rect.Left,Height=rect.Bottom-rect.Top,ProcessId=pid };
  }
  [DllImport("dwmapi.dll")] static extern int DwmGetWindowAttribute(IntPtr window, int attribute, out Rect rect, int size);
  static bool SameBounds(Rect rect, int x, int y, int width, int height) {
    return Math.Abs(rect.Left-x)<=2 && Math.Abs(rect.Top-y)<=2 &&
      Math.Abs(rect.Right-(x+width))<=2 && Math.Abs(rect.Bottom-(y+height))<=2;
  }
  public static bool Matches(long h,int x,int y,int width,int height) {
    var handle = new IntPtr(Handle(h));
    Rect rect;
    if (GetWindowRect(handle, out rect) && SameBounds(rect,x,y,width,height)) return true;
    try {
      return DwmGetWindowAttribute(handle,9,out rect,Marshal.SizeOf(typeof(Rect))) == 0 && SameBounds(rect,x,y,width,height);
    } catch { return false; }
  }
  public static void Move(long h,int x,int y,int width,int height) {
    if(!SetWindowPos(new IntPtr(Handle(h)),IntPtr.Zero,x,y,width,height,0x0010|0x0004|0x0020))throw new System.ComponentModel.Win32Exception(Marshal.GetLastWin32Error(),"PowerPoint prozor nije moguće postaviti na izabrani ekran.");
  }
}
'@
[PptDisplay]::DpiAware()
function Get-NativeMonitorRectangle($bounds) {
  if ($null -eq $bounds.monitorPoint) { return $bounds }
  $point = $bounds.monitorPoint
  $rect = [PptDisplay]::MonitorBounds($point.x, $point.y)
  return @{
    x=$rect.Left; y=$rect.Top
    width=($rect.Right-$rect.Left); height=($rect.Bottom-$rect.Top)
  }
}

function Get-DocumentRoot($application,$deck) {
  $name = [string]$deck.Name
  $deadline = [DateTime]::UtcNow.AddSeconds(5)
  do {
    $activeWindow = $null
    try { $activeWindow = $application.ActiveWindow } catch { }
    foreach ($owner in @($activeWindow, $application)) {
      $handle = 0
      try { $handle = [PptDisplay]::Handle([long]$owner.HWND) } catch { }
      if ($handle -ne 0 -and [PptDisplay]::DocumentTitle($handle,$name)) { return $handle }
    }
    $roots = @([PptDisplay]::DocumentRoots($name))
    if ($roots.Count -eq 1) { return $roots[0] }
    Start-Sleep -Milliseconds 100
  } while ([DateTime]::UtcNow -lt $deadline)
  throw 'PowerPoint editor izabrane prezentacije nije jednoznačno pronađen.'
}

function Select-SlideShowCandidate([long[]]$matches,[long[]]$before,$show) {
  $fresh = @($matches | Where-Object {$before -notcontains $_})
  if ($fresh.Count -eq 1) { return $fresh[0] }
  if ($matches.Count -eq 1) { return $matches[0] }
  if ($matches.Count -gt 1) {
    # Office coordinates are only a tie-breaker. Origins may be virtualized
    # differently from the window's size on displays with mixed scaling.
    try {
      $geometry = @($matches | Where-Object {
        [PptDisplay]::ShowGeometry($_,$show.Left,$show.Top,$show.Width,$show.Height)
      })
      if ($geometry.Count -eq 1) { return $geometry[0] }
    } catch { }
  }
  return 0
}

function Get-SlideShowHandle($show,[long]$rootHandle,[long[]]$before) {
  $handle = 0
  try { $handle = [PptDisplay]::Handle([long]$show.HWND) } catch { }
  $name = [string]$show.Presentation.Name
  $deadline = [DateTime]::UtcNow.AddSeconds(5)
  do {
    $windows = @([PptDisplay]::Windows($rootHandle))
    if ($handle -ne 0 -and $handle -ne $rootHandle -and $windows -contains $handle) { return $handle }
    $matches = @($windows | Where-Object {
      $_ -ne $rootHandle -and [PptDisplay]::Describe($_).ClassName -eq 'screenClass' -and
      [PptDisplay]::DocumentTitle($_,$name)
    })
    $selected = Select-SlideShowCandidate $matches $before $show
    if ($selected -ne 0) { return $selected }
    Start-Sleep -Milliseconds 100
  } while ([DateTime]::UtcNow -lt $deadline)
  throw 'PowerPoint nije jednoznačno otvorio prozor sa slajdovima.'
}

function Get-VerifiedNativeOutputs($handles,$options) {
  $results = @()
  foreach ($role in @('slides','notes')) {
    $handle = $handles[$role]
    if ($null -eq $handle) { continue }
    $bounds = if ($role -eq 'slides') { $options.audience } else { $options.control }
    if (-not [PptDisplay]::Visible($handle) -or
        -not [PptDisplay]::Matches($handle,$bounds.x,$bounds.y,$bounds.width,$bounds.height)) {
      throw 'PowerPoint prozor je napustio dodeljeni ekran. Prikaz je zaustavljen.'
    }
    $results += @{role=$role;handle=$handle;bounds=$bounds}
  }
  return $results
}
function Set-ProjectionWindows($application,$show,$options,[long]$rootHandle=0,[long[]]$before=@()) {
  if ($null -eq $options.control -or $null -eq $options.audience) { throw 'Nedostaje raspored izlaznih ekrana.' }
  $audience=$options.audience; $control=$options.control
  if($rootHandle -eq 0){$rootHandle=Get-DocumentRoot $application $show.Presentation}
  $slides=Get-SlideShowHandle $show $rootHandle $before
  if($slides -eq 0){throw 'PowerPoint nije otvorio prozor sa slajdovima.'}
  $presenter=0
  if($options.showPresenter -ne $false){
    $deadline=[DateTime]::UtcNow.AddSeconds(15)
    do {
      $candidates=@([PptDisplay]::Windows($rootHandle) | Where-Object { $_ -ne $slides -and $_ -ne $rootHandle -and [PptDisplay]::IsPresenter($_) })
      $fresh=@($candidates | Where-Object { $before -notcontains $_ })
      $matching = @($candidates | Where-Object { [PptDisplay]::DocumentTitle($_,[string]$show.Presentation.Name) })
      if($matching.Count -eq 1){$presenter=$matching[0]}
      elseif($fresh.Count -eq 1){$presenter=$fresh[0]}
      if($presenter -eq 0){Start-Sleep -Milliseconds 100}
    } while($presenter -eq 0 -and [DateTime]::UtcNow -lt $deadline)
    if($presenter -eq 0){throw 'PowerPoint nije otvorio Presenter View. Otvori Ekrane i izaberi Slajdovi za publiku i Samo kontrole na svom ekranu, ili proveri režim Proširi (Win+P).'}
    [PptDisplay]::Restore($presenter)
  }
  # Office can asynchronously reposition a full-screen window after Run returns.
  $placed=$false
  for($attempt=0;$attempt -lt 8;$attempt++){
    [PptDisplay]::Move($slides,$audience.x,$audience.y,$audience.width,$audience.height)
    if($presenter -ne 0){[PptDisplay]::Move($presenter,$control.x,$control.y,$control.width,$control.height)}
    Start-Sleep -Milliseconds 150
    $placed=[PptDisplay]::Matches($slides,$audience.x,$audience.y,$audience.width,$audience.height)
    if($presenter -ne 0){$placed=$placed -and [PptDisplay]::Matches($presenter,$control.x,$control.y,$control.width,$control.height)}
    if($placed){break}
  }
  if(-not $placed){throw 'PowerPoint nije zadržao izabrani raspored monitora. Proveri Windows Proširi ekrane i ponovi GO.'}
  $handles=@{slides=$slides};if($presenter -ne 0){$handles.notes=[PptDisplay]::Handle($presenter)}
  return $handles
}
