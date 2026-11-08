const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');
const root = path.join(__dirname, '..');
// Official Lucide presentation icon, shared by the app and Elgato plugin.
const source = fs.readFileSync(path.join(root, 'assets/icons/presentation.svg'), 'utf8').replaceAll('currentColor', '#ffffff');
(async () => {
  const glyph = await sharp(Buffer.from(source)).resize(570, 570).png().toBuffer();
  const icon = await sharp({ create: { width: 1024, height: 1024, channels: 4, background: '#2563eb' } }).composite([{ input: glyph, left: 227, top: 227 }]).png().toBuffer();
  fs.writeFileSync(path.join(root, 'assets/icon.png'), icon);
  const sizes=[16,32,48,256], pngs=await Promise.all(sizes.map(size=>sharp(icon).resize(size,size).png().toBuffer()));
  const directory=Buffer.alloc(6+16*sizes.length);directory.writeUInt16LE(1,2);directory.writeUInt16LE(sizes.length,4);let offset=directory.length;
  sizes.forEach((size,i)=>{const at=6+16*i;directory[at]=size===256?0:size;directory[at+1]=directory[at];directory.writeUInt16LE(1,at+4);directory.writeUInt16LE(32,at+6);directory.writeUInt32LE(pngs[i].length,at+8);directory.writeUInt32LE(offset,at+12);offset+=pngs[i].length;});
  fs.writeFileSync(path.join(root,'assets/icon.ico'),Buffer.concat([directory,...pngs]));
  const base = path.join(root, 'plugin/com.stagedeck.presentations.sdPlugin/images');
  for (const name of ['plugin','category','action','key']) for (const scale of [1,2]) {
    await sharp(icon).resize((name === 'key' ? 144 : 72) * scale).png().toFile(path.join(base, `${name}${scale === 2 ? '@2x' : ''}.png`));
  }
})();
