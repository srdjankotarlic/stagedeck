const { app, BrowserWindow, ipcMain, dialog, shell, screen, nativeImage, Menu, nativeTheme, systemPreferences, globalShortcut } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const http = require('node:http');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const runFile = promisify(execFile);
const { WebSocketServer, WebSocket } = require('ws');
const AdmZip = require('adm-zip');
const { makeEvent, loadLibrary, saveLibrary, collectFiles, allocateFiles, samePath } = require('./library.cjs');
const { PowerPoint } = require('./powerpoint.cjs');
const { planDisplays } = require('./displays.cjs');
const { rolePlan,validateRoles } = require('./role-plan.cjs');
const { placeSource } = require('./source-placement.cjs');
const { MirrorOutputs } = require('./mirror-outputs.cjs');
app.setName('StageDeck');
app.setPath('userData', process.env.STAGEDECK_TEST_DATA || path.join(app.getPath('appData'), 'StageDeck'));
if (!app.requestSingleInstanceLock()) app.quit();
let mainWindow, pdfWindow, library, libraryFile, server, wss, watching = false, mirrors;
const pdfWindows=new Set(),identificationWindows=new Set(),outputGuards=new Map();
let live = null, busy = false, polling = false, loading = null, lastError = '', pptError = '', lastWatch = 0;
const errors = new Map(), ppt = new PowerPoint(), devices = new Map();
let keyImages = [];
let managedPresentation = null, projectionPlan = null, screenChangePending=false;
const bridgePort = Number(process.env.STAGEDECK_TEST_PORT || 49361);
const event = () => library.events.find(e => e.id === library.currentEvent) || library.events[0];
const resources = () => app.isPackaged ? process.resourcesPath : path.join(__dirname, '..');
const persist = () => saveLibrary(libraryFile, library);
const allSlots = () => library.events.flatMap(e => e.slots.filter(Boolean));
const findSlot = id => allSlots().find(s => s.id === id);
function appControlId() {
  return mainWindow&&!mainWindow.isDestroyed()?screen.getDisplayMatching(mainWindow.getBounds()).id:screen.getPrimaryDisplay().id;
}
function outputPlan(){return rolePlan(screen.getAllDisplays(),appControlId(),projectionPlan?.assignments?{...library,displayRoles:projectionPlan.assignments,displayLabels:projectionPlan.labels}:library);}
function displayPlan() {
  const plan=outputPlan(),displays=screen.getAllDisplays();
  const notes=displays.find(d=>d.id===projectionPlan?.notesId)||plan.notesRoot;
  const slides=displays.find(d=>d.id===projectionPlan?.slidesId)||plan.slidesRoot;
  return {control:notes||plan.control,audience:slides||notes||plan.control,separate:!!notes&&!!slides,audienceIndex:displays.indexOf(slides||notes||plan.control)+1};
}
function routingOptions() {
  const plan=displayPlan();
  const rect=display=>process.platform==='win32'?screen.dipToScreenRect(null,display.bounds):display.bounds;
  return {control:rect(plan.control),audience:rect(plan.audience),audienceIndex:plan.audienceIndex,separate:plan.separate,showPresenter:outputPlan().notes.length>0,hideSlides:outputPlan().slides.length===0};
}
const displayRecovery = () => path.join(app.getPath('userData'), 'displays-recovery.json');
async function macDisplays(operation, controlId) {
  if (process.platform !== 'darwin') return null;
  const helper = path.join(__dirname, 'native/display-helper').replace(/app\.asar([\\/])/, 'app.asar.unpacked$1');
  const {stdout} = await runFile(helper, [operation, displayRecovery(), ...(controlId ? [String(controlId)] : [])], {timeout:10000});
  return JSON.parse(stdout);
}
async function prepareProjection(){
 const roles=outputPlan();
 if(roles.missing.length)throw Error('Dodeljeni ekran nije priključen. Proveri Ekrane pre pokretanja; prikaz neće biti preusmeren na drugi monitor.');
 if(!roles.hasOutput)throw Error('U Ekranima izaberi bar jedan Notes ili Slajdovi izlaz.');
 if(!mirrors.permission())throw Error('Za izabrani raspored PowerPoint prikaza dozvoli StageDeck u macOS Screen & System Audio Recording, pa ponovo pokreni aplikaciju.');
 projectionPlan={labels:Object.fromEntries(screen.getAllDisplays().map(d=>[d.id,d.label])),assignments:{...roles.assignments},appControlId:roles.control.id,notesId:roles.notesRoot?.id,slidesId:roles.slidesRoot?.id};
 await guardOutputs();
 const options=routingOptions();
 if(process.platform==='darwin')options.showPresenter=true;
 else if(!roles.notes.length)options.control=screen.dipToScreenRect(null,roles.slidesRoot.bounds);
 return options;
}
async function coverNativeSources(file){
  const plan=outputPlan(),hosts=[...plan.notes,...plan.slides],unused=screen.getAllDisplays().filter(d=>!hosts.some(h=>h.id===d.id));
  const {intersection}=require('./source-placement.cjs');
  for(let attempt=0;attempt<3;attempt++){
    const layout=await ppt.execute('layout',file);
    const notes=layout.windows.find(w=>w.buttons>=4),slides=layout.windows.find(w=>w.buttons===0);
    const np=notes&&plan.notes.length?placeSource(notes,plan.notes,unused):{x:-30000,y:-30000};
    const sp=slides&&plan.slides.length?placeSource(slides,plan.slides,unused):{x:-30000,y:-30000};
    const host=hosts[0].bounds;
    await ppt.execute('place-sources',file,'',{positions:[np.x,np.y,sp.x,sp.y,host.x+20,host.y+20,Math.min(1300,host.width-40),Math.min(800,host.height-40)]});
    // PowerPoint may perform a second asynchronous window layout after launch.
    await new Promise(resolve=>setTimeout(resolve,200));
    const actual=await ppt.execute('layout',file);
    if(!actual.windows.some(w=>unused.some(d=>intersection(w,d.bounds)>0)))return;
  }
  throw Error('PowerPoint je pomerio prozor na kontrolni ekran. Izlaz je zaustavljen da ne bi pokazao pogrešan sadržaj.');
}
async function restoreProjection(){
 if(process.platform==='darwin'&&fs.existsSync(displayRecovery()))await macDisplays('restore');
 projectionPlan=null;
}
function state() {
  return {
    name: 'StageDeck', version: app.getVersion(), platform: process.platform, theme: library.theme || 'light',
    routing: { controlId: appControlId(), notesIds:outputPlan().notes.map(d=>d.id), slidesIds:outputPlan().slides.map(d=>d.id), audienceId:displayPlan().audience.id, separate:displayPlan().separate, roles:outputPlan().assignments, missing:outputPlan().missing, custom:!!library.displayRoles, mirrors:mirrors?.snapshot()||[], captureAllowed:process.platform!=='darwin'||systemPreferences.getMediaAccessStatus('screen')==='granted' },
    firstRun: !library.setupSeen,
    events: library.events.map(e => ({ id: e.id, name: e.name })),
    current: { ...event(), slots: event().slots.map(s => s ? { ...s, missing: !fs.existsSync(s.path), error: errors.get(s.id) || '' } : null) },
    live, busy, loading, lastError, pptError,
    devices: [...devices.values()],
    displays: screen.getAllDisplays().map((d,i) => ({ id: d.id, label: d.label || `Ekran ${i + 1}`, width: d.size.width, height: d.size.height, bounds: d.bounds, internal: d.internal, primary: d.id === screen.getPrimaryDisplay().id })),
    displayId: library.displayId,
    bridge: { connected: devices.size > 0, port: bridgePort }
  };
}
function publish() {
  const snapshot = state();
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('state', snapshot);
  if (wss) for (const client of wss.clients) if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'state', state: snapshot }));
}
function fail(error, slot) {
  lastError = error.message || String(error);
  if (slot) errors.set(slot.id, lastError);
  publish();
  return { ok: false, error: lastError };
}
function createMainWindow() {
  mainWindow = new BrowserWindow({ width: 1430, height: 940, minWidth: 1060, minHeight: 760, title: 'StageDeck', backgroundColor: library.theme === 'dark' ? '#171b23' : '#f4f5f7', titleBarStyle: 'hiddenInset', trafficLightPosition: { x: 20, y: 19 }, show: false, icon: path.join(__dirname, '../assets/icon.png'), webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  mainWindow.on('move', () => publish());
  mainWindow.loadFile(path.join(__dirname, '../ui/index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('close', e => { if (live && !app.isQuitting) { e.preventDefault(); mainWindow.hide(); } });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) e.preventDefault(); });
}
async function thumbnail(slot) {
  try {
    if (slot.kind === 'pdf') return;
    if (['pptx','pptm','ppsx'].includes(slot.kind)) {
      const zip = new AdmZip(slot.path);
      slot.slides = zip.getEntries().filter(e => /^ppt\/slides\/slide\d+\.xml$/.test(e.entryName)).length;
      const entry = zip.getEntries().find(e => /^docProps\/thumbnail\.(jpeg|jpg|png|wmf)$/i.test(e.entryName));
      if (entry && !/wmf$/i.test(entry.entryName)) {
        const buffer = entry.getData();
        const img = nativeImage.createFromBuffer(buffer);
        if (!img.isEmpty()) slot.thumbnail = img.resize({ width: 480 }).toDataURL();
      }
    }
    if (!slot.thumbnail && process.platform === 'darwin') {
      const image = await nativeImage.createThumbnailFromPath(slot.path, { width: 480, height: 270 });
      if (!image.isEmpty()) slot.thumbnail = image.toDataURL();
    }
    if (!slot.thumbnail && process.platform === 'win32') {
      const output = path.join(app.getPath('userData'), `preview-${slot.id}.png`);
      try {
        const result = await ppt.execute('thumbnail', slot.path, output);
        slot.thumbnail = nativeImage.createFromPath(output).resize({ width: 480 }).toDataURL();
        if (result.total) slot.slides = result.total;
      } finally { fs.rmSync(output, { force: true }); }
    }
  } catch { /* A file without an embedded preview still remains playable. */ }
}
async function addFiles(paths, index) {
  const collected = collectFiles(paths);
  if (!collected.length) throw Error('Izaberi PowerPoint (.pptx, .ppt, .ppsx, .pptm) ili PDF fajlove.');
  const { added, skipped } = allocateFiles(event(), collected, index);
  persist(); publish();
  for (const slot of added) { await thumbnail(slot); persist(); publish(); }
  return { ok: true, count: added.length, skipped };
}
async function stopLive({keepGuards=false}={}) {
  const current=live||(managedPresentation?{kind:'pptx',path:managedPresentation}:null);
  if(current&&current.kind!=='pdf')await guardOutputs();
  mirrors?.stop();
  const windows=[...pdfWindows];pdfWindows.clear();pdfWindow=null;
  for(const win of windows)if(!win.isDestroyed())win.destroy();
  if(current&&current.kind!=='pdf')await ppt.execute('stop',current.path);
  managedPresentation=null;
  await restoreProjection();
  live=null;
  if(!keepGuards)clearGuards();
  mainWindow?.setAlwaysOnTop(false);mainWindow?.show();mainWindow?.focus();publish();
}
async function pollPpt() {
  if (busy || polling || !managedPresentation) return;
  polling = true;
  try {
    const result = await ppt.execute('status');
    if (busy) return;
    pptError = '';
    if (live?.kind === 'pdf') return;
    const windows = result.windows || [];
    const match=windows.find(w=>samePath(w.path,managedPresentation));
    if (match) {
      const slot = event().slots.find(s => s && samePath(s.path, match.path));
      live = { id: slot.id, path: slot.path, kind: slot.kind, name: slot.name, slide: match.slide, total: match.total, state: match.state };
    } else {
      if(managedPresentation){await guardOutputs();mirrors?.stop();await ppt.execute('close',managedPresentation);managedPresentation=null;await restoreProjection();clearGuards();}
      live = null;
    }
  } catch(error){pptError=error.message;}
  finally { polling = false; publish(); }
}
async function toggle(index) {
  if(app.isQuitting)throw Error('StageDeck se zatvara.');
  if (!Number.isInteger(index) || index < 0 || index > 31) throw Error('Nepostojeći taster.');
  if (busy) return { ok: false, error: 'Sačekaj da se prethodna komanda završi.' };
  const slot = event().slots[index]; if (!slot) return { ok: true };
  if (!fs.existsSync(slot.path)) throw Error('Fajl nije pronađen. Ponovo poveži ili zameni prezentaciju.');
  busy = true; screenChangePending=false; loading = slot.id; lastError = ''; errors.delete(slot.id); publish();
  try {
    if (live?.id === slot.id) { await stopLive(); return { ok: true }; }
    await stopLive({keepGuards:true});
    if (slot.kind === 'pdf') {
      const plan=outputPlan();
      if(plan.missing.length)throw Error('Dodeljeni ekran nije priključen. Proveri Ekrane.');
      if(!plan.slides.length)throw Error('Za PDF izaberi bar jedan Slajdovi ekran.');
      projectionPlan={labels:Object.fromEntries(screen.getAllDisplays().map(d=>[d.id,d.label])),assignments:{...plan.assignments},appControlId:plan.control.id};
      live={id:slot.id,path:slot.path,name:slot.name,kind:'pdf',slide:1,total:slot.slides};
      const loaded=[];
      for(const display of plan.slides){
        const win=new BrowserWindow({...display.bounds,fullscreen:true,backgroundColor:'#000000',autoHideMenuBar:true,title:slot.name,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
        pdfWindows.add(win);pdfWindow ||= win;
        win.on('closed',()=>{if(pdfWindows.delete(win)&&live?.id===slot.id)command('stop');});
        loaded.push(win.loadFile(path.join(__dirname,'../ui/pdf.html'),{query:{id:slot.id}}));
      }
      await Promise.all(loaded);
    } else {
      const options=await prepareProjection();
      const started=await ppt.execute('start',slot.path,'',options);
      if(process.platform==='darwin'){
        const wanted=outputPlan(),deadline=Date.now()+15000;let ready=false;
        while(Date.now()<deadline){const layout=await ppt.execute('layout',slot.path);if((!wanted.notes.length||layout.windows.some(w=>w.buttons>=4))&&(!wanted.slides.length||layout.windows.some(w=>w.buttons===0))){ready=true;break;}await new Promise(resolve=>setTimeout(resolve,200));}
        if(!ready)throw Error('PowerPoint prikaz još nije spreman. Proveri dijaloge u PowerPointu pa ponovi GO.');
      }
      await mirrors.start(slot.path,{...outputPlan(),mirrorAll:true},started.handles||{});
      if(process.platform==='darwin')await coverNativeSources(slot.path);
      const result = await ppt.execute('status');
      const match = (result.windows || []).find(w => samePath(w.path, slot.path));
      if (!match) throw Error('Slideshow nije pokrenut. Proveri da li PowerPoint čeka potvrdu ili dozvolu.');
      if(screenChangePending)throw Error('Ekran je odvojen tokom pokretanja. Proveri raspored pa ponovi.');
      managedPresentation = slot.path;
      live = { id: slot.id, path: slot.path, name: slot.name, kind: slot.kind, slide: match.slide, total: match.total, state: match.state };
      pptError = '';
    }
    clearGuards();
    return { ok: true };
  } catch (error) {
    mirrors?.stop();
    for(const win of pdfWindows)if(!win.isDestroyed())win.destroy();pdfWindows.clear();pdfWindow=null;live=null;
    if(slot.kind!=='pdf')await ppt.execute('stop',slot.path).catch(()=>{});
    await restoreProjection().catch(()=>{});
    clearGuards();
    return fail(error, slot);
  }
  finally {busy=false;loading=null;publish();if(screenChangePending){screenChangePending=false;setImmediate(()=>command('stop'));}}
}
async function navigate(direction) {
  if (!live || busy) return { ok: true };
  busy = true;
  try {
    if(live.kind==='pdf')for(const win of pdfWindows)win.webContents.send('pdf:command',direction);
    else await ppt.execute(direction, live.path);
    return { ok: true };
  } finally { busy = false; }
}
function assertEditable() {
  if (busy) throw Error('Sačekaj završetak komande.');
  if (event().locked) throw Error('Raspored je zaključan.');
}
async function command(name, payload = {}) {
  try {
    switch (name) {
      case 'toggle': return await toggle(payload.index);
      case 'play': {
        // App GO is idempotent and identifies a document, not a mutable key position.
        const index=event().slots.findIndex(slot=>slot?.id===payload.id);
        if(payload.eventId!==event().id||index<0)throw Error('Ponovo izaberi prezentaciju.');
        if(live?.id===payload.id)return {ok:true};
        return await toggle(index);
      }
      case 'next': case 'previous': return await navigate(name);
      case 'stop': {
        if (busy) return { ok: false, error: 'Sačekaj završetak komande.' };
        busy = true; try { await stopLive(); } finally { busy = false; publish(); } return { ok: true };
      }
      case 'pick-files': {
        assertEditable(); const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile', 'multiSelections'], filters: [{ name: 'Prezentacije', extensions: ['pptx','ppt','ppsx','pps','pptm','pdf'] }] });
        return result.canceled ? { ok: true } : await addFiles(result.filePaths, payload.index);
      }
      case 'import': assertEditable(); return await addFiles(payload.paths || [], payload.index);
      case 'watch-folder': {
        assertEditable(); const result = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
        if (result.canceled) return { ok: true };
        event().folder = result.filePaths[0]; persist();
        const files = collectFiles([event().folder]);
        return files.length ? await addFiles(files) : (publish(), { ok: true });
      }
      case 'unwatch': event().folder = ''; persist(); break;
      case 'lock': event().locked = !event().locked; persist(); break;
      case 'move': {
        assertEditable();
        const { from, to } = payload;
        if (![from,to].every(n => Number.isInteger(n) && n >= 0 && n < 32)) throw Error('Nepostojeći taster.');
        if (live && [event().slots[from]?.id, event().slots[to]?.id].includes(live.id)) throw Error('Aktivna prezentacija ostaje na svom tasteru do kraja prikaza.');
        [event().slots[from],event().slots[to]] = [event().slots[to],event().slots[from]]; persist(); break;
      }
      case 'remove': {
        assertEditable(); const slot = event().slots[payload.index];
        if (slot?.id === live?.id) throw Error('Prvo zatvori aktivnu prezentaciju.');
        if (Number.isInteger(payload.index) && payload.index >= 0 && payload.index < 32) event().slots[payload.index] = null;
        persist(); break;
      }
      case 'rename-slot': case 'reset-slot-name': {
        assertEditable(); const slot = event().slots[payload.index];
        if (!slot) throw Error('Izaberi prezentaciju.');
        const label = name === 'reset-slot-name' ? path.basename(slot.path, path.extname(slot.path)) : typeof payload.name === 'string' ? payload.name.trim().slice(0,100) : '';
        if (!label) throw Error('Unesi naziv prezentacije.');
        if(payload.id&&payload.id!==slot.id)throw Error('Prezentacija je promenila mesto. Ponovi izmenu naziva.');
        slot.name = label;
        if (live?.id === slot.id) live.name = label;
        if(live?.id===slot.id)for(const win of pdfWindows)win.setTitle(label);
        persist(); break;
      }
      case 'key-label': {
        assertEditable();const slot=event().slots[payload.index];if(!slot)throw Error('Izaberi prezentaciju.');
        if(payload.id&&payload.id!==slot.id)throw Error('Prezentacija je promenila mesto. Ponovi izmenu.');
        if(typeof payload.label!=='string'||payload.label.length>80)throw Error('Naziv tastera može imati do 80 znakova.');
        if(!['auto','large','normal'].includes(payload.size)&&!(Number.isInteger(payload.size)&&payload.size>=12&&payload.size<=64))throw Error('Nepostojeća veličina slova.');
        if(payload.layout!==undefined&&!['title','preview'].includes(payload.layout))throw Error('Nepostojeći prikaz tastera.');
        slot.keyLabel=payload.label.trim();slot.keyFontSize=payload.size;
        if(payload.layout!==undefined)slot.keyLayout=payload.layout;
        persist();break;
      }
      case 'display-roles':
        if(live||busy)throw Error('Zatvori prezentaciju pre promene ekrana.');
        library.displayRoles=validateRoles(payload.roles,screen.getAllDisplays());
        library.displayLabels=Object.fromEntries(screen.getAllDisplays().map(d=>[d.id,d.label]));persist();break;
      case 'display-roles-auto':
        if(live||busy)throw Error('Zatvori prezentaciju pre promene ekrana.');
        delete library.displayRoles;delete library.displayLabels;persist();break;
      case 'identify-displays': return identifyDisplays();
      case 'replace': {
        assertEditable(); const index = payload.index; const old = event().slots[index];
        if (!old) throw Error('Izaberi postojeću prezentaciju.');
        if (old.id === live?.id) throw Error('Prvo zatvori aktivnu prezentaciju.');
        const result = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'], filters: [{ name: 'Prezentacije', extensions: ['pptx','ppt','ppsx','pps','pptm','pdf'] }] });
        if (result.canceled) return { ok: true };
        if (event().slots.some((s,i) => i !== index && s && samePath(s.path, result.filePaths[0]))) throw Error('Ta prezentacija je već na drugom tasteru. Prevuci postojeći taster na željeno mesto.');
        event().slots[index] = null;
        try { return await addFiles(result.filePaths, index); } catch (e) { event().slots[index] = old; persist(); throw e; }
      }
      case 'reveal': { const slot = event().slots[payload.index]; if (slot) shell.showItemInFolder(slot.path); break; }
      case 'event-new': {
        if (live || busy) throw Error('Prvo zatvori aktivnu prezentaciju.');
        const item = makeEvent(String(payload.name || 'Novi događaj').trim().slice(0,100)); library.events.push(item); library.currentEvent = item.id; persist(); break;
      }
      case 'event-switch': {
        if (live || busy) throw Error('Prvo zatvori aktivnu prezentaciju.');
        if (library.events.some(e => e.id === payload.id)) library.currentEvent = payload.id; persist(); break;
      }
      case 'event-rename': if (typeof payload.name === 'string' && payload.name.trim()) { event().name = payload.name.trim().slice(0,100); persist(); } break;
      case 'theme':
        if (!['light','dark'].includes(payload.theme)) throw Error('Nepostojeća tema.');
        library.theme = payload.theme; nativeTheme.themeSource = payload.theme;
        mainWindow?.setBackgroundColor(payload.theme === 'dark' ? '#171b23' : '#f4f5f7'); persist(); break;
      case 'setup-seen': library.setupSeen = true; persist(); break;
      case 'desktop-shortcut': return await createDesktopShortcut();
      case 'display': library.displayId = Number(payload.id); persist(); break;
      case 'dismiss-error': lastError = ''; break;
      case 'key-images': {
        if (!Array.isArray(payload.images) || payload.images.length !== 32 || !payload.images.every(i => typeof i === 'string' && i.startsWith('data:image/png;base64,') && i.length < 300000)) return { ok: false };
        keyImages = payload.images;
        if (wss) for (const client of wss.clients) if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'keys', images: keyImages }));
        return { ok: true };
      }
      case 'install-plugin': return await installPlugin();
      case 'import-profile': {
        const profile = path.join(resources(), 'dist', 'StageDeck XL.streamDeckProfile');
        const packaged = path.join(resources(), 'installers', 'StageDeck XL.streamDeckProfile');
        const message = await shell.openPath(fs.existsSync(profile) ? profile : packaged);
        if (message) throw Error(message); return { ok: true };
      }
      default: throw Error('Nepoznata komanda.');
    }
    publish(); return { ok: true };
  } catch (error) { return fail(error); }
}
async function guardOutputs(){
  const plan=outputPlan();
  for(const display of [...plan.notes,...plan.slides]){
    if(outputGuards.has(display.id))continue;
    const window=new BrowserWindow({...display.bounds,frame:false,show:false,alwaysOnTop:true,backgroundColor:'#000000',focusable:false,skipTaskbar:true,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
    outputGuards.set(display.id,window);if(process.platform==='darwin'){window.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});window.setSimpleFullScreen(true);}else window.setFullScreen(true);window.setAlwaysOnTop(true,'screen-saver');
    await window.loadFile(path.join(__dirname,'../ui/black.html'));window.showInactive();
  }
}
function clearGuards(){for(const window of outputGuards.values())if(!window.isDestroyed())window.destroy();outputGuards.clear();}
async function identifyDisplays(){
 if(live||busy)throw Error('Identifikacija ekrana je dostupna kada nema aktivne prezentacije.');
 for(const win of identificationWindows)if(!win.isDestroyed())win.destroy();identificationWindows.clear();
 const windows=screen.getAllDisplays().map((display,i)=>{
  const win=new BrowserWindow({x:display.bounds.x+Math.round((display.bounds.width-340)/2),y:display.bounds.y+Math.round((display.bounds.height-180)/2),width:340,height:180,frame:false,alwaysOnTop:true,skipTaskbar:true,focusable:false,show:false,webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true}});
  identificationWindows.add(win);return {win,display,number:i+1};
 });
 await Promise.all(windows.map(({win,display,number})=>win.loadFile(path.join(__dirname,'../ui/identify.html'),{query:{number:String(number),label:display.label||'Ekran'}})));
 for(const {win} of windows)win.showInactive();
 setTimeout(()=>{for(const {win} of windows){identificationWindows.delete(win);if(!win.isDestroyed())win.destroy();}},2500).unref();
 return {ok:true};
}
async function installPlugin() {
  const installer = path.join(resources(), app.isPackaged ? 'installers' : 'dist', 'com.stagedeck.presentations.streamDeckPlugin');
  const message = await shell.openPath(installer);
  if (message) throw Error('Instaliraj Elgato Stream Deck aplikaciju, pa ponovi povezivanje. ' + message);
  return { ok: true, message: 'Potvrdi instalaciju u Elgato aplikaciji, pa uvezi XL profil.' };
}
async function createDesktopShortcut() {
  if (!app.isPackaged) return { ok: false, message: 'Prečica je dostupna u instaliranoj aplikaciji.' };
  const desktop = app.getPath('desktop');
  if (process.platform === 'win32') {
    const ok = shell.writeShortcutLink(path.join(desktop, 'StageDeck.lnk'), 'create', { target: process.execPath, cwd: path.dirname(process.execPath), description: 'StageDeck', icon: path.join(resources(), 'app.asar.unpacked/assets/icon.ico'), iconIndex: 0 });
    if (!ok) throw Error('Prečicu nije moguće napraviti.');
  } else {
    const target = path.resolve(process.execPath, '../../..');
    const shortcut = path.join(desktop, 'StageDeck.app');
    if (!fs.existsSync(shortcut)) fs.symlinkSync(target, shortcut);
  }
  return { ok: true, message: 'StageDeck prečica je na radnoj površini.' };
}

async function bridge() {
  const token = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(path.join(app.getPath('userData'), 'bridge.json'), JSON.stringify({ port: bridgePort, token }), { mode: 0o600 });
  server = http.createServer((req,res) => { res.writeHead(404); res.end(); });
  wss = new WebSocketServer({ noServer: true, maxPayload: 2048 });
  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://127.0.0.1');
    if (url.pathname !== '/deck' || url.searchParams.get('token') !== token || req.headers.origin) { socket.destroy(); return; }
    wss.handleUpgrade(req,socket,head,client => wss.emit('connection',client));
  });
  wss.on('connection', client => {
    const id = crypto.randomUUID();
    client.on('message', async raw => {
      try {
        const message = JSON.parse(raw.toString());
        if (message.type === 'hello') { devices.set(id, { name: 'Stream Deck', devices: message.devices || [] }); publish(); }
        else if (message.type === 'command' && ['toggle','next','previous','stop'].includes(message.command)) {
          const result = await command(message.command, message.payload);
          if (client.readyState === WebSocket.OPEN) client.send(JSON.stringify({ type: 'result', id: message.id, ...result }));
        }
      } catch { /* Ignore invalid local protocol frames. */ }
    });
    client.on('close', () => { devices.delete(id); publish(); });
    client.on('error', () => {});
    client.send(JSON.stringify({ type: 'state', state: state() }));
    if (keyImages.length) client.send(JSON.stringify({ type: 'keys', images: keyImages }));
  });
  server.on('error', error => { lastError = `Stream Deck veza nije dostupna: ${error.message}`; publish(); });
  server.listen(bridgePort, '127.0.0.1');
}
async function watchTick() {
  if (watching || busy || !event().folder || event().locked || Date.now() - lastWatch < 2000) return;
  watching = true; lastWatch = Date.now();
  try {
    const current = event();
    const files = collectFiles([current.folder]);
    const fresh = files.filter(f => !current.slots.some(s => s && samePath(s.path, f)));
    if (fresh.length && current.slots.includes(null)) await addFiles(fresh);
    for (const slot of current.slots.filter(Boolean)) {
      if (!fs.existsSync(slot.path) || live?.id === slot.id) continue;
      const modified = fs.statSync(slot.path).mtimeMs;
      if (modified !== slot.modified) { slot.modified = modified; slot.thumbnail = ''; await thumbnail(slot); persist(); publish(); }
    }
  } catch { /* Existing slots retain missing-file indications. */ }
  finally { watching = false; }
}
app.whenReady().then(async () => {
  libraryFile = path.join(app.getPath('userData'), 'library.json');
  library = loadLibrary(libraryFile); library.theme ||= 'light'; nativeTheme.themeSource = library.theme; persist();
  ipcMain.handle('state', () => state());
  ipcMain.handle('command', (_, name, payload) => command(name,payload));
  ipcMain.handle('pdf:read', async (_, id) => { const slot = findSlot(id); if (!slot || slot.kind !== 'pdf') throw Error('PDF nije pronađen.'); return fs.promises.readFile(slot.path); });
  ipcMain.handle('pdf:thumbnail', (_, id, data, total) => {
    const slot = findSlot(id);
    if (slot?.kind === 'pdf' && typeof data === 'string' && data.startsWith('data:image/png;base64,') && data.length < 1500000 && Number.isInteger(total) && total > 0) { slot.thumbnail = data; slot.slides = total; if (live?.id === slot.id) live.total = total; persist(); publish(); }
  });
  ipcMain.on('pdf:position', (e, page) => { if ([...pdfWindows].some(w=>w.webContents===e.sender) && live?.kind === 'pdf' && Number.isInteger(page) && page > 0) { live.slide = page; publish(); } });
  ipcMain.on('pdf:failed', (e, message) => {
    if(![...pdfWindows].some(w=>w.webContents===e.sender)||live?.kind!=='pdf')return;
    const slot=findSlot(live.id);for(const win of pdfWindows)if(!win.isDestroyed())win.destroy();pdfWindows.clear();pdfWindow=null;live=null;
    fail(Error('PDF nije moguće prikazati: ' + String(message).slice(0,300)), slot);
  });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    ...(process.platform === 'darwin' ? [{ label: 'StageDeck', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'quit' }] }] : []),
    { label: 'Prezentacije', submenu: [{ label: 'Dodaj prezentacije…', accelerator: 'CmdOrCtrl+O', click: () => command('pick-files') }, { label: 'Zatvori prikaz', click: () => command('stop') }] },
    { label: 'Uređivanje', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'Prikaz', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }] }
  ]));
  if (process.platform==='darwin' && fs.existsSync(displayRecovery())) await macDisplays('restore');
  mirrors=new MirrorOutputs(async error=>{lastError=error.message;if(!busy){busy=true;try{await stopLive();}catch(e){lastError+=' '+e.message;}finally{busy=false;publish();}}else publish();});
  ipcMain.on('output:stop',event=>{if(mirrors.outputs.has(event.sender.id))command('stop');});
  const showControls=()=>{if(mainWindow&&!mainWindow.isDestroyed()){if(live)mainWindow.setAlwaysOnTop(true,'screen-saver',1);mainWindow.show();mainWindow.focus();}};
  ipcMain.on('output:controls',event=>{if(mirrors.outputs.has(event.sender.id))showControls();});
  globalShortcut.register('CommandOrControl+Shift+Space',showControls);
  createMainWindow(); await bridge();
  // Prepare the Windows transport without opening PowerPoint or a document.
  ppt.warmup();
  if (app.isPackaged && process.platform==='darwin' && !library.desktopShortcutCreated) {
    try { await createDesktopShortcut(); library.desktopShortcutCreated=true; persist(); } catch(error) { fail(error); }
  }
  setInterval(() => { pollPpt(); watchTick(); }, 1500).unref();
  screen.on('display-added',publish);
  screen.on('display-removed',()=>{if(busy)screenChangePending=true;if(live&&!busy){lastError='Ekran je odvojen. Prikaz je zaustavljen; proveri raspored pre ponovnog pokretanja.';command('stop');}else publish();});
  screen.on('display-metrics-changed',publish);
});
app.on('second-instance', () => { mainWindow?.show(); mainWindow?.focus(); });
app.on('activate', () => { if (!mainWindow || mainWindow.isDestroyed()) createMainWindow(); else mainWindow.show(); });
app.on('before-quit', e => {
  if(!app.isQuitting&&(busy||live||fs.existsSync(displayRecovery()))){e.preventDefault();app.isQuitting=true;(async()=>{while(busy)await new Promise(resolve=>setTimeout(resolve,50));await stopLive();if(process.platform==='darwin'&&fs.existsSync(displayRecovery()))await macDisplays('restore');})().catch(()=>{}).finally(()=>app.quit());return;}
  app.isQuitting = true; globalShortcut.unregisterAll();clearGuards();mirrors?.stop();for(const w of pdfWindows)if(!w.isDestroyed())w.destroy();ppt.dispose(); pdfWindow?.destroy(); wss?.close(); server?.close(); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin' && !live) app.quit(); });
