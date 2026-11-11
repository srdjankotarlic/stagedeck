const { test } = require('node:test');
const assert = require('node:assert/strict');
const { languageOf, text, localMessage, localResult } = require('../src/i18n.cjs');

test('English is the default for old libraries and Serbian is an explicit preference', () => {
  assert.equal(languageOf(undefined), 'en');
  assert.equal(languageOf('other'), 'en');
  assert.equal(languageOf('sr'), 'sr');
  assert.equal(text('en','Slajd {number}',{number:7}), 'Slide 7');
  assert.equal(text('sr','Slajd {number}',{number:7}), 'Slajd 7');
});

test('app errors are translated while attached third-party details remain unchanged', () => {
  const error = 'PDF nije moguće prikazati: Invalid PDF structure';
  assert.equal(localMessage('sr', error), error);
  assert.equal(localMessage('en', error), 'Could not display the PDF: Invalid PDF structure');
  assert.equal(localMessage('en','Office error 0x80004005'), 'Office error 0x80004005');
  assert.deepEqual(localResult('en',{ok:false,error:'Raspored je zaključan.'}),{ok:false,error:'The layout is locked.'});
});
