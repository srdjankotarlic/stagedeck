const {_electron:electron}=require('@playwright/test');const assert=require('node:assert/strict');const path=require('node:path');const fs=require('node:fs');
(async()=>{
 const root=path.join(__dirname,'..'),data=path.join(root,'.test-output/native-data');fs.rmSync(data,{recursive:true,force:true});
 const app=await electron.launch({executablePath:path.join(require('node:os').homedir(),'Applications/StageDeck.app/Contents/MacOS/StageDeck'),env:{...process.env,STAGEDECK_TEST_DATA:data,STAGEDECK_TEST_PORT:'49362'}});
 try{
  const page=await app.firstWindow();await page.waitForSelector('.slot');
  const imported=await page.evaluate(paths=>window.stage.command('import',{paths}),[path.join(root,'.test-output/fixtures/01 Otvaranje.pptx'),path.join(root,'.test-output/fixtures/02 Gost predavač.pptx')]);assert.equal(imported.count,2);
  const opened=await page.evaluate(()=>window.stage.command('toggle',{index:0}));console.log('OPEN',JSON.stringify(opened));assert.equal(opened.ok,true);
  let current=await page.evaluate(()=>window.stage.getState());assert.equal(current.live.slide,1);assert.equal(current.live.total,3);
  await page.screenshot({path:path.join(root,'.test-output/stagedeck-live.png')});
  await page.evaluate(()=>window.stage.command('next'));await page.waitForFunction(async()=> (await window.stage.getState()).live?.slide===2);
  const switched=await page.evaluate(()=>window.stage.command('toggle',{index:1}));console.log('SWITCH',JSON.stringify(switched));assert.equal(switched.ok,true);
  current=await page.evaluate(()=>window.stage.getState());assert.equal(current.live.name,'02 Gost predavač');assert.equal(current.live.slide,1);
  const stopped=await page.evaluate(()=>window.stage.command('toggle',{index:1}));assert.equal(stopped.ok,true);assert.equal((await page.evaluate(()=>window.stage.getState())).live,null);
  console.log('NATIVE PASS: installed Mac app starts actual PowerPoint; reads real slide count and position; advances; switches decks; second press ends the slideshow.');
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
