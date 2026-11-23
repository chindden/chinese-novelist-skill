#!/usr/bin/env node
/** V3 opening quality gate; Node >= 18; no third-party packages.
 * init PROJECT
 * fingerprint PROJECT
 * check PROJECT CHAPTER
 * record-review PROJECT REPORT.json
 * approve PROJECT --user-quote "用户实际的放行原话"
 * status PROJECT
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import process from 'node:process';

const FILE = '04-开篇门禁.json';
const DECISIONS = ['pass','revise','rebuild'];
const SEVERITIES = ['blocking','major','minor'];
const ensure = (yes,message) => { if (!yes) throw Error(message); };
const validText = x => typeof x === 'string' && x.trim().length > 0;

async function context(project) {
  const root = await fs.realpath(path.resolve(project));
  const plan = JSON.parse(await fs.readFile(path.join(root,'02-写作计划.json'),'utf8'));
  ensure(Array.isArray(plan.chapters),'缺少 chapters 章节计划');
  return {root,plan};
}
async function digest(root,plan) {
  const hash=createHash('sha256');
  for (const n of [1,2,3]) {
    const c=plan.chapters.find(x=>x.chapterNumber===n);
    ensure(c && c.status==='completed' && validText(c.filePath),'第'+n+'章未完成或没有正文路径');
    const absolute=path.resolve(root,c.filePath);
    const relative=path.relative(root,absolute);
    ensure(relative && relative!=='..' && !relative.startsWith('..'+path.sep) && !path.isAbsolute(relative),'正文路径越界');
    const data=await fs.readFile(absolute);
    ensure(data.length>0,'第'+n+'章正文为空');
    hash.update(n+'\0'+relative+'\0'); hash.update(data); hash.update('\0');
  }
  return hash.digest('hex');
}
async function load(root) {
  const gate=JSON.parse(await fs.readFile(path.join(root,FILE),'utf8'));
  ensure(gate.version===1 && validText(gate.status),'门禁数据无效');
  return gate;
}
async function persist(root,gate) {
  const tmp=path.join(root,'.'+FILE+'.'+process.pid+'.tmp');
  try {
    await fs.writeFile(tmp,JSON.stringify(gate,null,2)+'\n',{flag:'wx'});
    await fs.rename(tmp,path.join(root,FILE));
  } finally {await fs.rm(tmp,{force:true}).catch(()=>{});}
}
function validateReport(report) {
  ensure(report && typeof report==='object' && !Array.isArray(report),'报告必须为 JSON 对象');
  ensure(report.scope==='chapters-1-3','报告 scope 必须为 chapters-1-3');
  ensure(validText(report.reviewer) && report.reviewer!=='writer','必须标记非写手的独立审稿角色');
  ensure(DECISIONS.includes(report.decision),'无效 decision');
  ensure(validText(report.openingDigest) && /^[a-f0-9]{64}$/.test(report.openingDigest),'缺少正文 SHA-256 指纹');
  ensure(validText(report.summary) && Array.isArray(report.issues),'缺少审稿摘要或缺陷数组');
  const ids=new Set();
  for (const issue of report.issues) {
    ensure(issue && validText(issue.id) && !ids.has(issue.id),'缺陷 ID 为空或重复');
    ids.add(issue.id);
    ensure(SEVERITIES.includes(issue.severity) && [1,2,3].includes(issue.chapter),'缺陷级别或章节无效');
    for (const field of ['excerpt','reason','reader_impact','fix'])
      ensure(validText(issue[field]),issue.id+' 缺少 '+field);
    ensure(issue.excerpt.length<=500,issue.id+' 原文引用过长');
  }
  if (report.decision==='pass')
    ensure(!report.issues.some(x=>x.severity!=='minor'),'含重大缺陷，禁止 pass');
  else
    ensure(report.issues.some(x=>x.severity!=='minor'),'返工报告必须有重大缺陷证据');
}
async function run(args) {
  const [action,project,...other]=args;
  ensure(['init','fingerprint','check','record-review','approve','status'].includes(action) && project,'无效命令');
  const {root,plan}=await context(project);
  if (action==='init') {
    const value={version:1,status:'awaiting_opening',review:null,reviewHistory:[],userApproval:null,updatedAt:new Date().toISOString()};
    await fs.writeFile(path.join(root,FILE),JSON.stringify(value,null,2)+'\n',{flag:'wx'});
    return {status:value.status};
  }
  const gate=await load(root);
  if (action==='status') return {status:gate.status,decision:gate.review?.decision??null,approved:!!gate.userApproval};
  if (action==='fingerprint') return {openingDigest:await digest(root,plan)};
  if (action==='check') {
    const n=Number(other[0]);
    ensure(Number.isSafeInteger(n) && n>=1 && plan.chapters.some(c=>c.chapterNumber===n),'无效章号');
    if (n>3) {
      ensure(gate.status==='approved' && gate.review?.decision==='pass' && gate.userApproval,'BLOCKED: 前三章未获独立审稿和用户放行');
      ensure((await digest(root,plan))===gate.review.openingDigest,'BLOCKED: 前三章正文改变，旧审稿失效');
    }
    return {chapter:n,allowed:true,status:gate.status};
  }
  if (action==='record-review') {
    ensure(other.length===1,'需要 REPORT.json 路径');
    ensure(gate.status!=='approved','已放行的版本不能静默覆盖报告');
    const report=JSON.parse(await fs.readFile(path.resolve(other[0]),'utf8'));
    validateReport(report);
    ensure(report.openingDigest===await digest(root,plan),'审稿指纹与当前前三章内容不一致');
    const item={...report,receivedAt:new Date().toISOString()};
    gate.review=item; gate.reviewHistory.push(item); gate.userApproval=null;
    gate.status=report.decision==='pass'?'awaiting_user_approval':'needs_revision';
    gate.updatedAt=new Date().toISOString();
    await persist(root,gate);
    return {status:gate.status,issues:report.issues.length};
  }
  if (action==='approve') {
    ensure(other.length===2 && other[0]==='--user-quote' && validText(other[1]),'必须提供真实用户放行原话');
    ensure(gate.status==='awaiting_user_approval' && gate.review?.decision==='pass','独立审稿尚未通过');
    ensure(/批准|确认|同意|放行/.test(other[1]),'放行措辞不明确');
    ensure(await digest(root,plan)===gate.review.openingDigest,'正文变动，需重新审稿');
    gate.status='approved';
    gate.userApproval={quote:other[1],recordedAt:new Date().toISOString()};
    gate.updatedAt=new Date().toISOString();
    await persist(root,gate);
    return {status:gate.status};
  }
}
try { console.log(JSON.stringify({ok:true,...await run(process.argv.slice(2))})); }
catch(e) {console.error(JSON.stringify({ok:false,error:e.message}));process.exitCode=1;}
