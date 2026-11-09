const {test}=require('node:test');const assert=require('node:assert/strict');
const {windowHandle,findWindowSource}=require('../src/window-source.cjs');
test('Windows signed Office HWND and unsigned capture IDs select the exact same source',()=>{
  assert.equal(windowHandle(-2147483647),'2147483649');
  assert.equal(findWindowSource([{id:'window:2147483649:0',name:'selected'},{id:'window:123:0',name:'other'}],-2147483647).name,'selected');
  assert.equal(findWindowSource([{id:'window:-2147483647:0',name:'selected'}],'2147483649').name,'selected');
  assert.equal(findWindowSource([{id:'window:123:0'}],0),undefined);
  assert.equal(findWindowSource([{id:'window:1234:0'}],123),undefined);
});
