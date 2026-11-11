import { translateDocument } from './i18n.js';
translateDocument(new URLSearchParams(location.search).get('language'));
window.output.onLanguage(translateDocument);
const video=document.querySelector('video'),canvas=document.querySelector('canvas'),native=new URLSearchParams(location.search).get('native')==='1';let stream,stopping=false,decoding=false,pending,ready=false;
if(native){
 canvas.hidden=false;
 async function draw(frame){
  if(decoding){pending=frame;return;}decoding=true;
  try{const image=new Image();image.src='data:image/jpeg;base64,'+frame.jpeg;await image.decode();if(canvas.width!==frame.width||canvas.height!==frame.height){canvas.width=frame.width;canvas.height=frame.height;}canvas.getContext('2d',{alpha:false}).drawImage(image,0,0,frame.width,frame.height);canvas.dataset.sequence=frame.sequence;
   if(!ready){ready=true;window.output.ready({width:frame.width,height:frame.height});}
  }catch(error){window.output.failed(error.message);}finally{decoding=false;if(pending){const next=pending;pending=null;draw(next);}}
 }
 window.output.onFrame(draw);
}else{
 video.hidden=false;
 (async()=>{try{stream=await navigator.mediaDevices.getDisplayMedia({audio:false,video:{frameRate:{ideal:30,max:30}}});stream.getVideoTracks()[0].onended=()=>{if(!stopping)window.output.failed('PowerPoint video veza je prekinuta.');};video.srcObject=stream;await video.play();video.requestVideoFrameCallback(()=>window.output.ready({width:video.videoWidth,height:video.videoHeight}));}catch(error){window.output.failed(error.message);}})();
}
addEventListener('beforeunload',()=>{stopping=true;stream?.getTracks().forEach(t=>t.stop());});document.addEventListener('keydown',event=>{if(event.key==='Escape')window.output.stop();});

let controlsTimer;document.addEventListener('mousemove',()=>{document.body.classList.add('controls-visible');clearTimeout(controlsTimer);controlsTimer=setTimeout(()=>document.body.classList.remove('controls-visible'),2200);});document.getElementById('show-controls').onclick=()=>window.output.controls();document.getElementById('close-output').onclick=()=>window.output.stop();
