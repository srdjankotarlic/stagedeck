const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {execFileSync}=require('node:child_process');
module.exports=async context=>{
 if(context.electronPlatformName!=='darwin')return;
 const base=path.join(os.homedir(),'Library/Application Support/StageDeck Signing');
 if(!fs.existsSync(path.join(base,'identity.json')))throw Error('Restore the persistent StageDeck signing identity before building. Creating a new identity would reset macOS permissions.');
 const identity=JSON.parse(fs.readFileSync(path.join(base,'identity.json'),'utf8'));
 const password=fs.readFileSync(path.join(base,'keychain-password'),'utf8').trim();
 const run=(exe,args)=>{try{return execFileSync(exe,args,{stdio:['ignore','pipe','pipe']});}catch(error){throw Error(`StageDeck signing failed: ${String(error.stderr||'').trim()}`);}};
 run('/usr/bin/security',['unlock-keychain','-p',password,identity.keychain]);
 const target=path.join(context.appOutDir,'StageDeck.app');
 const requirements=`=designated => identifier "com.stagedeck.app" and certificate leaf = H"${identity.sha1}"`;
 run('/usr/bin/codesign',['--force','--sign',identity.sha1,'--keychain',identity.keychain,'--options','runtime','--entitlements',path.resolve(__dirname,'../build/entitlements.mac.plist'),'--requirements',requirements,'--timestamp=none',target]);
 run('/usr/bin/codesign',['--verify','--deep','--strict',target]);
 console.log('StageDeck signed with its persistent local identity; no system trust settings changed.');
};
