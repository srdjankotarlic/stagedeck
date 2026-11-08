const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PowerPoint } = require('../src/powerpoint.cjs');
test('Windows transport warms up without starting Office and recovers after worker exit', { skip: process.platform !== 'win32', timeout: 30000 }, async () => {
  const ppt = new PowerPoint();
  try {
    ppt.warmup();
    const first = ppt.child;
    assert.ok(first);
    ppt.warmup();
    assert.equal(ppt.child, first, 'warmup must not spawn duplicate workers');
    const status = await ppt.execute('status');
    assert.equal(status.running, false, 'CI must not start PowerPoint while warming the transport');
    assert.deepEqual(status.windows, []);
    await new Promise(resolve => { first.once('exit', resolve); first.kill(); });
    assert.equal(ppt.child, null);
    assert.equal((await ppt.execute('status')).running, false);
    assert.notEqual(ppt.child, first);
  } finally { ppt.dispose(); }
});
