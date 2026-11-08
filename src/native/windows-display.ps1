Add-Type -TypeDefinition @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class PptDisplay {
  public delegate bool EnumProc(IntPtr h, IntPtr p);
  [DllImport("user32.dll")] static extern bool EnumWindows(EnumProc fn, IntPtr p);
  [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetClassName(IntPtr h,StringBuilder s,int n);
  [DllImport("user32.dll",CharSet=CharSet.Unicode)] static extern int GetWindowText(IntPtr h,StringBuilder s,int n);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h,IntPtr after,int x,int y,int width,int height,uint flags);
  [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
  public static void DpiAware() { try { SetThreadDpiAwarenessContext(new IntPtr(-4)); } catch {} }
  public static long[] Windows(long app) {
    uint pid; GetWindowThreadProcessId(new IntPtr(app),out pid);
    var result=new List<long>();
    EnumWindows(delegate(IntPtr h,IntPtr p) {
      uint owner; GetWindowThreadProcessId(h,out owner);
      if(owner==pid && IsWindowVisible(h))result.Add(h.ToInt64());return true;
    },IntPtr.Zero);return result.ToArray();
  }
  public static bool IsPresenter(long h) {
    var cls=new StringBuilder(256);GetClassName(new IntPtr(h),cls,256);
    var text=new StringBuilder(512);GetWindowText(new IntPtr(h),text,512);
    return cls.ToString().IndexOf("screenClass",StringComparison.OrdinalIgnoreCase)>=0 || cls.ToString().IndexOf("Podium",StringComparison.OrdinalIgnoreCase)>=0 || text.ToString().IndexOf("Presenter",StringComparison.OrdinalIgnoreCase)>=0;
  }
  public static void Move(long h,int x,int y,int width,int height) {
    if(!SetWindowPos(new IntPtr(h),IntPtr.Zero,x,y,width,height,0x0010|0x0004|0x0020))throw new Exception("PowerPoint prozor nije moguće postaviti na izabrani ekran.");
  }
}
'@
[PptDisplay]::DpiAware()
function Set-ProjectionWindows($application,$show,$options) {
  if ($null -eq $options.control -or $null -eq $options.audience) { return }
  $audience=$options.audience; $control=$options.control
  [PptDisplay]::Move([long]$show.HWND,$audience.x,$audience.y,$audience.width,$audience.height)
  if($options.showPresenter -eq $false){return @{slides=[long]$show.HWND}}
  $presenter=0
  for($attempt=0;$attempt -lt 30 -and $presenter -eq 0;$attempt++) {
    foreach($handle in [PptDisplay]::Windows([long]$application.HWND)) {
      if($handle -ne [long]$show.HWND -and $handle -ne [long]$application.HWND -and [PptDisplay]::IsPresenter($handle)) { $presenter=$handle;break }
    }
    if($presenter -eq 0) { Start-Sleep -Milliseconds 100 }
  }
  if($presenter -eq 0) { throw 'PowerPoint Presenter View nije otvoren. Proveri da li su priključena dva odvojena ekrana.' }
  [PptDisplay]::Move($presenter,$control.x,$control.y,$control.width,$control.height)
  return @{slides=[long]$show.HWND;notes=[long]$presenter}
}
