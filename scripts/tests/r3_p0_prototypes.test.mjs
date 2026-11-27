#!/usr/bin/env node
/**
 * P0-5 Comprehensive Prototype Test Suite (`TC-P0-5-1` ~ `TC-P0-5-5`):
 *   TC-P0-5-1: A/B/C 三方案统一共享 precheck v2 + reviewFingerprint 底座并产出通过 P0-4 Fail-Closed 校验的 FinalCalibrationReport
 *   TC-P0-5-2: 方案 B Pass 2 严格上下文隔离（仅候选 + ±300 字原文窗口 + 核心规划，不注入全章全文）与 Pass 1 缺取证槽 Fail-Closed 拒收
 *   TC-P0-5-3: 方案 C 短路机制（Stage 1 清白 pass_candidate 且全部 NSA=pass -> Stage 2 调用=0；含 BLOCKER/MAJOR、advisories 或非 pass NSA -> 强制触发 Stage 2）
 *   TC-P0-5-4: impactScope 硬拦截（upstream_planning / finalized_canon 混入写手改稿批 -> exit code 2）与 OR6 PLANNING_CONFLICT_BLOCK 路由 + 合法桥段非阻断
 *   TC-P0-5-5: 生产隔离校验（SKILL.md 及全部非 prototypes/ 下的 references/ 文件与 b5572a94 零字节差异 + 原型模板完备性校验）
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  DIMENSION_SLOTS,
  R3_DISCOVERY_REPORT_SCHEMA,
  R3_FINAL_REPORT_SCHEMA,
  applyR3Review,
} from '../r3_review_kernel.mjs';
import {
  PROTOTYPE_TEMPLATE_FILES,
  loadPrototypeTemplate,
  compileSharedReviewBasePack,
} from '../p0_prototypes/review_pack_compiler.mjs';
import {
  assertWriterRevisionBatchSafe,
  routeFinalReviewReport,
} from '../p0_prototypes/impact_scope_router.mjs';
import {
  runSchemeA,
  runSchemeB,
  runSchemeC,
  runAllThreeSchemesComparison,
} from '../p0_prototypes/abc_orchestrator.mjs';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const ROUTER_CLI = fileURLToPath(new URL('../p0_prototypes/impact_scope_router.mjs', import.meta.url));

function makeSandboxProject(t, {longChapter = false} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p05-proto-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));

  fs.mkdirSync(path.join(root, 'chapters'), {recursive: true});

  const ch1 = '# 第一章 盐引旧账\n\n周衡核验完柜台银钱三十二两，收妥账册离开。\n';
  const distantHeadMarker = '【远端开篇哨兵段_绝不可泄露进Pass2上下文_ALPHA99】';
  const distantTailMarker = '【远端末尾哨兵段_绝不可泄露进Pass2上下文_OMEGA99】';
  const candidateQuote = '冷库木门正上方三米处有一道半尺宽的排风口，寒风顺着木格灌进屋内，灯芯轻轻摇晃。';
  const strengthQuote = '周衡将护心镜按在左肋外侧，贴着青砖墙檐缓缓挪步。';

  const fillerPara = '雨水顺着青瓦缓缓滑落，街巷尽头灯火微明，巡夜人的木梆声远远传来又很快散进雾气里，檐下石阶湿滑冰凉。'.repeat(12);
  const ch2 = longChapter
    ? [
        '# 第二章 寒夜探库',
        `${distantHeadMarker}${fillerPara}`,
        fillerPara,
        `${strengthQuote}账册上分明写着九月廿三比原定廿六提前两日交割，连同三副药膏一并入了偏库。`,
        fillerPara,
        `${candidateQuote}赵有福站在院角，目光掠过半掩的门缝，始终没有开口。`,
        fillerPara,
        `${distantTailMarker}${fillerPara}`,
      ].join('\n\n') + '\n'
    : [
        '# 第二章 寒夜探库',
        strengthQuote,
        '账册上分明写着九月廿三比原定廿六提前两日交割，连同三副药膏一并入了偏库。',
        candidateQuote,
        '赵有福站在院角，目光掠过半掩的门缝，始终没有开口。',
      ].join('\n\n') + '\n';

  fs.writeFileSync(path.join(root, 'chapters/ch001.md'), ch1, 'utf8');
  fs.writeFileSync(path.join(root, 'chapters/ch002.md'), ch2, 'utf8');

  fs.writeFileSync(
    path.join(root, '00-人物档案.md'),
    '# 人物档案\n## 核心人设\n周衡谨慎守信，无超自然能力。\n## 动态状态与远期弧线\n第二章夜探偏库。\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, '01-大纲.md'),
    '# 大纲\n## 核心契约\n现实向古风推理，遵守物理与几何约束。\n## 滚动卷纲\n### 第1卷\n#### 第1章\n盐引盘点。\n#### 第2章\n周衡携护心镜夜探偏库，核对九月交割日期与排风口布局。\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, '03-文风基准.md'),
    '# 文风基准\n## 文风指纹\n冷峻克制，动作链凝练。\n## 本书校准段落\n雨水敲在青瓦上，声音细密。\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, 'story-ledger.json'),
    JSON.stringify({
      schemaVersion: 1,
      facts: [
        {id: 'F-1', chapter: 1, scope: 'chapter', kind: 'established', subject: '周衡', key: '银钱余额', value: '32两', evidence: '核验完柜台银钱三十二两'},
      ],
      foreshadowing: [{id: 'P-1', chapter: 1, description: '副簿缺页线索', status: 'open'}],
      relationships: [{id: 'R-1', chapter: 1, characters: ['周衡', '赵有福'], change: '初次试探', consequence: '互留后手'}],
      mechanisms: [{id: 'M-1', chapter: 1, goal: '查账', strategy: '对照底簿', opposition: '涂改', cost: '暴露意图', outcome: '锁定偏库'}],
      handoffs: [{chapter: 1, asOf: '九月廿二夜', events: [{when: '戌时', event: '盘点完银钱'}], knowledge: [{character: '周衡', change: '锁定偏库'}]}],
    }, null, 2) + '\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, '02-写作计划.json'),
    JSON.stringify({
      novelName: 'P0-5 三方案对照沙箱',
      writingMode: 'serial',
      minWordsPerChapter: 500,
      hardConstraints: {mustInclude: ['护心镜'], mustExclude: ['智能手机']},
      chapters: [
        {chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md', status: 'completed', wordCount: 500, wordCountPass: true, volume: 1},
        {chapterNumber: 2, title: '第二章', filePath: 'chapters/ch002.md', status: 'draft', volume: 1},
      ],
      v3: {
        schemaVersion: 1,
        creativeDecision: 'accepted',
        storyPlanApproved: true,
        r2: {schemaVersion: 1, chapterReviews: {}, arcReviews: {}},
        r3: {
          schemaVersion: 1,
          mode: 'experimental',
          status: 'bootstrap',
          reviewPolicy: 'every_chapter',
          corePlan: {status: 'pending'},
          volumeCheckpoints: {},
          finalRefinement: {status: 'pending'},
        },
      },
    }, null, 2) + '\n',
    'utf8'
  );

  return {root, candidateQuote, strengthQuote, distantHeadMarker, distantTailMarker};
}

function makeFullSlots(raisedDim = null) {
  return DIMENSION_SLOTS.map(d => ({
    dimension: d,
    checkedAnchor: `核查维度 ${d} 对应正文段落、数值与几何锚点`,
    status: d === raisedDim ? 'issue_raised' : 'pass',
  }));
}

function makeNsaResolutions(needsSemanticAudit, statusOverride = null) {
  return (needsSemanticAudit || []).map((item, idx) => ({
    auditId: item.auditId,
    status: statusOverride && idx === 0 ? statusOverride : 'pass',
    note: `独立核验 ${item.auditId}（${item.category}）完成`,
  }));
}

// ============================================================================
// TC-P0-5-1: A / B / C 三方案统一输出契约与共享底座无偏置对照
// ============================================================================
test('TC-P0-5-1: Schemes A, B, and C share identical base pack and all output FinalCalibrationReport passing P0-4 Fail-Closed validation', async t => {
  const {root, candidateQuote, strengthQuote} = makeSandboxProject(t);

  const adapterA = {
    runSingleStage: input => ({
      schemaVersion: R3_FINAL_REPORT_SCHEMA,
      protocolMode: 'single_stage_A',
      reviewFingerprint: input.reviewFingerprint,
      manuscriptHashes: input.manuscriptHashes,
      reviewer: {runId: 'rev-a', contextId: 'ctx-a', role: 'chapter_review_arbiter'},
      decision: 'revise',
      dimensionAuditSlots: makeFullSlots('HL-6'),
      semanticAuditResolutions: makeNsaResolutions(input.needsSemanticAudit),
      issues: [{
        id: 'ISS-A1',
        dimension: 'HL-6',
        severity: 'MAJOR',
        impactScope: 'draft_only',
        blocking: true,
        mustCloseInReReview: true,
        quote: candidateQuote,
        evidence: '排风口高度与人物伸手动作存在局部距离偏差',
        reverseDefense: '即使人物借凳垫高，原文未交代垫脚动作，普通读者会产生空间错位。',
        narrativeGuidance: '补写人物借木箱垫脚探看排风口的自然动作。',
      }],
      planningConflictAdvisories: [],
      preserveStrengths: [{quote: strengthQuote, reason: '动作凝练，气氛克制'}],
      revisionProtection: {strengthsPreserved: true, defensivePatchDetected: false},
    }),
  };

  const adapterB = {
    runPass1Discovery: input => ({
      schemaVersion: R3_DISCOVERY_REPORT_SCHEMA,
      protocolMode: 'two_stage_B',
      reviewFingerprint: input.reviewFingerprint,
      reviewer: {runId: 'rev-b1', contextId: 'ctx-b1', role: 'chapter_discovery_auditor'},
      dimensionAuditSlots: makeFullSlots('HL-6'),
      semanticAuditResolutions: makeNsaResolutions(input.needsSemanticAudit),
      candidates: [{
        candidateId: 'CAND-B1',
        dimension: 'HL-6',
        quote: candidateQuote,
        objectiveContradiction: '三米高度排风口与后续动作距离需定级核验',
        suspectedImpactScope: 'draft_only',
      }],
      preserveStrengths: [{quote: strengthQuote, reason: '动作凝练，气氛克制'}],
    }),
    runPass2Calibration: input => ({
      schemaVersion: R3_FINAL_REPORT_SCHEMA,
      protocolMode: 'two_stage_B',
      reviewFingerprint: input.reviewFingerprint,
      manuscriptHashes: input.manuscriptHashes,
      reviewer: {runId: 'rev-b2', contextId: 'ctx-b2', role: 'chapter_review_arbiter'},
      decision: 'revise',
      dimensionAuditSlots: input.dimensionAuditSlots,
      semanticAuditResolutions: input.semanticAuditResolutions,
      issues: [{
        id: 'ISS-B1',
        dimension: 'HL-6',
        severity: 'MAJOR',
        impactScope: 'draft_only',
        blocking: true,
        mustCloseInReReview: true,
        quote: input.candidatesWithContext[0].quote,
        evidence: '排风口高度需补充借物动作',
        reverseDefense: '核查前后 300 字窗口未见垫脚物，确认属真实空间断层。',
        narrativeGuidance: '在探查排风口前补足借物落脚的细节。',
      }],
      planningConflictAdvisories: [],
      preserveStrengths: input.preserveStrengths,
      revisionProtection: {strengthsPreserved: true, defensivePatchDetected: false},
    }),
  };

  const adapterC = {
    runStage1HighRecall: input => ({
      schemaVersion: R3_FINAL_REPORT_SCHEMA,
      protocolMode: 'single_plus_triage_C',
      reviewFingerprint: input.reviewFingerprint,
      manuscriptHashes: input.manuscriptHashes,
      reviewer: {runId: 'rev-c1', contextId: 'ctx-c1', role: 'chapter_review_arbiter'},
      decision: 'revise',
      dimensionAuditSlots: makeFullSlots('HL-6'),
      semanticAuditResolutions: makeNsaResolutions(input.needsSemanticAudit),
      issues: [{
        id: 'ISS-C1',
        dimension: 'HL-6',
        severity: 'MAJOR',
        impactScope: 'draft_only',
        blocking: true,
        mustCloseInReReview: true,
        quote: candidateQuote,
        evidence: '排风口高度需核验',
        reverseDefense: '初审偏高召回上报，交 Stage 2 独立复核。',
        narrativeGuidance: '核实高度或补写借物动作。',
      }],
      planningConflictAdvisories: [],
      preserveStrengths: [{quote: strengthQuote, reason: '动作凝练，气氛克制'}],
      revisionProtection: {strengthsPreserved: true, defensivePatchDetected: false},
    }),
    runStage2Triage: input => ({
      schemaVersion: R3_FINAL_REPORT_SCHEMA,
      protocolMode: 'single_plus_triage_C',
      reviewFingerprint: input.reviewFingerprint,
      manuscriptHashes: input.manuscriptHashes,
      reviewer: {runId: 'rev-c2', contextId: 'ctx-c2', role: 'chapter_review_arbiter'},
      decision: 'pass_candidate',
      dimensionAuditSlots: input.dimensionAuditSlots,
      semanticAuditResolutions: input.semanticAuditResolutions,
      issues: [{
        id: 'ISS-C1-DOWNGRADED',
        dimension: 'HL-6',
        severity: 'MINOR',
        blocking: false,
        mustCloseInReReview: false,
        quote: input.flaggedIssuesWithContext[0].quote,
        evidence: '当前段落仅观察排风口灌风，未发生攀爬，降为非阻断微瑕',
      }],
      planningConflictAdvisories: [],
      preserveStrengths: input.preserveStrengths,
      revisionProtection: {strengthsPreserved: true, defensivePatchDetected: false},
    }),
  };

  const cmp = await runAllThreeSchemesComparison(root, 2, {adapterA, adapterB, adapterC}, {compileWriterCard: true});
  assert.equal(cmp.ok, true, `All three schemes must pass P0-4 Fail-Closed validation: ${JSON.stringify(cmp)}`);
  assert.equal(cmp.results.A.reviewFingerprint, cmp.reviewFingerprint);
  assert.equal(cmp.results.B.reviewFingerprint, cmp.reviewFingerprint);
  assert.equal(cmp.results.C.reviewFingerprint, cmp.reviewFingerprint);
  assert.equal(cmp.results.A.calls.total, 1);
  assert.equal(cmp.results.B.calls.total, 2);
  assert.equal(cmp.results.C.calls.total, 2);
  assert.equal(cmp.results.A.routing.route, 'WRITER_REVISION_BATCH');
  assert.equal(cmp.results.A.routing.revisionCard.purity.pure, true);
  assert.equal(cmp.results.B.routing.route, 'WRITER_REVISION_BATCH');
  assert.equal(cmp.results.C.routing.route, 'PASS_CANDIDATE');

  // Confirm any scheme's FinalCalibrationReport can be committed through P0-4 applyR3Review cleanly
  const outRel = 'scheme-c-final.json';
  fs.writeFileSync(path.join(root, outRel), JSON.stringify(cmp.results.C.finalReport, null, 2) + '\n', 'utf8');
  const applied = applyR3Review(root, 2, outRel);
  assert.equal(applied.ok, true, `Scheme C report should apply cleanly via P0-4 kernel: ${JSON.stringify(applied)}`);
  assert.equal(applied.status, 'passed');
});

// ============================================================================
// TC-P0-5-2: 方案 B Pass 2 严格上下文隔离（不灌入全章，仅 ±300 字窗口）+ Pass 1 缺取证槽 Fail-Closed 拒收
// ============================================================================
test('TC-P0-5-2: Scheme B Pass 2 isolates context to +-300 chars (never full chapter) and Pass 1 missing slot fails closed before Pass 2', async t => {
  const {root, candidateQuote, strengthQuote, distantHeadMarker, distantTailMarker} = makeSandboxProject(t, {longChapter: true});
  const basePack = compileSharedReviewBasePack(root, 2);
  assert.equal(basePack.ok, true);
  assert.ok(basePack.manuscriptText.length > 2500, 'Long chapter fixture should exceed 2500 chars to prove non-full-chapter slicing');

  let capturedPass2Input = null;
  let pass2Calls = 0;

  // 1. Positive isolation check: Pass 2 receives ONLY candidates + +-300-char excerpt + core planning slice (NO full chapter!)
  const resOk = await runSchemeB(root, 2, {
    runPass1Discovery: input => ({
      schemaVersion: R3_DISCOVERY_REPORT_SCHEMA,
      protocolMode: 'two_stage_B',
      reviewFingerprint: input.reviewFingerprint,
      reviewer: {runId: 'b1', contextId: 'b1-ctx', role: 'chapter_discovery_auditor'},
      dimensionAuditSlots: makeFullSlots('HL-6'),
      semanticAuditResolutions: makeNsaResolutions(input.needsSemanticAudit),
      candidates: [{
        candidateId: 'CAND-ISO',
        dimension: 'HL-6',
        quote: candidateQuote,
        objectiveContradiction: '检查三米排风口空间细节',
        suspectedImpactScope: 'draft_only',
      }],
      preserveStrengths: [{quote: strengthQuote, reason: '动作克制'}],
    }),
    runPass2Calibration: input => {
      pass2Calls++;
      capturedPass2Input = input;
      return {
        schemaVersion: R3_FINAL_REPORT_SCHEMA,
        protocolMode: 'two_stage_B',
        reviewFingerprint: input.reviewFingerprint,
        manuscriptHashes: input.manuscriptHashes,
        reviewer: {runId: 'b2', contextId: 'b2-ctx', role: 'chapter_review_arbiter'},
        decision: 'pass_candidate',
        dimensionAuditSlots: input.dimensionAuditSlots,
        semanticAuditResolutions: input.semanticAuditResolutions,
        issues: [],
        planningConflictAdvisories: [],
        preserveStrengths: input.preserveStrengths,
        revisionProtection: {strengthsPreserved: true, defensivePatchDetected: false},
      };
    },
  }, {basePack});

  assert.equal(resOk.ok, true);
  assert.equal(pass2Calls, 1);
  assert.equal(capturedPass2Input.fullManuscriptInjected, false);
  assert.equal(Object.hasOwn(capturedPass2Input, 'manuscriptText'), false, 'Pass 2 MUST NOT have manuscriptText field');
  const serializedPass2 = JSON.stringify(capturedPass2Input);
  assert.equal(serializedPass2.includes(distantHeadMarker), false, 'Distant head paragraph MUST NOT leak into Pass 2 input');
  assert.equal(serializedPass2.includes(distantTailMarker), false, 'Distant tail paragraph MUST NOT leak into Pass 2 input');
  const excerpt = capturedPass2Input.candidatesWithContext[0].contextWindow.excerpt;
  assert.ok(excerpt.includes(candidateQuote), 'Pass 2 excerpt must contain exact candidate quote');
  assert.ok(excerpt.length <= candidateQuote.length + 600, `Excerpt length (${excerpt.length}) must stay within quote + +-300 chars`);
  assert.equal(capturedPass2Input.candidatesWithContext[0].contextWindow.truncatedBefore, true);
  assert.equal(capturedPass2Input.candidatesWithContext[0].contextWindow.truncatedAfter, true);

  // 2. Fail-Closed check: Pass 1 missing HL-6 dimensionAuditSlot -> rejected BEFORE Pass 2 is ever invoked!
  let pass2CalledOnBadPass1 = 0;
  const resBadPass1 = await runSchemeB(root, 2, {
    runPass1Discovery: input => ({
      schemaVersion: R3_DISCOVERY_REPORT_SCHEMA,
      protocolMode: 'two_stage_B',
      reviewFingerprint: input.reviewFingerprint,
      reviewer: {runId: 'b1-bad', contextId: 'b1-bad-ctx', role: 'chapter_discovery_auditor'},
      dimensionAuditSlots: makeFullSlots().filter(s => s.dimension !== 'HL-6'),
      semanticAuditResolutions: makeNsaResolutions(input.needsSemanticAudit),
      candidates: [],
    }),
    runPass2Calibration: () => {
      pass2CalledOnBadPass1++;
      throw new Error('Pass 2 must never be invoked when Pass 1 fails Fail-Closed validation');
    },
  }, {basePack});

  assert.equal(resBadPass1.ok, false);
  assert.equal(resBadPass1.exitCode, 2);
  assert.equal(pass2CalledOnBadPass1, 0, 'Pass 2 call count MUST be 0 when Pass 1 fails');
  assert.equal(resBadPass1.calls.pass2, 0);
  assert.ok(resBadPass1.errors.some(e => e.code === 'R3_DIMENSION_AUDIT_SLOTS_INCOMPLETE'));
});

// ============================================================================
// TC-P0-5-3: 方案 C 短路机制（清白 pass_candidate 且 NSA 全 pass -> Stage 2=0；否则强制触发 Stage 2）
// ============================================================================
test('TC-P0-5-3: Scheme C short-circuits Stage 2 on clean pass_candidate with all NSA=pass, and triggers Stage 2 on blocking/advisory/non-pass NSA', async t => {
  const {root, candidateQuote, strengthQuote} = makeSandboxProject(t);
  const basePack = compileSharedReviewBasePack(root, 2);
  assert.equal(basePack.ok, true);
  assert.ok(basePack.needsSemanticAudit.length >= 1, 'Fixture should include NSA clues');

  // Case 1: Clean pass_candidate + all NSA === 'pass' + 0 advisories -> Stage 2 short-circuited (calls === 0)
  let stage2Calls1 = 0;
  const resShortCircuit = await runSchemeC(root, 2, {
    runStage1HighRecall: input => ({
      schemaVersion: R3_FINAL_REPORT_SCHEMA,
      protocolMode: 'single_plus_triage_C',
      reviewFingerprint: input.reviewFingerprint,
      manuscriptHashes: input.manuscriptHashes,
      reviewer: {runId: 'c1', contextId: 'c1-ctx', role: 'chapter_review_arbiter'},
      decision: 'pass_candidate',
      dimensionAuditSlots: makeFullSlots(),
      semanticAuditResolutions: makeNsaResolutions(input.needsSemanticAudit),
      issues: [{
        id: 'ISS-SUG-ONLY',
        dimension: 'HL-4',
        severity: 'SUGGESTION',
        blocking: false,
        mustCloseInReReview: false,
        quote: strengthQuote,
        evidence: '可选润色建议，非阻断',
      }],
      planningConflictAdvisories: [],
      preserveStrengths: [{quote: strengthQuote, reason: '动作克制'}],
    }),
    runStage2Triage: () => {
      stage2Calls1++;
      throw new Error('Stage 2 MUST be short-circuited on clean pass');
    },
  }, {basePack});

  assert.equal(resShortCircuit.ok, true);
  assert.equal(resShortCircuit.shortCircuited, true);
  assert.equal(stage2Calls1, 0, 'Stage 2 call count MUST strictly be 0 on clean pass');
  assert.equal(resShortCircuit.calls.stage2, 0);
  assert.equal(resShortCircuit.stage2Input, null);

  // Case 2: Stage 1 has non-pass NSA ('insufficient_material') even with pass_candidate -> MUST trigger Stage 2
  let stage2Calls2 = 0;
  const resNonPassNsa = await runSchemeC(root, 2, {
    runStage1HighRecall: input => ({
      schemaVersion: R3_FINAL_REPORT_SCHEMA,
      protocolMode: 'single_plus_triage_C',
      reviewFingerprint: input.reviewFingerprint,
      manuscriptHashes: input.manuscriptHashes,
      reviewer: {runId: 'c1-nsa', contextId: 'c1-nsa-ctx', role: 'chapter_review_arbiter'},
      decision: 'pass_candidate',
      dimensionAuditSlots: makeFullSlots(),
      semanticAuditResolutions: makeNsaResolutions(input.needsSemanticAudit, 'insufficient_material'),
      issues: [],
      planningConflictAdvisories: [],
      preserveStrengths: [{quote: strengthQuote, reason: '动作克制'}],
    }),
    runStage2Triage: input => {
      stage2Calls2++;
      assert.equal(input.fullManuscriptInjected, false);
      assert.ok(input.nonPassNsaWithContext.length >= 1);
      return {
        schemaVersion: R3_FINAL_REPORT_SCHEMA,
        protocolMode: 'single_plus_triage_C',
        reviewFingerprint: input.reviewFingerprint,
        manuscriptHashes: input.manuscriptHashes,
        reviewer: {runId: 'c2-nsa', contextId: 'c2-nsa-ctx', role: 'chapter_review_arbiter'},
        decision: 'pass_candidate',
        dimensionAuditSlots: input.dimensionAuditSlots,
        semanticAuditResolutions: makeNsaResolutions(basePack.needsSemanticAudit),
        issues: [],
        planningConflictAdvisories: [],
        preserveStrengths: input.preserveStrengths,
      };
    },
  }, {basePack});

  assert.equal(resNonPassNsa.ok, true);
  assert.equal(resNonPassNsa.shortCircuited, false);
  assert.equal(stage2Calls2, 1, 'Stage 2 MUST trigger on non-pass NSA');
  assert.equal(resNonPassNsa.calls.stage2, 1);

  // Case 3: Stage 1 has planningConflictAdvisories -> MUST trigger Stage 2
  let stage2Calls3 = 0;
  const resAdvisory = await runSchemeC(root, 2, {
    runStage1HighRecall: input => ({
      schemaVersion: R3_FINAL_REPORT_SCHEMA,
      protocolMode: 'single_plus_triage_C',
      reviewFingerprint: input.reviewFingerprint,
      manuscriptHashes: input.manuscriptHashes,
      reviewer: {runId: 'c1-adv', contextId: 'c1-adv-ctx', role: 'chapter_review_arbiter'},
      decision: 'pass_candidate',
      dimensionAuditSlots: makeFullSlots(),
      semanticAuditResolutions: makeNsaResolutions(input.needsSemanticAudit),
      issues: [],
      planningConflictAdvisories: [{id: 'ADV-1', note: '大纲批准的夸张桥段，请 Stage 2 确认非死锁'}],
      preserveStrengths: [{quote: strengthQuote, reason: '动作克制'}],
    }),
    runStage2Triage: input => {
      stage2Calls3++;
      assert.equal(input.planningConflictAdvisories.length, 1);
      return {
        schemaVersion: R3_FINAL_REPORT_SCHEMA,
        protocolMode: 'single_plus_triage_C',
        reviewFingerprint: input.reviewFingerprint,
        manuscriptHashes: input.manuscriptHashes,
        reviewer: {runId: 'c2-adv', contextId: 'c2-adv-ctx', role: 'chapter_review_arbiter'},
        decision: 'pass_candidate',
        dimensionAuditSlots: input.dimensionAuditSlots,
        semanticAuditResolutions: input.semanticAuditResolutions,
        issues: [],
        planningConflictAdvisories: input.planningConflictAdvisories,
        preserveStrengths: input.preserveStrengths,
      };
    },
  }, {basePack});

  assert.equal(resAdvisory.ok, true);
  assert.equal(resAdvisory.shortCircuited, false);
  assert.equal(stage2Calls3, 1);

  // Case 4: Stage 1 has BLOCKER/MAJOR -> MUST trigger Stage 2
  let stage2Calls4 = 0;
  const resBlocking = await runSchemeC(root, 2, {
    runStage1HighRecall: input => ({
      schemaVersion: R3_FINAL_REPORT_SCHEMA,
      protocolMode: 'single_plus_triage_C',
      reviewFingerprint: input.reviewFingerprint,
      manuscriptHashes: input.manuscriptHashes,
      reviewer: {runId: 'c1-blk', contextId: 'c1-blk-ctx', role: 'chapter_review_arbiter'},
      decision: 'revise',
      dimensionAuditSlots: makeFullSlots('HL-6'),
      semanticAuditResolutions: makeNsaResolutions(input.needsSemanticAudit),
      issues: [{
        id: 'ISS-C-BLK',
        dimension: 'HL-6',
        severity: 'BLOCKER',
        impactScope: 'draft_only',
        blocking: true,
        mustCloseInReReview: true,
        quote: candidateQuote,
        evidence: '高召回初报空间硬伤',
        reverseDefense: '交 Stage 2 复核确认',
      }],
      planningConflictAdvisories: [],
      preserveStrengths: [{quote: strengthQuote, reason: '动作克制'}],
    }),
    runStage2Triage: input => {
      stage2Calls4++;
      assert.equal(input.flaggedIssuesWithContext.length, 1);
      return {
        schemaVersion: R3_FINAL_REPORT_SCHEMA,
        protocolMode: 'single_plus_triage_C',
        reviewFingerprint: input.reviewFingerprint,
        manuscriptHashes: input.manuscriptHashes,
        reviewer: {runId: 'c2-blk', contextId: 'c2-blk-ctx', role: 'chapter_review_arbiter'},
        decision: 'revise',
        dimensionAuditSlots: input.dimensionAuditSlots,
        semanticAuditResolutions: input.semanticAuditResolutions,
        issues: [{
          id: 'ISS-C-BLK',
          dimension: 'HL-6',
          severity: 'BLOCKER',
          impactScope: 'draft_only',
          blocking: true,
          mustCloseInReReview: true,
          quote: candidateQuote,
          evidence: 'Stage 2 复核确认为真实空间矛盾',
          reverseDefense: '核查窗口确认无垫脚道具',
        }],
        planningConflictAdvisories: [],
        preserveStrengths: input.preserveStrengths,
      };
    },
  }, {basePack});

  assert.equal(resBlocking.ok, true);
  assert.equal(resBlocking.shortCircuited, false);
  assert.equal(stage2Calls4, 1);
});

// ============================================================================
// TC-P0-5-4: impactScope 硬拦截（exit code 2）与 OR6 PLANNING_CONFLICT_BLOCK 分流 + 合法桥段非阻断
// ============================================================================
test('TC-P0-5-4: upstream_planning and finalized_canon are hard-rejected from writer revision batch (exit code 2) and routed to PLANNING_CONFLICT_BLOCK; legal advisories never block', t => {
  const {root, candidateQuote, strengthQuote} = makeSandboxProject(t);

  // 1. CLI & API hard-reject mixing upstream_planning into writer revision batch -> exit code 2
  const upstreamReport = {
    decision: 'PLANNING_CONFLICT_BLOCK',
    issues: [{
      id: 'ISS-UP-1',
      dimension: 'HL-2',
      severity: 'BLOCKER',
      impactScope: 'upstream_planning',
      blocking: true,
      mustCloseInReReview: true,
      quote: candidateQuote,
      evidence: '大纲设定三千引配额与总库存数学死锁',
      reverseDefense: '正文完全遵守大纲数字，冲突源于冻结大纲本身。',
    }],
    planningConflictAdvisories: [],
    preserveStrengths: [{quote: strengthQuote, reason: '叙事克制'}],
  };
  const upPath = path.join(root, 'upstream.json');
  fs.writeFileSync(upPath, JSON.stringify(upstreamReport, null, 2), 'utf8');

  const cliBatchUp = spawnSync(process.execPath, [ROUTER_CLI, 'check-writer-batch', '--report', upPath], {encoding: 'utf8'});
  assert.equal(cliBatchUp.status, 2, 'Mixing upstream_planning into writer batch MUST exit code 2');
  assert.equal(JSON.parse(cliBatchUp.stdout).error, 'R3_IMPACT_SCOPE_WRITER_BATCH_FORBIDDEN');

  const routeUp = routeFinalReviewReport(upstreamReport);
  assert.equal(routeUp.ok, true);
  assert.equal(routeUp.route, 'PLANNING_CONFLICT_BLOCK');
  assert.equal(routeUp.subRoute, 'upstream_planning_deadlock');
  assert.equal(routeUp.allowWriterRevisionBatch, false);

  // 2. CLI & API hard-reject mixing finalized_canon into writer revision batch -> exit code 2 + retcon_required
  const canonReport = {
    decision: 'PLANNING_CONFLICT_BLOCK',
    issues: [{
      id: 'ISS-CANON-1',
      dimension: 'HL-2',
      severity: 'MAJOR',
      impactScope: 'finalized_canon',
      blocking: true,
      mustCloseInReReview: true,
      quote: candidateQuote,
      evidence: '本章暴露第一章已定稿银钱余额既成错误',
      reverseDefense: '禁止静默改写已定稿第一章，须走显式 retcon。',
    }],
    planningConflictAdvisories: [],
    preserveStrengths: [{quote: strengthQuote, reason: '叙事克制'}],
  };
  const canonPath = path.join(root, 'canon.json');
  fs.writeFileSync(canonPath, JSON.stringify(canonReport, null, 2), 'utf8');

  const cliBatchCanon = spawnSync(process.execPath, [ROUTER_CLI, 'check-writer-batch', '--report', canonPath], {encoding: 'utf8'});
  assert.equal(cliBatchCanon.status, 2, 'Mixing finalized_canon into writer batch MUST exit code 2');
  assert.equal(JSON.parse(cliBatchCanon.stdout).error, 'R3_IMPACT_SCOPE_WRITER_BATCH_FORBIDDEN');

  const routeCanon = routeFinalReviewReport(canonReport);
  assert.equal(routeCanon.ok, true);
  assert.equal(routeCanon.route, 'PLANNING_CONFLICT_BLOCK');
  assert.equal(routeCanon.subRoute, 'retcon_required');
  assert.equal(routeCanon.allowWriterRevisionBatch, false);
  assert.equal(routeCanon.allowSilentCanonOverwrite, false);

  // 3. Attempting to disguise upstream_planning as 'revise' -> router fails closed (exit code 2)
  const disguisedPath = path.join(root, 'disguised.json');
  fs.writeFileSync(disguisedPath, JSON.stringify({...upstreamReport, decision: 'revise'}, null, 2), 'utf8');
  const cliDisguised = spawnSync(process.execPath, [ROUTER_CLI, 'route-report', '--report', disguisedPath], {encoding: 'utf8'});
  assert.equal(cliDisguised.status, 2);
  assert.equal(JSON.parse(cliDisguised.stdout).error, 'R3_OR6_DECISION_MISMATCH');

  // 4. Outline-approved legal tropes in planningConflictAdvisories -> PASS_CANDIDATE & blocking=false (0% false blocking)
  const legalTropeReport = {
    decision: 'pass_candidate',
    issues: [],
    planningConflictAdvisories: [
      {id: 'ADV-OR6', note: '大纲显式批准的跨夜急行桥段，属合法创作设定，不阻断。'},
    ],
    preserveStrengths: [{quote: strengthQuote, reason: '叙事克制'}],
  };
  const routeAdvisory = routeFinalReviewReport(legalTropeReport);
  assert.equal(routeAdvisory.ok, true);
  assert.equal(routeAdvisory.route, 'PASS_CANDIDATE');
  assert.equal(routeAdvisory.blocking, false);
  assert.equal(routeAdvisory.advisories.length, 1);

  // 5. Pure draft_only rework passes assertWriterRevisionBatchSafe cleanly
  const draftOnlyBatch = assertWriterRevisionBatchSafe([{
    id: 'ISS-DRAFT-1',
    severity: 'MAJOR',
    impactScope: 'draft_only',
  }]);
  assert.equal(draftOnlyBatch.ok, true);
  assert.equal(draftOnlyBatch.exitCode, 0);
});

// ============================================================================
// TC-P0-5-5: 生产隔离校验（SKILL.md 及全部非 prototypes/ 下的 references/ 文件与 b5572a94 零字节差异）
// ============================================================================
test('TC-P0-5-5: production SKILL.md and all non-prototype references/ have 0-byte diff vs b5572a94, and all prototype templates exist', () => {
  // Verify baseline commit b5572a94 is reachable
  const verifyBase = spawnSync('git', ['rev-parse', '--verify', 'b5572a94'], {cwd: REPO_ROOT, encoding: 'utf8'});
  assert.equal(verifyBase.status, 0, 'Baseline commit b5572a94 must exist in git history');

  // Compare working tree (committed + uncommitted) against b5572a94 for SKILL.md and all references/ EXCEPT references/v3/prototypes/
  const diffRes = spawnSync(
    'git',
    ['diff', '--name-only', 'b5572a94', '--', 'SKILL.md', 'references/', ':(exclude)references/v3/prototypes'],
    {cwd: REPO_ROOT, encoding: 'utf8'}
  );
  assert.equal(diffRes.status, 0, diffRes.stderr);
  assert.equal(
    diffRes.stdout.trim(),
    '',
    `Production SKILL.md and non-prototype references/ MUST have 0-byte diff vs b5572a94, got:\n${diffRes.stdout}`
  );

  // Verify no untracked files were placed inside references/ outside references/v3/prototypes/
  const untrackedRes = spawnSync(
    'git',
    ['ls-files', '--others', '--exclude-standard', '--', 'SKILL.md', 'references/', ':(exclude)references/v3/prototypes'],
    {cwd: REPO_ROOT, encoding: 'utf8'}
  );
  assert.equal(untrackedRes.status, 0, untrackedRes.stderr);
  assert.equal(
    untrackedRes.stdout.trim(),
    '',
    `No untracked files allowed in production references/ outside prototypes/, got:\n${untrackedRes.stdout}`
  );

  // Verify all 5 isolated prototype templates + README exist and carry required protocol markers
  assert.equal(fs.existsSync(path.join(REPO_ROOT, 'references/v3/prototypes/README.md')), true);
  for (const key of Object.keys(PROTOTYPE_TEMPLATE_FILES)) {
    const tpl = loadPrototypeTemplate(key);
    assert.ok(tpl.relativePath.startsWith('references/v3/prototypes/'));
    assert.ok(tpl.content.includes('非生产主模板'), `${tpl.relativePath} must explicitly declare non-production sandbox status`);
  }
  assert.ok(loadPrototypeTemplate('B_PASS1').content.includes('Pass1DiscoveryReport'));
  assert.ok(loadPrototypeTemplate('B_PASS2').content.includes('±300'));
  assert.ok(loadPrototypeTemplate('C_STAGE2').content.includes('短路'));
});
