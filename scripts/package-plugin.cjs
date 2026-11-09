const fs=require('node:fs');const path=require('node:path');const crypto=require('node:crypto');const AdmZip=require('adm-zip');
const root=path.join(__dirname,'..'),plugin=path.join(root,'plugin/com.stagedeck.presentations.sdPlugin');
const profileId='7BFF6B54-87A8-4D2D-B0A5-FECED0B3D662',pageId='a5365633-6263-486b-92cb-88358e9e20b1',defaultId='329c7ec1-180b-42dc-b589-5e4abe02b920';
const manifest={Device:{Model:'20GAT9902',UUID:''},Name:'StageDeck XL',Pages:{Current:pageId,Default:defaultId,Pages:[pageId]},Version:'3.0'};
const makeActions=()=>Object.fromEntries(Array.from({length:32},(_,i)=>[`${i%8},${Math.floor(i/8)}`,{ActionID:crypto.randomUUID(),LinkedTitle:true,Name:'Presentation',Settings:{slot:i},State:0,States:[{FontSize:10,ShowTitle:false,Title:'',TitleAlignment:'bottom'}],UUID:'com.stagedeck.presentations.slot'}]));
const actions=makeActions();
const zip=new AdmZip();
for(const directory of [`${profileId}.sdProfile/`,`${profileId}.sdProfile/Profiles/`,`${profileId}.sdProfile/Profiles/${pageId.toUpperCase()}/`,`${profileId}.sdProfile/Profiles/${defaultId.toUpperCase()}/`])zip.addFile(directory,Buffer.alloc(0));
zip.addFile(`${profileId}.sdProfile/manifest.json`,Buffer.from(JSON.stringify(manifest)));zip.addFile(`${profileId}.sdProfile/Profiles/${pageId.toUpperCase()}/manifest.json`,Buffer.from(JSON.stringify({Controllers:[{Actions:actions,Type:'Keypad'}],Icon:'',Name:''})));
zip.addFile(`${profileId}.sdProfile/Profiles/${defaultId.toUpperCase()}/manifest.json`,Buffer.from(JSON.stringify({Controllers:[{Actions:makeActions(),Type:'Keypad'}],Icon:'',Name:''})));
fs.mkdirSync(path.join(root,'dist'),{recursive:true});fs.mkdirSync(path.join(plugin,'profiles'),{recursive:true});
zip.writeZip(path.join(root,'dist/StageDeck XL.streamDeckProfile'));zip.writeZip(path.join(plugin,'profiles/StageDeck XL.streamDeckProfile'));
// The plugin is standalone; it must not depend on the app's node_modules.
fs.mkdirSync(path.join(plugin,'node_modules'),{recursive:true});fs.cpSync(path.dirname(require.resolve('ws/package.json')),path.join(plugin,'node_modules/ws'),{recursive:true});
const {execFileSync}=require('node:child_process');
execFileSync(process.execPath,[path.join(root,'node_modules/@elgato/cli/dist/index.js'),'pack',plugin,'--output',path.join(root,'dist'),'--force','--no-update-check','--no-file-list'],{stdio:'inherit'});
console.log('Built standalone plugin and 32-key XL profile.');
