const {test}=require('node:test');const assert=require('node:assert/strict');const {planDisplays}=require('../src/displays.cjs');
const displays=[{id:1},{id:2},{id:3}];
test('notes follow the desk and audience never shares its monitor when another exists',()=>{
 assert.equal(planDisplays(displays,1).audience.id,2);
 assert.equal(planDisplays(displays,2).audience.id,1);
 assert.equal(planDisplays(displays,3).audience.id,2);
 assert.equal(planDisplays(displays,2,2).audience.id,1);
 assert.equal(planDisplays(displays,1,3).audience.id,3);
 assert.equal(planDisplays([{id:1}],1).separate,false);
});
