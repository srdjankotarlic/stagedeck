let socket,context,settings={};const select=document.getElementById('slot');for(let i=0;i<32;i++)select.add(new Option(`Taster ${i+1}`,String(i)));
function connectElgatoStreamDeckSocket(port,uuid,event,info,actionInfo){const action=JSON.parse(actionInfo);context=action.context;settings=action.payload.settings||{};select.value=settings.slot??0;socket=new WebSocket(`ws://127.0.0.1:${port}`);socket.onopen=()=>socket.send(JSON.stringify({event,uuid}));}
select.onchange=()=>{settings.slot=Number(select.value);socket?.send(JSON.stringify({event:'setSettings',context,payload:settings}));};
