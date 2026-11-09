const {test}=require('node:test');const assert=require('node:assert/strict');const path=require('node:path');const AdmZip=require('adm-zip');
test('official plugin package contains an executable native Windows entry point or the Mac Node entry point',()=>{
 const archive=new AdmZip(path.join(__dirname,'../dist/com.stagedeck.presentations.streamDeckPlugin'));
 const base='com.stagedeck.presentations.sdPlugin/';const manifest=JSON.parse(archive.readAsText(base+'manifest.json'));
 assert.equal(manifest.Profiles[0].AutoInstall,true);
 if(process.platform==='win32'){
  assert.equal(manifest.Nodejs,undefined,'Windows plugin must not request a downloaded Node runtime');
  assert.deepEqual(manifest.OS.map(os=>os.Platform),['windows']);
  assert.equal(manifest.CodePath,'windows/StageDeckPlugin.exe');
  assert.equal(archive.readFile(base+manifest.CodePath).subarray(0,2).toString(),'MZ');
 }else{
  assert.equal(manifest.CodePath,'plugin.cjs');assert.ok(archive.getEntry(base+'node_modules/ws/index.js'));
 }
});
