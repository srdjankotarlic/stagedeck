import { renderKeys,renderKey } from './keys.js';
let state, dragIndex = null, menuIndex = null, nameAction = null, lastMarkup = '', toastTimer, editing = null, keyEdit = null, previewGeneration = 0, monitorMarkup = '', selected = null, goPending = false;
const $ = id => document.getElementById(id);
const icon = name => `<img class="icon" src="../assets/icons/${name}.svg" alt="">`;
const escape = value => String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
async function command(name, payload) {
  const result = await window.stage.command(name,payload);
  if (result?.skipped) toast(`${result.count} dodato. Još ${result.skipped} fajlova nema slobodan taster.`);
  return result;
}
function toast(text) { $('toast').textContent = text; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').hidden = true, 4500); }
function openName(title, value, callback) { $('name-heading').textContent = title; $('name-input').value = value; nameAction = callback; $('name-dialog').showModal(); $('name-input').focus(); $('name-input').select(); }
function render(s) {
  state = s;
  document.documentElement.dataset.theme = s.theme;
  document.querySelectorAll('[data-theme]').forEach(b => b.setAttribute('aria-pressed',b.dataset.theme === s.theme));
  if(selected&&(selected.eventId!==s.current.id||!s.current.slots.some(slot=>slot?.id===selected.id)))selected=null;
  document.body.classList.toggle('has-live',!!s.live);
  document.body.classList.toggle('has-cue',!!selected);
  $('event-name').textContent = s.current.name;
  $('events').innerHTML = s.events.map(e => `<button class="event ${e.id === s.current.id ? 'active' : ''}" data-event="${e.id}" title="${escape(e.name)}">${icon('folder')}<span>${escape(e.name)}</span></button>`).join('');
  $('count').textContent = `${s.current.slots.filter(Boolean).length} / 32`;
  $('lock').innerHTML = icon(s.current.locked ? 'lock' : 'lock-open') + (s.current.locked ? ' Zaključano' : ' Otključano');
  $('lock').classList.toggle('locked',s.current.locked); $('lock').setAttribute('aria-pressed',s.current.locked);
  $('add-files').disabled = s.current.locked; $('watch-folder').disabled = s.current.locked;
  const markup = s.current.slots.map((slot,index) => {
    const number = String(index+1).padStart(2,'0');
    if (!slot) return `<button class="slot empty" data-index="${index}" aria-label="Taster ${index+1}: dodaj prezentaciju"><span class="slot-number">${number}</span><img class="empty-plus" src="../assets/icons/plus.svg" alt=""><span class="empty-label">Dodaj prezentaciju</span></button>`;
    const active = s.live?.id === slot.id, loading = s.loading === slot.id;
    const error = slot.error || slot.missing;
    return `<article class="slot ${active?'live':''} ${selected?.id===slot.id?'selected':''} ${loading?'loading':''} ${error?'error':''}" data-index="${index}" draggable="${!s.current.locked && !active}" title="${escape(error ? slot.error || 'Fajl nije pronađen' : slot.path)}" aria-label="${escape(slot.name)}${active?', aktivan prikaz':''}"><span class="slot-number">${number}</span>${active ? '<span class="live-badge">LIVE</span>' : ''}<button class="slot-trigger" aria-pressed="${selected?.id===slot.id}" aria-label="${escape(slot.name)}: izaberi"><div class="slot-preview">${slot.thumbnail ? `<img draggable="false" src="${slot.thumbnail}" alt="">` : `<span class="fallback-document ${slot.kind==='pdf'?'pdf':''}">${icon('file-text')}${slot.kind==='pdf'?'PDF':'PPT'}</span>`}</div></button><div class="slot-info"><button class="slot-name" title="Klik za izmenu naziva" aria-label="Izmeni naziv: ${escape(slot.name)}">${escape(slot.name)}</button><button class="key-label-button ${slot.keyLabel?'has-alias':''}" title="Natpis na Stream Decku" aria-label="Natpis tastera: ${escape(slot.keyLabel || slot.name)}">${icon('keyboard')}<span>${escape(slot.keyLabel || 'Natpis')}</span></button><span class="slot-meta"><span>${loading?'U TOKU':error?'GREŠKA':active?'LIVE':slot.kind.toUpperCase()}</span><span>${slot.slides ? slot.slides+' SLAJD.' : 'SPREMNO'}</span></span></div></article>`;
  }).join('');
  if (editing && (editing.eventId !== s.current.id || !s.current.slots.some(slot => slot?.id === editing.id))) editing = null;
  if (!editing && markup !== lastMarkup) { $('grid').innerHTML = markup; lastMarkup = markup; }
  const hasHardware = s.devices.some(d => d.devices?.length);
  $('deck-dot').classList.toggle('online',s.bridge.connected && hasHardware);
  $('deck-status').textContent = s.bridge.connected && hasHardware ? 'Stream Deck povezan' : 'Kontrola kroz aplikaciju';
  $('setup').textContent = 'Podešavanja';
  const summary=s.displays.map((d,i)=>{const role=s.routing.roles[d.id]||'none';return role==='none'?null:`${i+1}: ${role==='notes'?'Notes':'Slajdovi'}`;}).filter(Boolean).join(' · ');
  $('ppt-status').textContent=s.pptError?'PowerPoint · proveri dozvole':summary||'Izaberi izlaze u Ekranima';
  $('ppt-status').title = s.pptError || '';
  const cue=selected&&s.current.slots.find(slot=>slot?.id===selected.id);
  $('cue-panel').hidden=!cue;
  if(cue){$('cue-name').textContent=cue.name;$('cue-key').textContent=cue.keyLabel||'';$('cue-key').hidden=!cue.keyLabel;$('cue-number').textContent=String(s.current.slots.indexOf(cue)+1).padStart(2,'0');}
  $('go').disabled=!cue||s.busy||goPending||s.live?.id===cue.id||!!cue.missing;
  $('go').setAttribute('aria-label',cue?`GO: ${cue.name}`:'GO');
  ['stop','next','previous'].forEach(id=>$(id).disabled=!!s.busy);
  $('live-panel').hidden = !s.live;
  if (s.live) { $('live-name').textContent = s.live.name; $('live-position').textContent = `Slajd ${s.live.slide || 1}${s.live.total ? ' / '+s.live.total : ''}`; }
  const error = s.lastError || s.pptError;
  $('error').hidden = !error; $('error').querySelector('span').textContent = error;
  $('folder-status').hidden = !s.current.folder;
  if (s.current.folder) { $('folder-status').replaceChildren(); const text=document.createElement('span');text.textContent=`Folder: ${s.current.folder}${s.current.locked?' · dodavanje pauzirano dok je raspored zaključan':''}`; const button=document.createElement('button');button.textContent='Isključi';button.onclick=()=>command('unwatch');$('folder-status').append(text,button); }
  const monitors=s.displays.map((d,i)=>`<div class="monitor-row"><span class="monitor-number">${i+1}</span><div><strong>${escape(d.label)}</strong><small>${d.width} × ${d.height}${d.internal?' · Laptop':''}${d.id===s.routing.controlId?' · StageDeck':''}</small></div><select data-monitor="${d.id}" aria-label="Uloga ekrana ${i+1}" ${s.live||s.busy?'disabled':''}><option value="none" ${s.routing.roles[d.id]==='none'?'selected':''}>Samo kontrole</option><option value="notes" ${s.routing.roles[d.id]==='notes'?'selected':''}>Notes</option><option value="slides" ${s.routing.roles[d.id]==='slides'?'selected':''}>Slajdovi</option></select></div>`).join('');
  if(monitors!==monitorMarkup){$('monitor-list').innerHTML=monitors;monitorMarkup=monitors;}
  $('identify-displays').disabled=!!s.live||s.busy;$('auto-displays').disabled=!!s.live||s.busy;
  $('screen-status').textContent=s.routing.missing.length?'Dodeljeni ekran nije priključen. Prikaz neće biti preusmeren na drugi monitor.':s.live?'Zatvori prezentaciju pre promene rasporeda.':summary||'Izaberi bar jedan izlaz da pokreneš prezentaciju.';
  $('capture-hint').hidden=s.platform!=='darwin'||s.routing.captureAllowed;
  renderKeys(s);
  renderPdfThumbnails(s);
}
$('add-files').onclick = () => command('pick-files');
$('watch-folder').onclick = () => command('watch-folder');
$('lock').onclick = () => command('lock');
$('setup').onclick = () => $('setup-dialog').showModal();
$('close-setup').onclick = () => { command('setup-seen'); $('setup-dialog').close(); };
$('setup-dialog').addEventListener('cancel',()=>command('setup-seen'));
$('desktop-shortcut').onclick = async () => { const r=await command('desktop-shortcut'); $('setup-result').textContent=r.message || r.error; };
document.querySelectorAll('[data-theme]').forEach(b=>b.onclick=()=>command('theme',{theme:b.dataset.theme}));
$('install-plugin').onclick = async () => { const r=await command('install-plugin'); $('setup-result').textContent=r.message || r.error; };
$('import-profile').onclick = () => command('import-profile');
$('screens').onclick=()=>$('screens-dialog').showModal();
$('setup-screens').onclick=()=>{$('setup-dialog').close();$('screens-dialog').showModal();};
$('close-screens').onclick=()=>$('screens-dialog').close();
$('identify-displays').onclick=()=>command('identify-displays');
$('auto-displays').onclick=()=>command('display-roles-auto');
$('monitor-list').onchange=async event=>{
  const select=event.target.closest('[data-monitor]');if(!select)return;
  const roles={...state.routing.roles,[select.dataset.monitor]:select.value};
  const result=await command('display-roles',{roles});if(!result.ok)toast(result.error);
};
async function updateKeyPreview(){
  if(!keyEdit)return;const generation=++previewGeneration;
  const slot={...keyEdit.slot,keyLabel:$('key-label').value,keyFontSize:$('key-size').value==='auto'?'auto':Number($('key-size').value),keyLayout:$('key-layout').value};
  const image=await renderKey(slot,keyEdit.index,state);
  if(generation===previewGeneration)$('key-preview').src=image;
}
function editKey(index){
  if(state.current.locked){toast('Otključaj raspored za izmenu natpisa.');return;}
  const slot=state.current.slots[index];if(!slot)return;
  keyEdit={index,slot};$('key-file-name').textContent=slot.name;$('key-label').value=slot.keyLabel||'';$('key-size').value=slot.keyFontSize==='large'?'52':slot.keyFontSize==='normal'?'14':slot.keyFontSize||'auto';$('key-layout').value=slot.keyLayout||'title';
  $('key-dialog').showModal();updateKeyPreview();$('key-label').focus();
}
$('key-label').oninput=updateKeyPreview;$('key-size').onchange=updateKeyPreview;$('key-layout').onchange=updateKeyPreview;
$('cancel-key').onclick=()=>{$('key-dialog').close();keyEdit=null;};
$('reset-key').onclick=()=>{$('key-label').value='';$('key-size').value='auto';$('key-layout').value='preview';updateKeyPreview();};
$('key-form').onsubmit=async event=>{event.preventDefault();const result=await command('key-label',{index:keyEdit.index,id:keyEdit.slot.id,label:$('key-label').value,size:$('key-size').value==='auto'?'auto':Number($('key-size').value),layout:$('key-layout').value});if(result.ok){$('key-dialog').close();keyEdit=null;}else toast(result.error);};
$('go').onclick=async()=>{if(!selected||$('go').disabled)return;goPending=true;$('go').disabled=true;try{await command('play',{...selected});}finally{goPending=false;render(await window.stage.getState());}};
$('clear-cue').onclick=()=>{selected=null;render(state);};
$('stop').onclick = () => command('stop'); $('next').onclick = () => command('next'); $('previous').onclick = () => command('previous');
$('dismiss-error').onclick = () => command('dismiss-error');
$('new-event').onclick = () => openName('Novi događaj','',name => command('event-new',{name}));
$('rename-event').onclick = () => openName('Naziv događaja',state.current.name,name => command('event-rename',{name}));
$('name-form').onsubmit = async e => { e.preventDefault(); await nameAction?.($('name-input').value); $('name-dialog').close(); };
$('cancel-name').onclick = () => $('name-dialog').close();
$('events').onclick = e => { const button = e.target.closest('[data-event]'); if (button) command('event-switch',{id:button.dataset.event}); };
function editName(index) {
  if (state.current.locked) { toast('Otključaj raspored za izmenu naziva.'); return; }
  if (editing) return;
  const slot=state.current.slots[index]; if (!slot) return;
  const card=$('grid').querySelector(`[data-index="${index}"]`), label=card.querySelector('.slot-name');
  const input=document.createElement('input'); input.className='slot-name-editor'; input.value=slot.name;input.maxLength=100;input.setAttribute('aria-label','Naziv prezentacije');input.draggable=false;
  editing={index,id:slot.id,eventId:state.current.id};card.draggable=false;label.replaceWith(input);input.focus();input.select();
  let finished=false;
  async function finish(save) {
    if(finished)return;
    const name=input.value.trim();
    if(save&&!name){toast('Naziv ne može biti prazan.');input.focus();return;}
    finished=true;editing=null;lastMarkup='';
    if(save&&name!==slot.name){const result=await command('rename-slot',{index,id:slot.id,name});if(!result.ok)toast(result.error);}
    render(await window.stage.getState());
  }
  input.onkeydown=e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish(true);}if(e.key==='Escape'){e.preventDefault();finish(false);}};
  input.onblur=()=>finish(!!input.value.trim());
}
$('grid').onclick = e => {
  const card=e.target.closest('[data-index]'); if(!card||e.target.closest('input'))return;
  const index=Number(card.dataset.index);
  if(e.target.closest('.key-label-button')){editKey(index);return;}
  if(e.target.closest('.slot-name')) {editName(index);return;}
  if(card.classList.contains('empty')){command('pick-files',{index});return;}
  if(e.target.closest('.slot-trigger')){selected={id:state.current.slots[index].id,eventId:state.current.id};render(state);}
};
$('grid').oncontextmenu = e => {
  const card=e.target.closest('[data-index]'); if (!card || !state.current.slots[card.dataset.index]) return;
  e.preventDefault();menuIndex=Number(card.dataset.index);const menu=$('context-menu');menu.hidden=false;
  menu.style.left=Math.min(e.clientX,innerWidth-210)+'px';menu.style.top=Math.min(e.clientY,innerHeight-265)+'px';
};
$('context-menu').onclick = e => { const action=e.target.closest('[data-action]')?.dataset.action;$('context-menu').hidden=true;if(!action)return;if(action==='rename-slot')editName(menuIndex);else if(action==='edit-key-label')editKey(menuIndex);else command(action,{index:menuIndex}); };
document.addEventListener('click',e=>{if(!e.target.closest('#context-menu'))$('context-menu').hidden=true;});
$('grid').ondragstart = e => { const card=e.target.closest('[data-index]');if(!card||state.current.locked||editing||e.target.closest('input')){e.preventDefault();return;}dragIndex=Number(card.dataset.index);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('application/x-stagedeck-slot',String(dragIndex)); };
document.addEventListener('dragover',e=>{e.preventDefault();const card=e.target.closest('[data-index]');if(card)card.classList.add('drag-over');});
document.addEventListener('dragleave',e=>e.target.closest?.('[data-index]')?.classList.remove('drag-over'));
document.addEventListener('drop',async e=>{
  e.preventDefault();document.querySelectorAll('.drag-over').forEach(c=>c.classList.remove('drag-over'));
  const card=e.target.closest('[data-index]'),index=card?Number(card.dataset.index):undefined;
  const internal=e.dataTransfer.getData('application/x-stagedeck-slot');
  if(internal!==''){if(index!==undefined)await command('move',{from:Number(internal),to:index});dragIndex=null;return;}
  const paths=[...e.dataTransfer.files].map(f=>window.stage.filePath(f));if(paths.length)await command('import',{paths,index});
});
document.addEventListener('keydown',e=>{
  if(document.querySelector('dialog[open]')||['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName))return;
  if(e.key==='ArrowRight'){e.preventDefault();command('next');}if(e.key==='ArrowLeft'){e.preventDefault();command('previous');}if(e.key==='Escape'){if(state.live)command('stop');else if(selected){selected=null;render(state);}}
});
const pdfQueue=new Set(); let pdfWorker;
async function renderPdfThumbnails(s){
  for(const slot of s.current.slots.filter(x=>x?.kind==='pdf'&&!x.thumbnail&&!x.missing&&!pdfQueue.has(x.id))){
    pdfQueue.add(slot.id);
    try{
      pdfWorker ||= await import('../node_modules/pdfjs-dist/build/pdf.mjs');
      pdfWorker.GlobalWorkerOptions.workerSrc=new URL('../node_modules/pdfjs-dist/build/pdf.worker.mjs',location.href).href;
      const doc=await pdfWorker.getDocument({data:new Uint8Array(await window.stage.readPdf(slot.id)),isEvalSupported:false}).promise;
      const page=await doc.getPage(1),raw=page.getViewport({scale:1}),viewport=page.getViewport({scale:480/raw.width});
      const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;
      await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
      await window.stage.pdfRendered(slot.id,canvas.toDataURL('image/png'),doc.numPages);await doc.destroy();
    }catch(error){console.warn('PDF preview:',error.message);}
  }
}
window.stage.onState(render);render(await window.stage.getState());
