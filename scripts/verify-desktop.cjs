// Runs the real installed app in an isolated library. No Playwright or developer tools needed.
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {spawn,execFile}=require('node:child_process');const {promisify}=require('node:util');const assert=require('node:assert/strict');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=30000){const deadline=Date.now()+timeout;let last;while(Date.now()<deadline){try{const result=await fn();if(result)return result;}catch(e){last=e;}await sleep(150);}throw last||Error('Timed out');}
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
async function windowsOutputHash(executable, bounds) {
 const helper=path.join(path.dirname(executable),'resources/app.asar.unpacked/src/native/windows-display.ps1');
 const quotedHelper="'"+helper.replace(/'/g,"''")+"'";
 const {x,y,width,height}=bounds;
 if(![x,y,width,height].every(Number.isInteger)||width<100||height<100)throw Error('Invalid native output bounds');
 const command=[
  "$ErrorActionPreference='Stop'",
  '. '+quotedHelper,
  'Add-Type -AssemblyName System.Drawing',
  '$bitmap=New-Object System.Drawing.Bitmap(96,54)',
  '$graphics=[Drawing.Graphics]::FromImage($bitmap)',
  `$graphics.CopyFromScreen(${x+Math.floor(width/2)-48},${y+Math.floor(height/2)-27},0,0,$bitmap.Size)`,
  '$stream=New-Object IO.MemoryStream',
  '$bitmap.Save($stream,[Drawing.Imaging.ImageFormat]::Png)',
  '$sha=[Security.Cryptography.SHA256]::Create()',
  '[Convert]::ToBase64String($sha.ComputeHash($stream.ToArray()))',
  '$graphics.Dispose(); $bitmap.Dispose(); $stream.Dispose(); $sha.Dispose()'
 ].join('; ');
 const powershell=path.join(process.env.SystemRoot||'C:/Windows','System32/WindowsPowerShell/v1.0/powershell.exe');
 const args=['-NoProfile','-ExecutionPolicy','Bypass','-EncodedCommand',Buffer.from(command,'utf16le').toString('base64')];
 const {stdout}=await promisify(execFile)(powershell,args,{windowsHide:true,timeout:12000});
 return stdout.trim();
}
class CDP{
 constructor(socket){this.socket=socket;this.pending=new Map();this.next=0;socket.addEventListener('message',e=>{const m=JSON.parse(e.data);const p=this.pending.get(m.id);if(p){this.pending.delete(m.id);m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}});}
 static async connect(url){const socket=new WebSocket(url);await new Promise((r,j)=>{socket.addEventListener('open',r,{once:true});socket.addEventListener('error',j,{once:true});});return new CDP(socket);}
 send(method,params={}){const id=++this.next;return new Promise((resolve,reject)=>{this.pending.set(id,{resolve,reject});this.socket.send(JSON.stringify({id,method,params}));});}
 async evaluate(expression){const r=await this.send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text+': '+r.result.description);return r.result.value;}
 close(){this.socket.close();}
}
(async()=>{
 const executable=path.resolve(process.argv[2]||process.execPath),fixture=path.resolve(process.argv[3]||path.join(__dirname,'fixtures/01 Otvaranje.pptx'));
 if(!['win32','darwin'].includes(process.platform))throw Error('Run on Windows or macOS.');
 const output=process.env.STAGEDECK_VERIFICATION_OUTPUT||path.join(os.homedir(),'Desktop',`StageDeck-provera-${new Date().toISOString().replace(/[:.]/g,'-')}.json`);
 const data=fs.mkdtempSync(path.join(os.tmpdir(),'StageDeck-verify-')),file=path.join(data,'Provera ČĆŽ ŠĐ.pptx');fs.copyFileSync(fixture,file);
 const debugPort=await freePort(),bridgePort=await freePort();const env={...process.env,STAGEDECK_TEST_DATA:data,STAGEDECK_TEST_PORT:String(bridgePort)};delete env.ELECTRON_RUN_AS_NODE;
 const child=spawn(executable,[...(process.argv[4]?[process.argv[4]]:[]),`--remote-debugging-port=${debugPort}`,'--remote-debugging-address=127.0.0.1'],{env,stdio:'ignore'});let cdp,deckSocket,native;const checks=[];const report={platform:process.platform,app:executable,started:new Date().toISOString(),checks};
 let get, command;
 const pass=(name,details)=>{checks.push({name,result:'passed',...(details?{details}:{})});console.log('PASS '+name);};
 try{
  const pages=()=>fetch(`http://127.0.0.1:${debugPort}/json/list`).then(r=>r.json());
  const page=await until(async()=>(await pages()).find(p=>p.url.includes('/index.html')));cdp=await CDP.connect(page.webSocketDebuggerUrl);
  get=()=>cdp.evaluate('window.stage.getState()');await until(async()=>!!(await get()).current);const initial=await get();const moduleFile=fs.existsSync(path.join(__dirname,'../src/powerpoint.cjs'))?path.join(__dirname,'../src/powerpoint.cjs'):path.join(__dirname,'../app.asar/src/powerpoint.cjs');native=new (require(moduleFile).PowerPoint)();const baseline=await native.execute('status');report.officeVersion=baseline.officeVersion;report.version=initial.version;report.displays=initial.displays;native.dispose();native=null;
  command=(name,payload={})=>cdp.evaluate(`window.stage.command(${JSON.stringify(name)},${JSON.stringify(payload)})`);
  const click=selector=>cdp.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`);
  const idle=()=>until(async()=>{const s=await get();return !s.busy?s:false;},60000);
  assert.equal((await command('import',{paths:[file]})).count,1);await idle();pass('Unicode PowerPoint import');
  const ids=initial.displays.map(d=>d.id);if(ids.length>3)throw Error('Verify with at most three displays.');
  const roles=Object.fromEntries(ids.map((id,i)=>[id,i===0&&ids.length>1?'notes':i===Math.min(1,ids.length-1)?'slides':'none']));
  assert.equal((await command('display-roles',{roles})).ok,true);
  await until(()=>cdp.evaluate('!!document.querySelector(".slot-trigger")'));await click('.slot-trigger');assert.equal((await get()).live,null);await click('.slot-trigger');assert.equal((await get()).live,null);pass('Mouse selection never starts PowerPoint');
  const id=(await get()).current.slots[0].id;
  assert.equal((await command('key-label',{index:0,id,label:'N23',size:64,layout:'title'})).ok,true);
  const label=(await get()).current.slots[0];assert.equal(label.name,'Provera ČĆŽ ŠĐ');assert.equal(label.keyLabel,'N23');assert.equal(label.keyFontSize,64);pass('Independent N23 label, full-text layout and font size');
  await click('#go');
  const live=await until(async()=>{const s=await idle();if(s.lastError)throw Error(s.lastError);return s.live?s:false;},90000);
  assert.equal(live.live.total,3);
  const nativeOutputs=live.routing.nativeOutputs||[];
  const mirrors=live.routing.mirrors;
  if(nativeOutputs.length){
   const audience=nativeOutputs.find(output=>output.role==='slides');
   assert.ok(audience?.handle);
   assert.equal(nativeOutputs.length,ids.length>1?2:1);
   pass('GO opens native PowerPoint on the assigned monitors',{roles,outputs:nativeOutputs});
   const before=await windowsOutputHash(executable,audience.bounds);
   await click('#next');
   await until(async()=>(await get()).live?.slide===2);
   await until(async()=>await windowsOutputHash(executable,audience.bounds)!==before);
   pass('Actual slide position and native screen pixels change');
  }else{
   assert.ok(mirrors.length>0);
   assert.ok(mirrors.every(m=>m.ready&&m.dimensions.width>0));
   pass('GO opens actual PowerPoint with ready output frames',{roles,outputs:mirrors});
   const outputs=await until(async()=>{const p=(await pages()).filter(p=>p.url.includes('/mirror.html'));return p.length===mirrors.length?p:false;});
   const sessions=await Promise.all(outputs.map(p=>CDP.connect(p.webSocketDebuggerUrl)));
   const hash=`(()=>{const v=document.querySelector('canvas:not([hidden]),video:not([hidden])');const c=document.createElement('canvas');c.width=160;c.height=90;const notes=new URLSearchParams(location.search).get('role')==='notes',w=v.videoWidth||v.width,h=v.videoHeight||v.height;c.getContext('2d').drawImage(v,0,notes?h*.18:0,notes?w*.6:w,notes?h*.55:h,0,0,160,90);return c.toDataURL();})()`;
   try{
    const before=await Promise.all(sessions.map(s=>s.evaluate(hash)));
    await click('#next');
    await until(async()=>(await get()).live?.slide===2);
    for(let i=0;i<sessions.length;i++)await until(async()=>await sessions[i].evaluate(hash)!==before[i]);
    pass('Actual slide position and mirrored output pixels change');
   }finally{sessions.forEach(s=>s.close());}
  }
  assert.equal((await command('play',{id,eventId:live.current.id})).ok,true);assert.equal((await get()).live.slide,2);pass('Repeated GO cannot stop or restart the live presentation');
  await click('#stop');assert.equal((await idle()).live,null);assert.equal((await pages()).filter(p=>p.url.includes('/mirror.html')).length,0);native=new (require(moduleFile).PowerPoint)();const closed=await native.execute('status');native.dispose();native=null;assert.equal(closed.windows.length,0);assert.equal(closed.documentCount,baseline.documentCount||0);if(process.platform==='win32'&&!baseline.documentCount&&!baseline.protectedDocumentCount)assert.equal(closed.running,false,'Stop must quit empty PowerPoint, including its editor');pass('Stop closes the native document, outputs and empty PowerPoint editor');
  const bridge=JSON.parse(fs.readFileSync(path.join(data,'bridge.json')));deckSocket=new WebSocket(`ws://127.0.0.1:${bridge.port}/deck?token=${bridge.token}`);
  await new Promise((r,j)=>{deckSocket.addEventListener('open',r,{once:true});deckSocket.addEventListener('error',j,{once:true});});const messages=[];deckSocket.addEventListener('message',event=>messages.push(JSON.parse(event.data)));
  deckSocket.send(JSON.stringify({type:'hello',devices:[{id:'verification-xl',type:2,name:'Verification XL'}]}));
  await until(async()=>(await get()).bridge.connected);deckSocket.send(JSON.stringify({type:'command',id:'start',command:'toggle',payload:{index:0}}));
  await until(()=>messages.find(m=>m.type==='result'&&m.id==='start'));assert.equal(messages.find(m=>m.id==='start').ok,true);assert.ok((await get()).live);pass('Stream Deck protocol starts on one press');
  await until(()=>messages.find(m=>m.type==='keys'&&m.images?.length===32));pass('All 32 rendered Stream Deck images delivered');
  deckSocket.send(JSON.stringify({type:'command',id:'stop',command:'toggle',payload:{index:0}}));await until(()=>messages.find(m=>m.type==='result'&&m.id==='stop'));assert.equal(messages.find(m=>m.id==='stop').ok,true);assert.equal((await get()).live,null);pass('Second Stream Deck press stops immediately');
  await cdp.send('Page.reload');await until(async()=>{const s=await get();return s.current?.slots[0]?.keyLabel==='N23';});assert.equal((await get()).current.slots[0].keyFontSize,64);pass('Settings survive reload');
  report.result='passed';console.log('DESKTOP VERIFICATION PASSED');
 }catch(error){
  report.result='failed';
  report.error=error.stack;
  try { if(command)report.diagnostics=(await command('verification-diagnostics')).report; }catch{}
  console.error(error.message);
  process.exitCode=1;
 }
 finally{try{if(cdp)await cdp.evaluate('window.stage.command("stop")');}catch{}deckSocket?.close();cdp?.close();child.kill();native?.dispose();report.finished=new Date().toISOString();fs.writeFileSync(output,JSON.stringify(report,null,2));console.log('Report: '+output);}
})().catch(error=>{console.error(error);process.exitCode=1;});
