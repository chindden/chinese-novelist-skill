import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const scripts=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const script=path.join(scripts,'r3_intake.mjs');
const file='05-共创草案.json';
function setup(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'r3-intake-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root}
function cli(root,action,patch){const r=spawnSync(process.execPath,[script,root,action],{encoding:'utf8',input:patch===undefined?undefined:JSON.stringify(patch)});return {code:r.status,out:JSON.parse(r.stdout)}}
const source=(quote)=>({ref:'fixture:author-message',quote});
const confirmed=value=>({status:'confirmed',value,source:source(value)});
const proposed=value=>({status:'proposed',value,basis:'fixture: knowledge reference'});
const delegate=(value=null)=>({status:'delegated',value,source:source('这个细节交给AI决定')});
const na=()=>({status:'not_applicable',value:null,source:source('不需要该机制')});
const update=(r,baseRevision,changes)=>cli(r,'update',{baseRevision,changes});
test('natural seed only: persist and resume without creating canon or author approvals',t=>{
  const r=setup(t);assert.equal(cli(r,'status').out.status,'not_started');assert.equal(cli(r,'init').code,0);
  const a=update(r,0,{world:confirmed('仙侠'),mechanism:confirmed('寿命无限，资质平庸'),story:proposed('凡人家族成长')});
  assert.equal(a.code,0);assert.equal(a.out.revision,1);
  assert.deepEqual(cli(r,'status').out,a.out);
  assert.deepEqual(cli(r,'init').out,a.out);
  assert.equal(a.out.fields.mechanism.value,'寿命无限，资质平庸');
  assert.ok(!a.out.pending.includes('world'));
  assert.ok(a.out.proposed.includes('story'));
  assert.equal(a.out.planningReady,false);assert.equal(a.out.writingAuthorized,false);
  assert.deepEqual(fs.readdirSync(r),[file]);
});
test('author-delegated choice differs from proposal, optional no mechanism and efficient batch confirmation',t=>{
  const r=setup(t);cli(r,'init');
  const a=update(r,0,{world:confirmed('现实都市'),promise:confirmed('职场成长'),story:confirmed('工程团队面临抉择'),protagonist:confirmed('项目经理'),conflict:confirmed('职业伦理与晋升'),mechanism:na(),relationships:delegate(),constraints:na(),scope:delegate('约60章，每章3000字'),ending:delegate('承担责任后自主选择新方向'),style:confirmed('克制现实'),title:{status:'deferred',value:null,source:source('书名以后定')}});
  assert.equal(a.code,0);assert.equal(a.out.planningReady,true);
  assert.deepEqual(a.out.delegatedToAI,['relationships']);
  assert.deepEqual(a.out.deferred,['title']);assert.equal(a.out.authorApproval,false);
  assert.equal(a.out.writingAuthorized,false);
  const b=update(r,1,{relationships:delegate('同事是自主竞争者兼盟友')});
  assert.equal(b.code,0);assert.ok(b.out.reviewNeeded.includes('ending'));
});
test('changing core facts preserves prior decisions and surfaces dependent review, not repeated questions',t=>{
  const r=setup(t);cli(r,'init');
  assert.equal(update(r,0,{world:confirmed('仙侠'),story:confirmed('宗门发展'),protagonist:confirmed('掌门'),mechanism:confirmed('寿命无限'),style:confirmed('轻松'),inspiration:confirmed('原创')}).code,0);
  const a=update(r,1,{world:confirmed('科幻')});
  assert.equal(a.code,0);assert.ok(a.out.reviewNeeded.includes('mechanism'));assert.ok(a.out.reviewNeeded.includes('story'));
  assert.ok(!a.out.reviewNeeded.includes('inspiration'));
  assert.equal(a.out.fields.mechanism.value,'寿命无限');
  const b=update(r,2,{story:confirmed('星际组织发展'),protagonist:confirmed('舰队管理者'),mechanism:confirmed('长期医疗技术')});
  assert.equal(b.code,0);assert.ok(!b.out.reviewNeeded.includes('mechanism'));
  assert.ok(b.out.reviewNeeded.includes('style'));
});
test('reject stale edits, fabricated shape and model replacement of author choice without mutation',t=>{
  const r=setup(t);cli(r,'init');assert.equal(update(r,0,{world:confirmed('悬疑')}).code,0);
  const before=fs.readFileSync(path.join(r,file));
  for(const [rev,changes,expected] of [[0,{world:confirmed('历史')},'STALE_REVISION'],[1,{world:proposed('历史')},'AUTHOR_DECISION_PROTECTED'],[1,{conflict:{status:'confirmed',value:'冲突'}},'AUTHOR_SOURCE_REQUIRED'],[1,{world:na()},'REQUIRED_FIELD'],[1,{unknown:proposed('内容')},'UNKNOWN_FIELD']]){
    const a=update(r,rev,changes);assert.equal(a.code,2);assert.match(a.out.error,new RegExp(expected));assert.deepEqual(fs.readFileSync(path.join(r,file)),before);
  }
});
test('existing novels do not reinitialize or write draft, historical draft remains read-only',t=>{
  const r=setup(t);const canon=path.join(r,'02-写作计划.json');fs.writeFileSync(canon,'{"existing":true}');
  assert.equal(cli(r,'status').out.status,'existing_project');assert.equal(cli(r,'init').code,2);
  assert.equal(fs.existsSync(path.join(r,file)),false);fs.rmSync(canon);cli(r,'init');
  update(r,0,{world:confirmed('历史')});const before=fs.readFileSync(path.join(r,file));fs.writeFileSync(canon,'{"existing":true}');
  assert.equal(cli(r,'status').out.status,'historical_draft');assert.equal(update(r,1,{world:confirmed('其他')}).code,2);
  assert.deepEqual(fs.readFileSync(path.join(r,file)),before);assert.equal(fs.readFileSync(canon,'utf8'),'{"existing":true}');
});
test('draft symlink and corrupt content fail closed; no outside mutation',t=>{
  const r=setup(t),other=setup(t),target=path.join(other,'outside.json');fs.writeFileSync(target,'{}');
  fs.symlinkSync(target,path.join(r,file));assert.equal(cli(r,'status').code,2);assert.equal(cli(r,'init').code,2);
  assert.equal(fs.readFileSync(target,'utf8'),'{}');fs.unlinkSync(path.join(r,file));
  fs.writeFileSync(path.join(r,file),'{bad');assert.equal(cli(r,'status').code,2);assert.equal(cli(r,'init').code,2);
});
