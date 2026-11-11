import * as pdfjs from '../node_modules/pdfjs-dist/build/pdf.mjs';
document.documentElement.lang=new URLSearchParams(location.search).get('language')==='sr'?'sr-Latn':'en';
pdfjs.GlobalWorkerOptions.workerSrc=new URL('../node_modules/pdfjs-dist/build/pdf.worker.mjs',location.href).href;
let doc,pageNumber=1,rendering=false,pending=false;
const canvas=document.getElementById('page');
async function render(){
  if(!doc)return;if(rendering){pending=true;return;}rendering=true;
  try{const page=await doc.getPage(pageNumber),raw=page.getViewport({scale:1}),scale=Math.min(innerWidth/raw.width,innerHeight/raw.height)*devicePixelRatio;const viewport=page.getViewport({scale});canvas.width=viewport.width;canvas.height=viewport.height;canvas.style.width=viewport.width/devicePixelRatio+'px';canvas.style.height=viewport.height/devicePixelRatio+'px';await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;window.stage.pdfPosition(pageNumber);}finally{rendering=false;if(pending){pending=false;render();}}
}
function navigate(command){if(command==='next')pageNumber=Math.min(doc?.numPages||1,pageNumber+1);if(command==='previous')pageNumber=Math.max(1,pageNumber-1);render();}
window.stage.onPdfCommand(navigate);
document.addEventListener('keydown',e=>{if(['ArrowRight','ArrowDown','PageDown',' '].includes(e.key)){e.preventDefault();window.stage.command('next');}if(['ArrowLeft','ArrowUp','PageUp'].includes(e.key)){e.preventDefault();window.stage.command('previous');}if(e.key==='Escape')window.stage.command('stop');});
document.addEventListener('click',()=>window.stage.command('next'));addEventListener('resize',render);
try{const id=new URLSearchParams(location.search).get('id');doc=await pdfjs.getDocument({data:new Uint8Array(await window.stage.readPdf(id)),isEvalSupported:false}).promise;await render();}catch(error){window.stage.pdfFailed(error.message);}
