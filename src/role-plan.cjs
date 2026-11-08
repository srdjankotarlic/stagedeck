const {planDisplays}=require('./displays.cjs');
const ROLES=new Set(['none','notes','slides']);
const labelKey=label=>String(label||'').normalize('NFC').trim().toLowerCase();
function rolePlan(displays,appControlId,settings={}){
  const old=planDisplays(displays,appControlId,settings.displayId);
  let assignments,missing=[];
  if(settings.displayRoles){
    assignments=Object.fromEntries(displays.map(d=>[d.id,'none']));
    const claimed=new Set();
    for(const [savedId,role] of Object.entries(settings.displayRoles)){
      const label=labelKey(settings.displayLabels?.[savedId]);
      let target=displays.find(d=>String(d.id)===savedId&&(!label||labelKey(d.label)===label));
      if(!target&&label){const matches=displays.filter(d=>labelKey(d.label)===label);if(matches.length===1)target=matches[0];}
      if(target&&!claimed.has(target.id)){assignments[target.id]=role;claimed.add(target.id);}
      else if(role!=='none')missing.push(savedId);
    }
  }else assignments=Object.fromEntries(displays.map(d=>[d.id,d.id===old.audience.id?'slides':d.id===old.control.id&&old.separate?'notes':'none']));
  const notes=displays.filter(d=>assignments[d.id]==='notes'),slides=displays.filter(d=>assignments[d.id]==='slides');
  return {assignments,notes,slides,missing,control:old.control,notesRoot:notes[0]||null,slidesRoot:slides[0]||null,hasOutput:notes.length+slides.length>0,duplicates:Math.max(0,notes.length-1)+Math.max(0,slides.length-1)};
}
function validateRoles(roles,displays){
  if(!roles||typeof roles!=='object'||Array.isArray(roles))throw Error('Neispravan raspored ekrana.');
  if(displays.length>3)throw Error('Ova verzija podržava do tri ekrana.');
  for(const [id,role] of Object.entries(roles))if(!displays.some(d=>String(d.id)===id)||!ROLES.has(role))throw Error('Nepostojeći ekran ili uloga.');
  return Object.fromEntries(displays.map(d=>[d.id,roles[d.id]||'none']));
}
module.exports={rolePlan,validateRoles};
