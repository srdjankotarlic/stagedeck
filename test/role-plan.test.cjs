const{test}=require('node:test');const assert=require('node:assert/strict');const{rolePlan,validateRoles}=require('../src/role-plan.cjs');const{placeSource,intersection}=require('../src/source-placement.cjs');
const displays=[{id:1,bounds:{x:0,y:0,width:1728,height:1117}},{id:2,bounds:{x:-2299,y:-1054,width:1920,height:1080}},{id:3,bounds:{x:-379,y:-1080,width:1920,height:1080}}];
test('all 27 three-screen role assignments preserve explicit selections and do not redirect unused screens',()=>{let count=0;for(const a of ['none','notes','slides'])for(const b of ['none','notes','slides'])for(const c of ['none','notes','slides']){const roles={1:a,2:b,3:c};const plan=rolePlan(displays,1,{displayRoles:roles});assert.equal(plan.notes.length,[a,b,c].filter(r=>r==='notes').length);assert.equal(plan.slides.length,[a,b,c].filter(r=>r==='slides').length);assert.equal(plan.hasOutput,[a,b,c].some(r=>r!=='none'));assert.deepEqual(plan.assignments,roles);count++;}assert.equal(count,27);});
test('disconnected assignments are reported instead of moving the output onto another screen',()=>{const plan=rolePlan(displays.slice(0,2),1,{displayRoles:{1:'none',2:'notes',3:'slides'}});assert.deepEqual(plan.missing,['3']);assert.equal(plan.slides.length,0);});
test('unknown roles and displays are rejected; default one-screen mode is usable without hardware',()=>{assert.throws(()=>validateRoles({1:'secret'},displays));assert.throws(()=>validateRoles({4:'slides'},displays));assert.equal(rolePlan(displays.slice(0,1),1).slidesRoot.id,1);});
test('native source placement never intersects a control-only monitor for all 26 output assignments',()=>{for(const a of ['none','notes','slides'])for(const b of ['none','notes','slides'])for(const c of ['none','notes','slides']){const plan=rolePlan(displays,1,{displayRoles:{1:a,2:b,3:c}});if(!plan.hasOutput)continue;const hosts=[...plan.notes,...plan.slides],unused=displays.filter(d=>plan.assignments[d.id]==='none');for(const frame of [{width:1728,height:1117},{width:1920,height:1080}]){const position=placeSource(frame,hosts,unused);assert.ok(unused.every(d=>intersection(position,d.bounds)===0));}}});

const display=(id,label)=>({id,label,bounds:{x:id*1000,y:0,width:1000,height:800}});
test('display labels preserve physical assignments when IDs are reused after reconnect or lid closure',()=>{
 const settings={displayRoles:{1:'none',2:'notes',3:'slides'},displayLabels:{1:'Built-in',2:'PHL',3:'HP'}};
 const plan=rolePlan([display(2,'HP'),display(3,'PHL')],2,settings);
 assert.deepEqual(plan.assignments,{'2':'slides','3':'notes'});assert.deepEqual(plan.missing,[]);
});
test('a reused display ID never redirects an assigned role onto a different monitor',()=>{
 const plan=rolePlan([display(2,'Other monitor')],2,{displayRoles:{2:'slides'},displayLabels:{2:'HP'}});
 assert.deepEqual(plan.missing,['2']);assert.equal(plan.hasOutput,false);
});
