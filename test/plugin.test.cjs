const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const os=require('node:os');const path=require('node:path');const {spawn}=require('node:child_process');const {WebSocketServer}=require('ws');
const waitFor=(test,ms=5000)=>new Promise((resolve,reject)=>{const start=Date.now();const timer=setInterval(()=>{if(test()){clearInterval(timer);resolve();}else if(Date.now()-start>ms){clearInterval(timer);reject(Error('Timed out'));}},20);});
test('standalone plugin registers, maps all XL coordinates, paints images and forwards presses',async t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'stagedeck-plugin-'));const sd=new WebSocketServer({port:0}),bridge=new WebSocketServer({port:0});
  await Promise.all([new Promise(r=>sd.on('listening',r)),new Promise(r=>bridge.on('listening',r))]);
  fs.writeFileSync(path.join(dir,'bridge.json'),JSON.stringify({port:bridge.address().port,token:'test-token'}));
  let registered=false,hello=false,command,sdClient;const events=[];
  sd.on('connection',socket=>{sdClient=socket;socket.on('message',raw=>{const m=JSON.parse(raw);events.push(m);if(m.event==='registerPlugin')registered=true;});});
  bridge.on('connection',(socket,req)=>{assert.ok(req.url.includes('test-token'));socket.on('message',raw=>{const m=JSON.parse(raw);if(m.type==='hello'){hello=true;socket.send(JSON.stringify({type:'keys',images:Array.from({length:32},(_,i)=>`image-${i}`)}));}if(m.type==='command')command=m;});});
  const child=spawn(process.execPath,[path.join(__dirname,'../plugin/com.stagedeck.presentations.sdPlugin/plugin.cjs'),'-port',String(sd.address().port),'-pluginUUID','test-plugin','-registerEvent','registerPlugin','-info',JSON.stringify({devices:[{id:'xl',type:2,name:'Stream Deck XL'}]})],{env:{...process.env,STAGEDECK_TEST_DATA:dir},stdio:'pipe'});
  t.after(()=>{child.kill();for(const c of sd.clients)c.terminate();for(const c of bridge.clients)c.terminate();sd.close();bridge.close();fs.rmSync(dir,{recursive:true,force:true});});
  await waitFor(()=>registered&&hello);
  sdClient.send(JSON.stringify({event:'willAppear',context:'last-key',payload:{coordinates:{row:3,column:7},settings:{}}}));
  await waitFor(()=>events.some(m=>m.event==='setImage'&&m.context==='last-key'&&m.payload.image==='image-31'));
  sdClient.send(JSON.stringify({event:'keyDown',context:'last-key',payload:{}}));await waitFor(()=>command);
  assert.equal(command.command,'toggle');assert.equal(command.payload.index,31);
  sdClient.send(JSON.stringify({event:'didReceiveSettings',context:'last-key',payload:{settings:{slot:4}}}));
  await waitFor(()=>events.some(m=>m.event==='setImage'&&m.payload.image==='image-4'));
});
