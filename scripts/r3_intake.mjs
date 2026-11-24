#!/usr/bin/env node
/** Internal draft recorder for natural-language co-creation. No writing authorization. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {projectRoot} from './v3_common.mjs';

const FILE='05-共创草案.json';
const CANON=['00-人物档案.md','01-大纲.md','02-写作计划.json','03-文风基准.md','story-ledger.json','reviews'];
const FIELDS={
  inspiration:{optional:true,stage:1,depends:[]},
  world:{stage:1,depends:[]},
  promise:{stage:1,depends:['world']},
  story:{stage:1,depends:['world','promise']},
  protagonist:{stage:1,depends:['world','story']},
  conflict:{stage:1,depends:['world','story','protagonist']},
  mechanism:{optional:true,stage:1,depends:['world','story','protagonist']},
  relationships:{optional:true,stage:1,depends:['story','protagonist','conflict']},
  constraints:{optional:true,stage:1,depends:[]},
  scope:{stage:2,depends:['story','promise']},
  ending:{stage:2,depends:['story','conflict','mechanism','relationships']},
  style:{stage:2,depends:['world','promise','protagonist']},
  title:{optional:true,stage:2,depends:['story','promise']}
};
const AUTH=new Set(['confirmed','delegated','not_applicable','deferred']);
const STATUSES=new Set(['proposed',...AUTH]);
const err=code=>{throw new Error(code)};
const nonempty=x=>typeof x==='string'&&x.trim().length>0;
const object=x=>x!==null&&typeof x==='object'&&!Array.isArray(x);
const keysOnly=(obj,allowed)=>Object.keys(obj).every(k=>allowed.includes(k));
function exists(file){try{fs.lstatSync(file);return true}catch(e){if(e.code==='ENOENT')return false;throw e}}
function assertPrecanon(root){
  if(CANON.some(n=>exists(path.join(root,n))))err('INTAKE_EXISTING_CANON');
}
function validateChange(key,x){
  if(!Object.hasOwn(FIELDS,key))err('INTAKE_UNKNOWN_FIELD:'+key);
  if(!object(x)||!keysOnly(x,['status','value','source','basis'])||!STATUSES.has(x.status))
    err('INTAKE_INVALID_CHANGE:'+key);
  if(['confirmed','proposed'].includes(x.status)&&!nonempty(x.value))err('INTAKE_VALUE_REQUIRED:'+key);
  if(x.status==='delegated'&&x.value!==null&&!nonempty(x.value))err('INTAKE_DELEGATED_VALUE:'+key);
  if(['not_applicable','deferred'].includes(x.status)){
    if(!FIELDS[key].optional||x.value!==null)err('INTAKE_REQUIRED_FIELD:'+key);
  }
  if(AUTH.has(x.status)&&(!object(x.source)||!keysOnly(x.source,['ref','quote'])||!nonempty(x.source.ref)||!nonempty(x.source.quote)))
    err('INTAKE_AUTHOR_SOURCE_REQUIRED:'+key);
  if(x.status==='proposed'&&Object.hasOwn(x,'source'))err('INTAKE_PROPOSAL_NOT_AUTHOR_DECISION:'+key);
  if(Object.hasOwn(x,'basis')&&!nonempty(x.basis))err('INTAKE_INVALID_BASIS:'+key);
}
function changed(a,b){return !a||a.value!==b.value||a.status!==b.status}
function affected(seeds){
  const out=new Set(seeds);
  let count=-1;
  while(count!==out.size){
    count=out.size;
    for(const [key,field] of Object.entries(FIELDS))if(field.depends.some(d=>out.has(d)))out.add(key);
  }
  return out;
}
function replay(doc){
  if(!object(doc)||!keysOnly(doc,['schemaVersion','events'])||doc.schemaVersion!==1||!Array.isArray(doc.events))err('INTAKE_INVALID_DRAFT');
  const fields={},review=new Set();
  for(const event of doc.events){
    if(!object(event)||!keysOnly(event,['changes'])||!object(event.changes)||!Object.keys(event.changes).length)err('INTAKE_INVALID_EVENT');
    const changes=event.changes;
    for(const [key,x] of Object.entries(changes)){
      validateChange(key,x);
      // A model-generated proposal cannot replace an actual author decision.
      if(AUTH.has(fields[key]?.status)&&x.status==='proposed')err('INTAKE_AUTHOR_DECISION_PROTECTED:'+key);
    }
    const seeds=Object.keys(changes).filter(k=>changed(fields[k],changes[k]));
    const impacted=affected(seeds);
    for(const key of impacted){
      if(fields[key]&&!Object.hasOwn(changes,key))review.add(key);
    }
    for(const [key,x] of Object.entries(changes)){fields[key]=x;review.delete(key)}
  }
  return {fields,review:[...review].sort(),revision:doc.events.length};
}
function summarize(doc){
  const {fields,review,revision}=replay(doc);
  const pending=[],proposed=[],delegated=[],deferred=[],reviewNeeded=[];
  for(const key of Object.keys(FIELDS)){
    const x=fields[key];
    if(review.includes(key)){reviewNeeded.push(key);continue}
    if(!x){pending.push(key);continue}
    if(x.status==='proposed')proposed.push(key);
    else if(x.status==='delegated'&&x.value===null)delegated.push(key);
    else if(x.status==='deferred')deferred.push(key);
  }
  const resolved=key=>{
    const x=fields[key];
    return !!x&&!review.includes(key)&&((['confirmed','delegated'].includes(x.status)&&nonempty(x.value))||
      (FIELDS[key].optional&&['not_applicable','deferred'].includes(x.status)));
  };
  const missingFor=stage=>Object.keys(FIELDS).filter(k=>FIELDS[k].stage<=stage&&!FIELDS[k].optional&&!resolved(k));
  return {status:'draft',revision,fields,pending,proposed,delegatedToAI:delegated,deferred,reviewNeeded,
    unresolvedStoryCore:missingFor(1),unresolvedBlueprint:missingFor(2),
    optionalUnresolved:Object.keys(FIELDS).filter(k=>FIELDS[k].optional&&!resolved(k)),
    planningReady:missingFor(2).length===0,authorApproval:false,writingAuthorized:false};
}
function read(file){
  const st=fs.lstatSync(file);
  if(st.isSymbolicLink()||!st.isFile()||st.nlink!==1)err('INTAKE_UNSAFE_FILE');
  const doc=JSON.parse(fs.readFileSync(file,'utf8'));
  replay(doc);return doc;
}
function writeNew(file,doc){fs.writeFileSync(file,JSON.stringify(doc,null,2)+'\n',{flag:'wx',mode:0o600})}
function writeAtomic(file,doc){
  const temp=file+'.tmp-'+crypto.randomUUID();
  try{writeNew(temp,doc);fs.renameSync(temp,file)}
  finally{if(exists(temp))fs.rmSync(temp)}
}
function run(){
  const [rootArg,action,...rest]=process.argv.slice(2);
  if(!rootArg||!['init','status','update'].includes(action)||rest.length)err('INTAKE_USAGE');
  const root=projectRoot(rootArg),file=path.join(root,FILE);
  if(action==='status'){
    if(!exists(file))return {status:CANON.some(n=>exists(path.join(root,n)))?'existing_project':'not_started',writingAuthorized:false};
    const result=summarize(read(file));
    if(CANON.some(n=>exists(path.join(root,n))))result.status='historical_draft';
    return result;
  }
  assertPrecanon(root);
  if(action==='init'){
    if(exists(file))return summarize(read(file));
    const doc={schemaVersion:1,events:[]};writeNew(file,doc);return summarize(doc);
  }
  const doc=read(file),patch=JSON.parse(fs.readFileSync(0,'utf8'));
  if(!object(patch)||!keysOnly(patch,['baseRevision','changes'])||patch.baseRevision!==doc.events.length)err('INTAKE_STALE_REVISION');
  const next={schemaVersion:1,events:[...doc.events,{changes:patch.changes}]};
  const result=summarize(next);
  writeAtomic(file,next);return result;
}
try{console.log(JSON.stringify(run(),null,2))}
catch(e){console.log(JSON.stringify({status:'error',error:e.message,writingAuthorized:false}));process.exitCode=2}
