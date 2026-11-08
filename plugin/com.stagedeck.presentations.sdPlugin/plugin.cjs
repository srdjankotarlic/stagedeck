const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const WebSocket=require('ws');
const args={};for(let i=2;i<process.argv.length;i+=2)args[process.argv[i]]=process.argv[i+1];
const contexts=new Map();let bridge,images=[],snapshot,retry;
let info={};try{info=JSON.parse(args['-info']||'{}');}catch{}
const sd=new WebSocket(`ws://127.0.0.1:${args['-port']}`);
function send(event,context,payload){if(sd.readyState===WebSocket.OPEN)sd.send(JSON.stringify({event,context,payload}));}
function paint(context){const item=contexts.get(context);if(!item)return;const image=images[item.slot];if(image){send('setImage',context,{image,target:0});send('setTitle',context,{title:'',target:0});}else{send('setImage',context,{image:'images/key.png',target:0});send('setTitle',context,{title:bridge?.readyState===WebSocket.OPEN?`Taster ${item.slot+1}`:'Otvori\nStageDeck',target:0});}}
function hello(){if(bridge?.readyState===WebSocket.OPEN)bridge.send(JSON.stringify({type:'hello',devices:(info.devices||[]).map(d=>({id:d.id,type:d.type,name:d.name}))}));}
function connect(){
  clearTimeout(retry);
  const base=process.env.STAGEDECK_TEST_DATA||(process.platform==='darwin'?path.join(os.homedir(),'Library/Application Support/StageDeck'):path.join(process.env.APPDATA||'','StageDeck'));
  try{const config=JSON.parse(fs.readFileSync(path.join(base,'bridge.json'),'utf8'));bridge=new WebSocket(`ws://127.0.0.1:${config.port}/deck?token=${encodeURIComponent(config.token)}`);}catch{retry=setTimeout(connect,2000);return;}
  bridge.on('open',hello);
  bridge.on('message',raw=>{try{const message=JSON.parse(raw.toString());if(message.type==='keys'){images=message.images;for(const context of contexts.keys())paint(context);}if(message.type==='state'){snapshot=message.state;}if(message.type==='result'&&!message.ok&&message.id)send('showAlert',message.id,{});}catch{}});
  bridge.on('error',()=>{});
  bridge.on('close',()=>{images=[];for(const context of contexts.keys())paint(context);retry=setTimeout(connect,2000);});
}
sd.on('open',()=>{sd.send(JSON.stringify({event:args['-registerEvent'],uuid:args['-pluginUUID']}));connect();});
sd.on('message',raw=>{
  try{const msg=JSON.parse(raw.toString());
    if(msg.event==='willAppear'||msg.event==='didReceiveSettings'){
      const coordinates=msg.payload?.coordinates||contexts.get(msg.context)?.coordinates||{column:0,row:0};
      const configured=msg.payload?.settings?.slot;
      const slot=Number.isInteger(configured)&&configured>=0&&configured<32?configured:coordinates.row*8+coordinates.column;
      contexts.set(msg.context,{slot,coordinates});paint(msg.context);
    }
    if(msg.event==='willDisappear')contexts.delete(msg.context);
    if(msg.event==='keyDown'){
      const item=contexts.get(msg.context);if(!item)return;
      if(bridge?.readyState===WebSocket.OPEN)bridge.send(JSON.stringify({type:'command',command:'toggle',payload:{index:item.slot},id:msg.context}));else send('showAlert',msg.context,{});
    }
    if(msg.event==='deviceDidConnect'){info.devices||=[];info.devices.push({id:msg.device,...msg.deviceInfo});hello();}
    if(msg.event==='deviceDidDisconnect'){info.devices=(info.devices||[]).filter(d=>d.id!==msg.device);hello();}
  }catch{}
});
sd.on('error',()=>{});sd.on('close',()=>process.exit(0));
