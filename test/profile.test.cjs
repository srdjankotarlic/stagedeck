const {test}=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');const AdmZip=require('adm-zip');
test('XL profile has real pages, uppercase UUID folders and exactly 32 unique actions',()=>{
  const zip=new AdmZip(path.join(__dirname,'../plugin/com.stagedeck.presentations.sdPlugin/profiles/StageDeck XL.streamDeckProfile'));
  const root=zip.getEntries().find(e=>/\.sdProfile\/manifest\.json$/.test(e.entryName));
  const folder=root.entryName.replace('manifest.json',''),manifest=JSON.parse(root.getData());
  assert.equal(manifest.Device.Model,'20GAT9902');assert.equal(manifest.Pages.Pages.length,1);
  for(const id of [manifest.Pages.Default,...manifest.Pages.Pages])assert.ok(zip.getEntry(`${folder}Profiles/${id.toUpperCase()}/manifest.json`));
  const page=JSON.parse(zip.readAsText(`${folder}Profiles/${manifest.Pages.Current.toUpperCase()}/manifest.json`));
  const actions=page.Controllers[0].Actions;assert.equal(Object.keys(actions).length,32);
  assert.deepEqual(Object.values(actions).map(a=>a.Settings.slot).sort((a,b)=>a-b),Array.from({length:32},(_,i)=>i));
  assert.equal(actions['7,3'].Settings.slot,31);
});
