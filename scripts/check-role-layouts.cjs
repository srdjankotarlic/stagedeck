const{_electron,expect}=require('@playwright/test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const{PowerPoint}=require('../src/powerpoint.cjs');const{intersection}=require('../src/source-placement.cjs');
const rolesList=['none','notes','slides'];
const allCases=()=>rolesList.flatMap(a=>rolesList.flatMap(b=>rolesList.map(c=>[a,b,c])));
(async()=>{
 const root=path.resolve(__dirname,'..'),data=path.join(root,'.test-output/role-layouts');fs.rmSync(data,{recursive:true,force:true});const native=new PowerPoint();
 const app=await _electron.launch({args:[root],env:{...process.env,STAGEDECK_TEST_DATA:data,STAGEDECK_TEST_PORT:'49362'}});const report=[];
 try{
  const page=await app.firstWindow();await page.waitForSelector('.slot');
  const file=path.join(root,'.test-output/fixtures/01 Otvaranje.pptx');assert.equal((await page.evaluate(paths=>window.stage.command('import',{paths}),[file])).count,1);
  const waitState=predicate=>expect.poll(async()=>predicate(await page.evaluate(()=>window.stage.getState())),{timeout:25000}).toBe(true);
  const initial=await page.evaluate(()=>window.stage.getState()),ids=initial.displays.map(d=>d.id);assert.equal(ids.length,3);assert.equal(initial.bridge.connected,false,'tests must work without a Stream Deck connection');
  const cases=process.env.ROLE_CASE?JSON.parse(process.env.ROLE_CASE):allCases();
  for(const roles of cases){
   const assignments=Object.fromEntries(ids.map((id,i)=>[id,roles[i]]));assert.equal((await page.evaluate(roles=>window.stage.command('display-roles',{roles}),assignments)).ok,true);
   await page.evaluate(()=>window.stage.command('dismiss-error'));
   await page.locator('[data-index="0"] .slot-trigger').click();await page.locator('#go').click();
   await waitState(s=>!s.busy&&(!!s.live||!!s.lastError));
   if(roles.every(r=>r==='none'))await waitState(s=>!s.busy&&s.lastError.includes('at least one'));
   let state=await page.evaluate(()=>window.stage.getState());
   if(roles.every(r=>r==='none')){assert.equal(state.live,null);assert.match(state.lastError,/at least one/);await page.evaluate(()=>window.stage.command('dismiss-error'));report.push({roles,result:'rejected-empty'});console.log('PASS none/none/none: no output started');continue;}
   assert.ok(state.live,roles.join('/')+': '+state.lastError);
   const expected=roles.filter(r=>r!=='none').length;assert.equal(state.routing.mirrors.length,expected);
   for(const mirror of state.routing.mirrors){assert.ok(mirror.ready);assert.equal(assignments[mirror.displayId],mirror.role);assert.ok(mirror.dimensions.width>0&&mirror.dimensions.height>0);}
   const layout=await native.execute('layout',file);const unused=state.displays.filter(d=>assignments[d.id]==='none');for(const window of layout.windows)assert.ok(unused.every(d=>intersection(window,d.bounds)===0),'source leaked onto a control screen');
   const windows=await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().filter(w=>w.getTitle().startsWith('StageDeck · ')).map(w=>({title:w.getTitle(),bounds:w.getBounds()})));
   assert.equal(windows.length,expected);
   for(const w of windows){const id=Number(w.title.split(' · ')[2]);assert.deepEqual(w.bounds,state.displays.find(d=>d.id===id).bounds,'output must exactly cover the monitor');}
   const outputs=(await app.windows()).filter(w=>w.url().includes('mirror.html'));assert.equal(outputs.length,expected);
   const sample=async w=>w.evaluate(()=>{const v=document.querySelector('canvas:not([hidden]),video:not([hidden])'),c=document.createElement('canvas');c.width=160;c.height=90;const notes=new URLSearchParams(location.search).get('role')==='notes';c.getContext('2d').drawImage(v,0,notes?v.height*.18:0,notes?v.width*.6:v.width,notes?v.height*.55:v.height,0,0,160,90);return c.toDataURL();});
   await app.evaluate(({BrowserWindow})=>{const desk=BrowserWindow.getAllWindows().find(w=>w.getTitle()==='StageDeck');desk.show();desk.focus();});
   for(const targetSlide of [2,3]){
    const before=await Promise.all(outputs.map(sample));await page.locator('#next').click();await waitState(s=>s.live?.slide===targetSlide);
    for(let i=0;i<outputs.length;i++)await outputs[i].waitForFunction(old=>{const v=document.querySelector('canvas:not([hidden]),video:not([hidden])'),c=document.createElement('canvas');c.width=160;c.height=90;const notes=new URLSearchParams(location.search).get('role')==='notes';c.getContext('2d').drawImage(v,0,notes?v.height*.18:0,notes?v.width*.6:v.width,notes?v.height*.55:v.height,0,0,160,90);return c.toDataURL()!==old;},before[i],{timeout:10000});
   }
   if(roles.join('/')==='none/notes/slides')for(const output of outputs){const role=new URLSearchParams(output.url().split('?')[1]).get('role');await output.screenshot({path:path.join(root,`.test-output/verified-${role}.png`)});}
   const locked=await page.evaluate(()=>window.stage.command('display-roles',{roles:{1:'slides',2:'slides',3:'slides'}}));assert.equal(locked.ok,false,'live routing must not change accidentally');
   await page.locator('#stop').click();await waitState(s=>!s.busy&&!s.live);
   const status=await native.execute('status');assert.equal(status.windows.length,0);assert.equal(status.documentCount,0);assert.equal((await app.windows()).filter(w=>w.url().includes('mirror.html')).length,0);
   state=await page.evaluate(()=>window.stage.getState());assert.deepEqual(state.displays.map(d=>({id:d.id,bounds:d.bounds})),initial.displays.map(d=>({id:d.id,bounds:d.bounds})),'display layout must remain unchanged');
   report.push({roles,result:'passed',outputs:expected,realSlideChanges:2});console.log('PASS',roles.join('/'),'·',expected,'outputs · live frames advance · close clears all');
  }
  fs.writeFileSync(path.join(root,process.env.ROLE_CASE?'.test-output/role-matrix-selected-report.json':'.test-output/role-matrix-report.json'),JSON.stringify({timestamp:new Date().toISOString(),displays:initial.displays,hardwareConnected:false,cases:report},null,2));console.log('ROLE MATRIX PASS:',report.length,'cases');
 }finally{try{const page=(await app.windows()).find(w=>w.url().includes('/index.html'));if(page)await page.evaluate(()=>window.stage.command('stop'));}catch{}await app.close();native.dispose();}
})().catch(error=>{console.error(error);process.exitCode=1});
