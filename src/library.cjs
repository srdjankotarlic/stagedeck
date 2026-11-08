const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const EXTENSIONS = new Set(['.pptx', '.ppt', '.ppsx', '.pps', '.pptm', '.pdf']);
const SUPPORTED = /\.(pptx?|ppsx?|pptm|pdf)$/i;

function makeEvent(name = 'Moj događaj') {
  return { id: crypto.randomUUID(), name, slots: Array(32).fill(null), folder: '', locked: false };
}
function loadLibrary(file) {
  try {
    const saved = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(saved.events) || !saved.events.length) throw Error('Empty library');
    saved.events.forEach(e => { e.slots = Array.from({ length: 32 }, (_, i) => e.slots?.[i] || null); });
    return saved;
  } catch (error) {
    if (fs.existsSync(file)) {
      // Preserve a damaged library rather than overwriting the only copy.
      fs.copyFileSync(file, `${file}.recovery-${Date.now()}`);
    }
    const event = makeEvent();
    return { version: 1, currentEvent: event.id, events: [event], displayId: null };
  }
}
function saveLibrary(file, library) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(`${file}.tmp`, JSON.stringify(library, null, 2));
  fs.renameSync(`${file}.tmp`, file);
}
function collectFiles(inputs) {
  const result = [];
  for (const input of inputs) {
    if (typeof input !== 'string') continue;
    const absolute = path.resolve(input);
    try {
      const stat = fs.statSync(absolute);
      if (stat.isDirectory()) {
        // A watched folder is intentionally shallow: imported layouts stay predictable.
        result.push(...fs.readdirSync(absolute).filter(n => !n.startsWith('~$'))
          .sort((a,b) => a.localeCompare(b, undefined, { numeric: true }))
          .map(n => path.join(absolute,n)).filter(f => SUPPORTED.test(f) && fs.statSync(f).isFile()));
      } else if (stat.isFile() && EXTENSIONS.has(path.extname(absolute).toLowerCase()) && !path.basename(absolute).startsWith('~$')) result.push(absolute);
    } catch { /* A disconnected drive is reported on its existing slot. */ }
  }
  return [...new Set(result)];
}
function allocateFiles(event, files, preferredIndex) {
  if (event.locked) throw Error('Raspored je zaključan. Otključaj ga pre dodavanja prezentacija.');
  const added = []; let skipped = 0;
  for (const file of files) {
    if (event.slots.some(s => s && samePath(s.path, file))) continue;
    let index = added.length === 0 && Number.isInteger(preferredIndex) && !event.slots[preferredIndex] ? preferredIndex : event.slots.indexOf(null);
    if (index < 0 || index > 31) { skipped++; continue; }
    const stat = fs.statSync(file);
    const slot = { id: crypto.randomUUID(), path: file, name: path.basename(file, path.extname(file)), kind: path.extname(file).slice(1).toLowerCase(), modified: stat.mtimeMs, thumbnail: '', slides: null };
    event.slots[index] = slot; added.push(slot);
  }
  return { added, skipped };
}
function samePath(a, b, platform = process.platform) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const normalize = p => platform === 'win32' ? p.normalize('NFC').toLowerCase() : p.normalize('NFC');
  return normalize(a) === normalize(b);
}
module.exports = { makeEvent, loadLibrary, saveLibrary, collectFiles, allocateFiles, SUPPORTED, samePath };
