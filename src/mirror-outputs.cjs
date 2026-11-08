const path=require('node:path');const {spawn}=require('node:child_process');const readline=require('node:readline');
const {BrowserWindow,desktopCapturer,ipcMain,session,webContents,systemPreferences}=require('electron');
class MirrorOutputs{
 constructor(onFailure){
  this.outputs=new Map();this.onFailure=onFailure;this.generation=0;
  this.session=session.fromPartition('stagedeck-output-capture');
  this.session.setDisplayMediaRequestHandler((request,callback)=>{const owner=webContents.fromFrame(request.frame),output=owner&&this.outputs.get(owner.id);callback(output?.source?{video:output.source}:{});},{useSystemPicker:false});
  ipcMain.on('mirror:ready',(event,dimensions)=>{const output=this.outputs.get(event.sender.id);if(output&&dimensions.width>0&&dimensions.height>0){output.ready=true;output.dimensions=dimensions;output.resolve();}});
  ipcMain.on('mirror:failed',(event,message)=>{if(this.outputs.has(event.sender.id))this.failed(Error('PowerPoint izlaz je prekinut: '+String(message).slice(0,200)));});
 }
 permission(){return process.platform!=='darwin'||systemPreferences.getMediaAccessStatus('screen')==='granted';}
 failed(error){const ready=[...this.outputs.values()].some(o=>o.ready);for(const output of this.outputs.values())output.reject(error);if(ready)this.onFailure(error);}
 async start(file,plan,handles={}){
  const targets=[...plan.slides.slice(plan.mirrorAll?0:1).map(display=>({display,role:'slides'})),...plan.notes.slice(plan.mirrorAll?0:1).map(display=>({display,role:'notes'}))];if(!targets.length)return;
  if(!this.permission())throw Error('Za PowerPoint izlaze dozvoli StageDeck u macOS Screen & System Audio Recording, pa ponovo pokreni aplikaciju.');
  const generation=++this.generation,ready=[],loaded=[];
  const native=process.platform==='darwin';let sources=[];
  if(!native)sources=await desktopCapturer.getSources({types:['window'],thumbnailSize:{width:0,height:0},fetchWindowIcons:false});
  for(const target of targets){
   let source=null;
   if(!native){const handle=handles[target.role];if(handle)source=sources.find(s=>s.id.startsWith('window:'+String(handle)+':'));if(!source)throw Error('Izvorni PowerPoint '+target.role+' prozor nije pronađen.');}
   const window=new BrowserWindow({...target.display.bounds,frame:false,show:false,alwaysOnTop:true,backgroundColor:'#000000',autoHideMenuBar:true,skipTaskbar:true,title:`StageDeck · ${target.role} · ${target.display.id}`,webPreferences:{preload:path.join(__dirname,'mirror-preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false,session:this.session}});
   if(native){window.setVisibleOnAllWorkspaces(true,{visibleOnFullScreen:true});window.setSimpleFullScreen(true);}else window.setFullScreen(true);
   window.setAlwaysOnTop(true,'screen-saver');
   const id=window.webContents.id;let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});promise.catch(()=>{});ready.push(promise);
   const output={window,id,role:target.role,displayId:target.display.id,source,sourceName:source?.name||'',ready:false,resolve,reject,sequence:0};this.outputs.set(id,output);
   window.on('page-title-updated',event=>event.preventDefault());
   window.webContents.setWindowOpenHandler(()=>({action:'deny'}));window.webContents.on('will-navigate',event=>event.preventDefault());
   window.on('closed',()=>{this.outputs.delete(id);if(!output.closing){const error=Error('PowerPoint izlaz je zatvoren.');output.reject(error);if(output.ready)this.onFailure(error);else this.failed(error);}});
   loaded.push(window.loadFile(path.join(__dirname,'../ui/mirror.html'),{query:{native:native?'1':'0',role:target.role}}));
  }
  // Independent renderers load together; every output must still become ready.
  await Promise.all(loaded);
  if(native){
   const helper=path.join(__dirname,'native/window-capture').replace(/app\.asar([\\/])/,'app.asar.unpacked$1');
   const child=spawn(helper,[path.basename(file,path.extname(file)),[...new Set(targets.map(t=>t.role))].join(',')],{stdio:['ignore','pipe','pipe']});this.child=child;
   readline.createInterface({input:child.stdout}).on('line',line=>{
    if(generation!==this.generation)return;
    try{const frame=JSON.parse(line);if(frame.error){this.failed(Error(frame.error));return;}
     for(const output of this.outputs.values()){
      if(output.role===frame.source)output.sourceName=frame.title;
      if(output.role===frame.role&&frame.jpeg){output.sequence=frame.sequence;output.window.webContents.send('mirror:frame',frame);}
     }
    }catch(error){this.failed(error);}
   });
   let stderr='';child.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-300);});
   child.on('error',error=>{if(generation===this.generation)this.failed(error);});child.on('exit',()=>{if(generation===this.generation)this.failed(Error('PowerPoint capture veza je zatvorena. '+stderr));});
  }
  const timeout=setTimeout(()=>this.failed(Error('PowerPoint izlaz nije poslao sliku na vreme.')),15000);
  try{await Promise.all(ready);for(const output of this.outputs.values())output.window.showInactive();}finally{clearTimeout(timeout);}
 }
 snapshot(){return [...this.outputs.values()].map(o=>({role:o.role,displayId:o.displayId,ready:o.ready,sourceName:o.sourceName,dimensions:o.dimensions,sequence:o.sequence}));}
 stop(){this.generation++;this.child?.kill();this.child=null;const outputs=[...this.outputs.values()];this.outputs.clear();for(const output of outputs){output.closing=true;output.reject(Error('Prikaz je zaustavljen.'));if(!output.window.isDestroyed())output.window.destroy();}}
}
module.exports={MirrorOutputs};
