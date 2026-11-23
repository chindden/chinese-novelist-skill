import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const gate=fileURLToPath(new URL('../v3_gate.mjs',import.meta.url));
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'novelist-gate-'));
function call(...argv) {
  const p=spawnSync(process.execPath,[gate,...argv],{encoding:'utf8'});
  return {code:p.status,value:JSON.parse(p.status===0?p.stdout:p.stderr)};
}
function plan(done) {
  fs.writeFileSync(path.join(tmp,'02-写作计划.json'),JSON.stringify({
    chapters:[1,2,3,4].map(n=>({chapterNumber:n,filePath:'chapter'+n+'.md',status:n<=done?'completed':'pending'}))
  }));
  for(let n=1;n<=3;n++)fs.writeFileSync(path.join(tmp,'chapter'+n+'.md'),'第'+n+'章中文测试正文');
}
function report(decision,issues) {
  const fp=call('fingerprint',tmp);
  const f=path.join(tmp,'review.json');
  fs.writeFileSync(f,JSON.stringify({scope:'chapters-1-3',reviewer:'independent-editor',openingDigest:fp.value.openingDigest||'',decision,summary:'独立审稿结果',issues}));
  return f;
}
const problem={id:'E1',chapter:2,severity:'major',excerpt:'钥匙一碰门就开了',reason:'设定冲突',reader_impact:'逻辑不可信',fix:'补充开门机制'};
let passed=0;
function test(name,fn) {fn();passed++;console.log('PASS '+name);}
try {
  plan(2);
  test('initialize',()=>assert.equal(call('init',tmp).code,0));
  test('reject init twice',()=>assert.equal(call('init',tmp).code,1));
  test('allow chapter 3',()=>assert.equal(call('check',tmp,'3').code,0));
  test('block chapter 4',()=>assert.equal(call('check',tmp,'4').code,1));
  test('reject review before chapter 3 completed',()=>assert.equal(call('record-review',tmp,report('pass',[])).code,1));
  plan(3);
  test('reject unsupported revise',()=>assert.equal(call('record-review',tmp,report('revise',[])).code,1));
  test('major defect triggers revision',()=>assert.equal(call('record-review',tmp,report('revise',[problem])).value.status,'needs_revision'));
  test('major defect cannot pass',()=>assert.equal(call('record-review',tmp,report('pass',[problem])).code,1));
  test('clean pass awaits user',()=>assert.equal(call('record-review',tmp,report('pass',[])).value.status,'awaiting_user_approval'));
  test('approval required',()=>assert.equal(call('check',tmp,'4').code,1));
  test('no fake approval by omission',()=>assert.equal(call('approve',tmp).code,1));
  test('approve with quoted user instruction',()=>assert.equal(call('approve',tmp,'--user-quote','确认放行第4章').code,0));
  test('unlock chapter 4',()=>assert.equal(call('check',tmp,'4').code,0));
  test('editing chapter invalidates review',()=>{fs.appendFileSync(path.join(tmp,'chapter2.md'),'新增内容');assert.equal(call('check',tmp,'4').code,1);});
  console.log(passed+' passed, 0 failures');
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
