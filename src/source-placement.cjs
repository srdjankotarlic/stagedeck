function intersection(a,b){return Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));}
function placeSource(frame,hosts,unused){
 const candidates=hosts.flatMap(host=>{const b=host.bounds;return [[b.x,b.y],[b.x+b.width-frame.width,b.y],[b.x,b.y+b.height-frame.height],[b.x+b.width-frame.width,b.y+b.height-frame.height],[b.x+(b.width-frame.width)/2,b.y+(b.height-frame.height)/2]].map(([x,y])=>({...frame,x:Math.round(x),y:Math.round(y)}));});
 const safe=candidates.filter(candidate=>unused.every(d=>intersection(candidate,d.bounds)===0));safe.sort((a,b)=>hosts.reduce((sum,d)=>sum+intersection(b,d.bounds)-intersection(a,d.bounds),0));
 if(!safe.length)throw Error('Izvorni PowerPoint prozor nije moguće zakloniti na ovom fizičkom rasporedu monitora bez ulaska u kontrolni ekran.');
 return safe[0];
}
module.exports={placeSource,intersection};
