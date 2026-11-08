const {_electron:electron}=require('@playwright/test');const assert=require('node:assert/strict');const path=require('node:path');const fs=require('node:fs');const {PowerPoint}=require('../src/powerpoint.cjs');
(async()=>{
 const root=path.join(__dirname,'..'),data=path.join(root,'.test-output/routing-data');fs.rmSync(data,{recursive:true,force:true});
 const app=await electron.launch({args:[root],env:{...process.env,STAGEDECK_TEST_DATA:data,STAGEDECK_TEST_PORT:'49362'}});const ppt=new PowerPoint();
 try{
  const page=await app.firstWindow();await page.waitForSelector('.slot');await page.locator('#close-setup').click();
  const original=await app.evaluate(({screen})=>screen.getAllDisplays().map(d=>({id:d.id,bounds:d.bounds})));
  const files=['01 Otvaranje.pptx','02 Gost predavač.pptx'].map(f=>path.join(root,'.test-output/fixtures',f));
  assert.equal((await page.evaluate(paths=>window.stage.command('import',{paths}),files)).count,2);
  for(const control of [original[0],original[original.length-1]]){
   await app.evaluate(({BrowserWindow},bounds)=>BrowserWindow.getAllWindows().find(w=>w.getTitle()==='StageDeck').setBounds({x:bounds.x+50,y:bounds.y+50,width:1200,height:850}),control.bounds);
   await page.waitForFunction(async id=>(await window.stage.getState()).routing.controlId===id,control.id);
   const started=await page.evaluate(()=>window.stage.command('toggle',{index:0}));console.log('START',control.id,started);assert.equal(started.ok,true);
   const s=await page.evaluate(()=>window.stage.getState());const wanted=s.displays.find(d=>d.id===s.routing.audienceId).bounds;const noteScreen=s.displays.find(d=>d.id===s.routing.controlId).bounds;
   const layout=await ppt.execute('layout',files[0]);const notes=layout.windows.find(w=>w.buttons>=4),show=layout.windows.find(w=>w.buttons===0);
   for(const k of ['x','y','width','height']){assert.equal(notes[k],noteScreen[k],`notes ${k}`);assert.equal(show[k],wanted[k],`audience ${k}`);}
   assert.equal((await ppt.execute('status')).windows[0].fullscreen,true);
   await page.evaluate(()=>window.stage.command('next'));await page.waitForFunction(async()=> (await window.stage.getState()).live?.slide===2);
   assert.equal((await page.evaluate(()=>window.stage.command('rename-slot',{index:0,name:'Govornik · uživo'}))).ok,true);
   assert.equal((await page.evaluate(()=>window.stage.getState())).live.name,'Govornik · uživo');
   const stopped=await page.evaluate(()=>window.stage.command('toggle',{index:0}));assert.equal(stopped.ok,true);
   assert.equal((await ppt.execute('status')).windows.length,0);
   assert.equal((await ppt.execute('status')).documentCount,0,'second click must fully close the deck');
   await page.waitForFunction(async original=>JSON.stringify((await window.stage.getState()).displays.map(d=>({id:d.id,bounds:d.bounds})))===JSON.stringify(original),original);
  }
  console.log('ROUTING PASS: native notes and slideshow exactly fill their monitors for built-in and external controls; original display layout restored; real navigation, live rename and full document closure.');
 }finally{await app.close();ppt.dispose();}
})().catch(e=>{console.error(e);process.exitCode=1;});
