// Measures complete playback readiness, not just the command acknowledgement.
const { _electron: electron } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { performance } = require('node:perf_hooks');
const { PowerPoint } = require('../src/powerpoint.cjs');
const root = path.join(__dirname, '..');
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(fn) {
  const deadline = Date.now() + 75000;
  while (Date.now() < deadline) { if (await fn()) return; await sleep(40); }
  throw Error('Playback readiness timed out');
}
(async () => {
  const data = fs.mkdtempSync(path.join(os.tmpdir(), 'StageDeck-speed-'));
  const app = await electron.launch({ args: [root], env: { ...process.env, STAGEDECK_TEST_DATA: data, STAGEDECK_TEST_PORT: '49363' } });
  const ppt = new PowerPoint(), baseline = await ppt.execute('status');
  const results = [];
  try {
    const page = await app.firstWindow();
    const command = (name, payload = {}) => page.evaluate(({ name, payload }) => window.stage.command(name, payload), { name, payload });
    const get = () => page.evaluate(() => window.stage.getState());
    const files = ['01 Otvaranje.pptx', '04 Program događaja.pdf'].map(name => path.join(root, '.test-output/fixtures', name));
    assert.equal((await command('import', { paths: files })).count, 2);
    const state = await get(), displays = state.displays;
    const external = displays.filter(d => !d.internal);
    const hosts = external.length >= 2 ? external : displays;
    const roles = Object.fromEntries(displays.map(d => [d.id, d.id === hosts[0].id ? 'slides' : d.id === hosts[1]?.id ? 'notes' : 'none']));
    for (const scenario of ['ppt', 'pdf-one', 'pdf-all']) {
      assert.equal((await command('display-roles', { roles: scenario === 'pdf-all' ? Object.fromEntries(displays.map(d => [d.id, 'slides'])) : roles })).ok, true);
      for (let round = 0; round < 3; round++) {
        const slot = (await get()).current.slots[scenario === 'ppt' ? 0 : 1];
        const started = performance.now();
        assert.equal((await command('play', { id: slot.id, eventId: state.current.id })).ok, true);
        if (scenario !== 'ppt') {
          const outputs = (await app.windows()).filter(w => w.url().includes('/pdf.html'));
          assert.equal(outputs.length, scenario === 'pdf-all' ? displays.length : 1);
          for (const output of outputs) await output.waitForFunction(() => { const c = document.querySelector('canvas'); if (!c || c.width < 300) return false; const pixels = c.getContext('2d').getImageData(c.width >> 1, c.height >> 1, 1, 1).data; return pixels[3] > 0; });
        }
        const openMs = Math.round(performance.now() - started);
        await command('next');
        await until(async () => (await get()).live?.slide === 2);
        const stop = performance.now();
        assert.equal((await command('stop')).ok, true);
        assert.equal((await get()).live, null);
        assert.equal((await app.windows()).filter(w => /\/(mirror|pdf)\.html/.test(w.url())).length, 0);
        const stopMs = Math.round(performance.now() - stop);
        if (scenario === 'ppt') assert.equal((await ppt.execute('status')).documentCount, baseline.documentCount);
        results.push({ scenario, round: round + 1, openMs, stopMs });
        console.log(`${scenario} ${round + 1}: ready ${openMs} ms, close ${stopMs} ms`);
      }
    }
    const output = path.resolve(process.argv[2] || path.join(root, '.test-output/performance/playback.json'));
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, JSON.stringify({ platform: process.platform, version: state.version, date: new Date().toISOString(), displays: displays.map(d => ({ label: d.label, width: d.width, height: d.height })), results }, null, 2));
    console.log('Saved: ' + output);
  } finally { await app.close(); ppt.dispose(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
