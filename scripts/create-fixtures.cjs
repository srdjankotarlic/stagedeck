const fs=require('node:fs');const path=require('node:path');const pptxgen=require('pptxgenjs');const {PDFDocument,StandardFonts,rgb}=require('pdf-lib');
const dir=path.join(__dirname,'../.test-output/fixtures');fs.mkdirSync(dir,{recursive:true});
(async()=>{
for(const [filename,title,subtitle,background,color] of [
 ['01 Otvaranje.pptx','DOBRO DOŠLI','Konferencija · glavna sala','16342C','D3ED9B'],
 ['02 Gost predavač.pptx','NOVA PERSPEKTIVA','Gost predavač · ključne ideje','352D49','E7D1FF'],
 ['03 Proizvod.pptx','IDEJE POSTAJU STVARNE','Predstavljanje proizvoda','4C3123','F2C68D']
]){
 const ppt=new pptxgen();ppt.layout='LAYOUT_WIDE';ppt.author='StageDeck test';ppt.subject='Generated test fixture';
 for(let i=0;i<3;i++){const slide=ppt.addSlide();slide.addNotes('STAGEDECK NOTES '+(i+1)+'\nGovornik: tekst beleški za ovaj slajd.\nSledeća tačka: proveri da se prikaz menja.');slide.background={color:background};slide.addText('STAGEDECK / TEST PREZENTACIJA',{x:.7,y:.5,w:10,h:.4,fontSize:12,color,charSpacing:3});slide.addText(i===0?title:`${title}\nSlajd ${i+1}`,{x:.7,y:2.1,w:11.5,h:2,fontSize:48,bold:true,color,breakLine:true});slide.addText(subtitle,{x:.75,y:5.8,w:10,h:.6,fontSize:17,color:'FFFFFF'});slide.addText(String(i+1).padStart(2,'0'),{x:11.5,y:6.6,w:1,h:.3,fontSize:12,color});}
 await ppt.writeFile({fileName:path.join(dir,filename)});
}
const pdf=await PDFDocument.create(),font=await pdf.embedFont(StandardFonts.HelveticaBold);
for(let i=0;i<3;i++){const page=pdf.addPage([1280,720]);page.drawRectangle({x:0,y:0,width:1280,height:720,color:rgb(.12,.21,.2)});page.drawText(i?'PDF / SLAJD '+(i+1):'PROGRAM DOGADJAJA',{x:75,y:350,size:64,font,color:rgb(.83,.93,.62)});page.drawText('STAGEDECK  /  PDF TEST',{x:80,y:620,size:18,font,color:rgb(.6,.7,.6)});}
fs.writeFileSync(path.join(dir,'04 Program događaja.pdf'),await pdf.save());console.log(dir);
})();
