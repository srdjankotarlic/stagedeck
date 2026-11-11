// Reproducible public screenshots. Uses a new library and generated sample files.
const { _electron, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const sharp = require('sharp');
const PptxGenJS = require('pptxgenjs');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const root = path.join(__dirname, '..');
const output = path.join(root, 'docs/media');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(),'stagedeck-public-demo-'));
const files = [
  ['01 Welcome','WELCOME','SUMMIT / MAIN STAGE','25409E','C6DEFF'],
  ['02 Opening keynote','THE OPENING KEYNOTE','SUMMIT / MAIN STAGE','432972','EBD6FF'],
  ['03 Product demo','PRODUCT DEMO','SUMMIT / LIVE DEMO','124846','B9F6DC'],
  ['04 Panel discussion','PANEL DISCUSSION','SUMMIT / AUDITORIUM','74293F','FFCDD1'],
  ['05 Event agenda','EVENT AGENDA','SUMMIT / PROGRAM','202D56','D0DAFF'],
  ['06 Closing remarks','CLOSING REMARKS','SUMMIT / MAIN STAGE','50331C','FFE0AB']
];
const executablePath = process.env.STAGEDECK_TEST_EXE;
async function generate(){
  const paths=[];
  for (const [name,title,tag,bg,fg] of files) {
    if (name.startsWith('05')) {
      const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.HelveticaBold);
      for(let i=1;i<=3;i++){
        const page=pdf.addPage([1280,720]);
        page.drawRectangle({x:0,y:0,width:1280,height:720,color:rgb(.12,.17,.34)});
        page.drawText(tag,{x:76,y:610,size:22,font,color:rgb(.61,.70,.93)});
        page.drawText(i===1?title:'SESSION '+i,{x:76,y:352,size:74,font,color:rgb(.82,.86,1)});
        page.drawText('MAIN STAGE  /  0'+i,{x:80,y:140,size:23,font,color:rgb(.61,.70,.93)});
      }
      const file=path.join(temporary,name+'.pdf');fs.writeFileSync(file,await pdf.save());paths.push(file);continue;
    }
    const deck=new PptxGenJS();deck.layout='LAYOUT_WIDE';deck.author='StageDeck';deck.subject='Public demo, generated sample';
    for(let i=1;i<=3;i++){
      const slide=deck.addSlide();slide.background={color:bg};
      slide.addText(tag,{x:.8,y:.9,w:11,h:.6,color:fg,fontSize:16,charSpacing:2});
      slide.addText(i===1?title:'NEXT SESSION / 0'+i,{x:.8,y:2.8,w:12,h:1.1,color:fg,fontSize:43,bold:true});
      slide.addText('STAGEDECK DEMO  /  0'+i,{x:.8,y:5.9,w:11,h:.5,color:fg,fontSize:16});
      slide.addNotes('Introduce the speaker and thank the audience.\nLeave a pause before advancing to the next slide.');
    }
    const file=path.join(temporary,name+'.pptx');await deck.writeFile({fileName:file});paths.push(file);
  }
  return paths;
}
async function screenshot(target,name){
  const png=await target.screenshot({timeout:15000});
  const pipeline=sharp(png).resize({width:1440,withoutEnlargement:true});
  await pipeline.webp({quality:90}).toFile(path.join(output,name+'.webp'));
  if(name==='stage-deck-powerpoint-pdf-grid')await sharp(png).resize(1200,630,{fit:'cover',position:'attention'}).jpeg({quality:88}).toFile(path.join(output,'stagedeck-social.jpg'));
}

(async()=>{
 const paths=await generate();fs.mkdirSync(output,{recursive:true});
 const app=await _electron.launch({...(executablePath?{executablePath}:{args:[root]}),env:{...process.env,STAGEDECK_TEST_DATA:path.join(temporary,'library'),STAGEDECK_TEST_PORT:'49369'}});
 try {
  const page=await app.firstWindow(),cmd=(name,payload)=>page.evaluate(([n,p])=>window.stage.command(n,p),[name,payload]);
  await page.waitForSelector('.slot');await page.setViewportSize({width:1430,height:940});
  if(await page.locator('#close-setup').isVisible())await page.locator('#close-setup').click();
  await cmd('event-rename',{name:'Summit · Main stage'});
  assert.equal((await cmd('import',{paths})).count,6);
  await expect.poll(async()=>page.locator('.slot-preview img').count(),{timeout:20000}).toBe(6);
  for(const [index,label,size] of [[0,'START',48],[1,'KEYNOTE',48],[3,'PANEL',48],[4,'AGENDA',48]])
    await cmd('key-label',{index,label,size,layout:'title'});
  await expect(page.locator('[data-index="1"] .key-label-button')).toHaveText('KEYNOTE');
  await screenshot(page,'stage-deck-powerpoint-pdf-grid');
  await page.locator('[data-theme="light"]').click();
  await expect(page.locator('html')).toHaveAttribute('data-theme','light');
  await screenshot(page,'stage-deck-light-theme');
  await page.locator('[data-index="1"] .slot-trigger').click();
  await expect(page.locator('#go')).toBeEnabled();
  await screenshot(page,'cue-presentation-with-go');
  await page.locator('#clear-cue').click();
  await page.locator('[data-index="1"] .key-label-button').click();
  await expect(page.locator('#key-preview')).toHaveAttribute('src',/^data:image\/png/);
  await screenshot(page,'stream-deck-xl-key-label');
  await page.locator('#cancel-key').click();
  await page.locator('#screens').click();
  await expect(page.locator('[data-monitor]').first()).toBeVisible();
  await screenshot(page,'powerpoint-presenter-view-display-routing');
  await page.locator('#close-screens').click();
  await page.locator('#setup').click();
  await screenshot(page,'elgato-stream-deck-plugin-setup');
  await page.locator('#language').selectOption('sr');
  await expect(page.locator('#setup-dialog h2')).toHaveText('Podešavanja');
  await page.locator('#close-setup').click();
  await screenshot(page,'stage-deck-serbian-interface');
  await cmd('language',{language:'en'});
  await page.locator('[data-index="4"] .slot-trigger').click();
  await page.locator('#go').click();
  await expect(page.locator('#live-name')).toHaveText('05 Event agenda');
  await expect.poll(async()=>(await app.windows()).some(w=>w.url().includes('pdf.html'))).toBe(true);
  const pdf=(await app.windows()).find(w=>w.url().includes('pdf.html'));
  await pdf.waitForFunction(()=>document.querySelector('canvas').width>300);
  await screenshot(pdf,'fullscreen-pdf-slides');
  await screenshot(page,'live-status-and-slide-controls');
  await cmd('stop');

  // Optional real Office capture. Run only with the installed signed Mac app,
  // on an idle system with its permissions granted and at least two displays.
  if(process.env.STAGEDECK_CAPTURE_OFFICE==='1'){
    const state=await page.evaluate(()=>window.stage.getState());
    const audience=state.displays.find(d=>d.id!==state.routing.controlId);
    assert.ok(audience,'Connect an audience display for the Office capture');
    await cmd('display-roles',{roles:Object.fromEntries(state.displays.map(d=>[d.id,d.id===audience.id?'slides':d.id===state.routing.controlId?'notes':'none']))});
    const result=await cmd('toggle',{index:1});assert.equal(result.ok,true,result.error);
    for(const role of ['notes','slides']){
      const viewer=(await app.windows()).find(w=>w.url().includes('mirror.html')&&new URL(w.url()).searchParams.get('role')===role);
      assert.ok(viewer);
      await viewer.waitForFunction(()=>document.querySelector('canvas')?.dataset.sequence);
      await screenshot(viewer,role==='notes'?'native-powerpoint-presenter-view':'fullscreen-powerpoint-slides');
    }
    assert.equal((await cmd('stop')).ok,true);
  }
  console.log('Captured public screenshots from the real StageDeck UI.');
 } finally {await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>fs.rmSync(temporary,{recursive:true,force:true}));
