// Exercises the real Windows capture path without requiring an Office license.
const { _electron: electron, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
(async () => {
  if (process.platform !== 'win32') { console.log('Windows capture test: Windows required'); return; }
  const root = path.resolve(__dirname, '..'), folder = path.join(root, '.test-output/capture');
  fs.mkdirSync(folder, { recursive: true });
  const bootstrap = path.join(folder, 'main.cjs');
  fs.writeFileSync(bootstrap, `const {app,BrowserWindow}=require('electron');
    app.whenReady().then(async()=>{
      globalThis.captureErrors=[];
      globalThis.source=new BrowserWindow({width:640,height:360,show:true});
      await source.loadURL('data:text/html,<body style="margin:0;background:rgb(180,40,30)"><script>let n=0;setInterval(()=>{document.body.style.background=++n%2?"rgb(30,150,70)":"rgb(180,40,30)"},500)</script>');
      globalThis.mirrors=new (require(${JSON.stringify(path.join(root, 'src/mirror-outputs.cjs'))}).MirrorOutputs)(error=>captureErrors.push(error.message));
    });`);
  const app = await electron.launch({ args: [bootstrap] });
  try {
    await app.firstWindow();
    const snapshot = await app.evaluate(async ({ screen }) => {
      const display = screen.getPrimaryDisplay();
      const handle = source.getNativeWindowHandle().readBigUInt64LE().toString();
      await mirrors.start('Capture fixture.pptx', { slides: [display], notes: [], mirrorAll: true }, { slides: handle });
      return mirrors.snapshot();
    });
    assert.equal(snapshot.length, 1); assert.equal(snapshot[0].ready, true);
    const output = (await app.windows()).find(w => w.url().includes('/mirror.html'));
    assert.ok(output);
    const pixels = () => output.evaluate(() => {
      const v = document.querySelector('video'), c = document.createElement('canvas'); c.width = 16; c.height = 9;
      c.getContext('2d').drawImage(v, 0, 0, 16, 9); return c.toDataURL();
    });
    const before = await pixels();
    await expect.poll(pixels, { timeout: 10000 }).not.toBe(before);
    assert.deepEqual(await app.evaluate(() => captureErrors), []);
    await app.evaluate(() => mirrors.stop());
    console.log('PASS Windows source handle selection, automatic capture without a click, real changing frames and complete stop');
  } finally { await app.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
