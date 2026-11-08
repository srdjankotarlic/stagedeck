let signature='',generation=0;
const loadImage=source=>new Promise(resolve=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>resolve(null);image.src=source;});
function linesFor(context,label,width){
 const lines=[];let line='';
 for(const char of Array.from(label)){
  if(char==='\n'){lines.push(line);line='';continue;}
  if(context.measureText(line+char).width>width&&line){const space=line.lastIndexOf(' ');if(space>line.length/2){lines.push(line.slice(0,space));line=line.slice(space+1)+char;}else{lines.push(line);line=char;}}else line+=char;
 }
 if(line||!lines.length)lines.push(line);return lines;
}
export function keyTextLayout(c,slot,textOnly=(slot.keyLayout||(slot.keyLabel?'title':'preview'))==='title'){
 const label=slot.keyLabel?.trim()||slot.name;
 const height=textOnly?110:55,top=textOnly?22:79;
 const requested=Number.isInteger(slot.keyFontSize)?slot.keyFontSize:slot.keyFontSize==='normal'?14:slot.keyFontSize==='large'?52:label.length<=6?56:label.length<=15?36:24;
 let font=requested,lines;
 while(font>12){c.font=`600 ${font}px Inter, sans-serif`;lines=linesFor(c,label,128);if(lines.length<=4&&lines.length*(font+3)<=height)break;font--;}
 c.font=`600 ${font}px Inter, sans-serif`;lines=linesFor(c,label,128);
 const limit=Math.min(4,Math.floor(height/(font+3)));const clipped=lines.length>limit;lines=lines.slice(0,limit);
 if(clipped){let last=lines.at(-1);while(c.measureText(last+'…').width>128&&last)last=Array.from(last).slice(0,-1).join('');lines[lines.length-1]=last+'…';}
 const lineHeight=font+3;return {font,lines,lineHeight,first:top+(height-lines.length*lineHeight)/2+font,clipped};
}
export async function renderKey(slot,index,state){
 await document.fonts.ready;
 const canvas=document.createElement('canvas');canvas.width=144;canvas.height=144;const c=canvas.getContext('2d'),dark=state.theme==='dark';
 const live=slot&&state.live?.id===slot.id,loading=slot&&state.loading===slot.id;
 c.fillStyle=live?'#c52d3e':dark?'#222833':'#f4f6fa';c.fillRect(0,0,144,144);
 const textOnly=slot&&(slot.keyLayout||(slot.keyLabel?'title':'preview'))==='title';
 if(slot?.thumbnail&&!textOnly){const image=await loadImage(slot.thumbnail);if(image){const scale=Math.min(130/image.width,55/image.height);c.drawImage(image,(144-image.width*scale)/2,19+(55-image.height*scale)/2,image.width*scale,image.height*scale);}}
 else if(slot&&!textOnly){c.fillStyle=slot.kind==='pdf'?'#b96078':'#bb7449';c.font='600 23px Inter, sans-serif';c.textAlign='center';c.fillText(slot.kind==='pdf'?'PDF':'PPT',72,59);}
 else if(!slot){c.fillStyle=dark?'#6b778d':'#b4bdca';c.font='24px Inter, sans-serif';c.textAlign='center';c.fillText('+',72,75);}
 c.fillStyle=live?'#ffd7dc':dark?'#a7b2c4':'#8a98ac';c.font='10px Inter, sans-serif';c.textAlign='left';c.fillText(String(index+1).padStart(2,'0'),8,13);
 c.fillStyle=live?'#fff':dark?'#edf1f9':'#27364d';c.textAlign='center';
 if(slot){
  const layout=keyTextLayout(c,slot,textOnly);
  c.font=`600 ${layout.font}px Inter, sans-serif`;
  layout.lines.forEach((line,i)=>c.fillText(line,72,layout.first+i*layout.lineHeight));
 }else{c.fillStyle=dark?'#8c99ad':'#a8b2bf';c.font='10px Inter, sans-serif';c.fillText('Slobodan taster',72,119);}
 const warning=slot&&(slot.missing||slot.error);c.strokeStyle=live?'#ef7180':loading?'#d6a342':warning?'#cf865c':dark?'#3e485b':'#d1dae6';c.lineWidth=live?6:2;c.strokeRect(2,2,140,140);
 if(live){c.fillStyle='#d84848';c.fillRect(89,5,47,17);c.fillStyle='#fff';c.font='600 10px Inter, sans-serif';c.textAlign='center';c.fillText('LIVE',112,17);}
 if(loading||warning){c.fillStyle=loading?'#c69834':'#c27545';c.font='600 8px Inter, sans-serif';c.textAlign='center';c.fillText(loading?'OTVARA SE':'PROVERI FAJL',72,138);}
 return canvas.toDataURL('image/png');
}
export async function renderKeys(state){
 const next=JSON.stringify([state.theme,state.current.id,state.current.slots.map(s=>s&&[s.id,s.name,s.keyLabel,s.keyFontSize,s.keyLayout,s.thumbnail,s.missing,!!s.error]),state.live?.id,state.loading]);
 if(next===signature)return;signature=next;const current=++generation;
 const images=await Promise.all(state.current.slots.map((slot,index)=>renderKey(slot,index,state)));
 if(current===generation)await window.stage.command('key-images',{images});
}
