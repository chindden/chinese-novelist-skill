#!/usr/bin/env node
/**
 * P0-5 Comprehensive Prototype Test Suite (`TC-P0-5-1` ~ `TC-P0-5-5`, `TC-P0-5-B1` ~ `TC-P0-5-B6`):
 *   TC-P0-5-1: A/B/C 三方案统一共享 precheck v2 + reviewFingerprint 底座并产出通过 P0-4 Fail-Closed 校验的 FinalCalibrationReport
 *   TC-P0-5-2: 方案 B Pass 2 严格上下文隔离（仅候选 + ±300 字原文窗口 + 核心规划，不注入全章全文）与 Pass 1 缺取证槽 Fail-Closed 拒收
 *   TC-P0-5-3: 方案 C 短路机制（Stage 1 清白 pass_candidate 且全部 NSA=pass -> Stage 2 调用=0；含 BLOCKER/MAJOR、advisories 或非 pass NSA -> 强制触发 Stage 2）
 *   TC-P0-5-4: impactScope 硬拦截（upstream_planning / finalized_canon 混入写手改稿批 -> exit code 2）与 OR6 PLANNING_CONFLICT_BLOCK 路由 + 合法桥段非阻断
 *   TC-P0-5-5: 生产隔离校验（SKILL.md 及全部非 prototypes/ 下的 references/ 文件与 b5572a94 零字节差异 + 原型模板完备性校验）
 *   TC-P0-5-B1: 两阶段复核独立性硬门禁（Scheme B Pass 1/Pass 2 与 Scheme C Stage 1/Stage 2 复用 runId/contextId 均 Fail-Closed 拒收）
 *   TC-P0-5-B2: OR6 降级洗白封堵（MINOR/SUGGESTION × upstream_planning/finalized_canon 在 P0-4 内核与 P0-5 路由器双重 Fail-Closed 拒收，合法提示 0 误杀）
 *   TC-P0-5-B3: 窗口半径硬锁 ±300 字与重复引文按 paragraphIndex 精确定位（超界半径、无段号重复引文、错段号均 Fail-Closed）
 *   TC-P0-5-B4: 方案 B Pass 1 -> Pass 2 原始取证槽与 NSA 核销不可篡改校验
 *   TC-P0-5-B5: 方案 C Stage 1 -> Stage 2 非阻断条目（MINOR/SUGGESTION）强制保留或显式可审计处置
 *   TC-P0-5-B6: 多卷项目端到端规划切片一致性测试（无显式 volume + 专用 outlinePath + 完整 arc/beats/goal/conflict/hook + 多卷均有内容，P0-4 与 P0-5 A/B/C 实际输入零字段丢失）
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
  buildPlanningSlice,
  validateR3ReviewReport,
} from '../r3_review_kernel.mjs';
import {readPlan} from '../v3_common.mjs';
import {
  CONTEXT_WINDOW_RADIUS_CHARS,
  PROTOTYPE_TEMPLATE_FILES,
  loadPrototypeTemplate,
  locateBodyParagraphSpans,
  buildLocalContextExcerpt,
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
  assert.ok(loadPrototypeTemplate('C_STAGE2').content.includes('nonBlockingIssuesCarried'));
  assert.ok(loadPrototypeTemplate('C_STAGE2').content.includes('carriedIssueDispositions'));
});

// ============================================================================
// TC-P0-5-B1: 两阶段复核独立性硬门禁（Scheme B Pass 1/Pass 2 与 Scheme C Stage 1/Stage 2）
// ============================================================================
test('TC-P0-5-B1: Scheme B and Scheme C enforce strict two-stage reviewer independence (distinct runId AND contextId)', async t => {
  const {root, candidateQuote, strengthQuote} = makeSandboxProject(t);
  const basePack = compileSharedReviewBasePack(root, 2);
  assert.equal(basePack.ok, true);

  const runBWithIds = async (r1, r2) => runSchemeB(root, 2, {
    runPass1Discovery: input => ({
      schemaVersion: R3_DISCOVERY_REPORT_SCHEMA,
      protocolMode: 'two_stage_B',
      reviewFingerprint: input.reviewFingerprint,
      reviewer: {...r1, role: 'chapter_discovery_auditor'},
      dimensionAuditSlots: makeFullSlots('HL-6'),
      semanticAuditResolutions: makeNsaResolutions(input.needsSemanticAudit),
      candidates: [{
        candidateId: 'CAND-B1-IND',
        dimension: 'HL-6',
        quote: candidateQuote,
        objectiveContradiction: '检查三米排风口细节',
        suspectedImpactScope: 'draft_only',
      }],
      preserveStrengths: [{quote: strengthQuote, reason: '动作克制'}],
    }),
    runPass2Calibration: input => ({
      schemaVersion: R3_FINAL_REPORT_SCHEMA,
      protocolMode: 'two_stage_B',
      reviewFingerprint: input.reviewFingerprint,
      manuscriptHashes: input.manuscriptHashes,
      reviewer: {...r2, role: 'chapter_review_arbiter'},
      decision: 'pass_candidate',
      dimensionAuditSlots: input.dimensionAuditSlots,
      semanticAuditResolutions: input.semanticAuditResolutions,
      issues: [],
      planningConflictAdvisories: [],
      preserveStrengths: input.preserveStrengths,
    }),
  }, {basePack});

  // Scheme B: same runId (even with different contextId) -> Fail-Closed
  const bSameRun = await runBWithIds({runId: 'shared-run', contextId: 'ctx-1'}, {runId: 'shared-run', contextId: 'ctx-2'});
  assert.equal(bSameRun.ok, false);
  assert.equal(bSameRun.exitCode, 2);
  assert.ok(bSameRun.errors.some(e => e.code === 'R3_STAGE2_CONTEXT_NOT_INDEPENDENT'));

  // Scheme B: same contextId (even with different runId) -> Fail-Closed
  const bSameCtx = await runBWithIds({runId: 'run-1', contextId: 'shared-ctx'}, {runId: 'run-2', contextId: 'shared-ctx'});
  assert.equal(bSameCtx.ok, false);
  assert.equal(bSameCtx.exitCode, 2);
  assert.ok(bSameCtx.errors.some(e => e.code === 'R3_STAGE2_CONTEXT_NOT_INDEPENDENT'));

  // Scheme B: distinct runId AND distinct contextId -> PASS
  const bDistinct = await runBWithIds({runId: 'run-1', contextId: 'ctx-1'}, {runId: 'run-2', contextId: 'ctx-2'});
  assert.equal(bDistinct.ok, true);

  const runCWithIds = async (r1, r2) => runSchemeC(root, 2, {
    runStage1HighRecall: input => ({
      schemaVersion: R3_FINAL_REPORT_SCHEMA,
      protocolMode: 'single_plus_triage_C',
      reviewFingerprint: input.reviewFingerprint,
      manuscriptHashes: input.manuscriptHashes,
      reviewer: {...r1, role: 'chapter_review_arbiter'},
      decision: 'revise',
      dimensionAuditSlots: makeFullSlots('HL-6'),
      semanticAuditResolutions: makeNsaResolutions(input.needsSemanticAudit),
      issues: [{
        id: 'ISS-C-IND',
        dimension: 'HL-6',
        severity: 'MAJOR',
        impactScope: 'draft_only',
        blocking: true,
        mustCloseInReReview: true,
        quote: candidateQuote,
        evidence: '初审待复核',
        reverseDefense: '交 Stage 2 独立复核',
      }],
      planningConflictAdvisories: [],
      preserveStrengths: [{quote: strengthQuote, reason: '动作克制'}],
    }),
    runStage2Triage: input => ({
      schemaVersion: R3_FINAL_REPORT_SCHEMA,
      protocolMode: 'single_plus_triage_C',
      reviewFingerprint: input.reviewFingerprint,
      manuscriptHashes: input.manuscriptHashes,
      reviewer: {...r2, role: 'chapter_review_arbiter'},
      decision: 'pass_candidate',
      dimensionAuditSlots: input.dimensionAuditSlots,
      semanticAuditResolutions: input.semanticAuditResolutions,
      issues: [],
      planningConflictAdvisories: [],
      preserveStrengths: input.preserveStrengths,
    }),
  }, {basePack});

  // Scheme C: same runId -> Fail-Closed
  const cSameRun = await runCWithIds({runId: 'c-shared', contextId: 'c-ctx-1'}, {runId: 'c-shared', contextId: 'c-ctx-2'});
  assert.equal(cSameRun.ok, false);
  assert.equal(cSameRun.exitCode, 2);
  assert.ok(cSameRun.errors.some(e => e.code === 'R3_STAGE2_CONTEXT_NOT_INDEPENDENT'));

  // Scheme C: same contextId -> Fail-Closed
  const cSameCtx = await runCWithIds({runId: 'c-run-1', contextId: 'c-shared-ctx'}, {runId: 'c-run-2', contextId: 'c-shared-ctx'});
  assert.equal(cSameCtx.ok, false);
  assert.equal(cSameCtx.exitCode, 2);
  assert.ok(cSameCtx.errors.some(e => e.code === 'R3_STAGE2_CONTEXT_NOT_INDEPENDENT'));

  // Scheme C: distinct runId AND distinct contextId -> PASS
  const cDistinct = await runCWithIds({runId: 'c-run-1', contextId: 'c-ctx-1'}, {runId: 'c-run-2', contextId: 'c-ctx-2'});
  assert.equal(cDistinct.ok, true);
});

// ============================================================================
// TC-P0-5-B2: OR6 降级洗白封堵（MINOR/SUGGESTION 不得携带 upstream_planning / finalized_canon）
// ============================================================================
test('TC-P0-5-B2: MINOR/SUGGESTION with upstream_planning or finalized_canon are Fail-Closed in both P0-4 kernel and P0-5 router; legal non-blocking notes remain unaffected', async t => {
  const {root, candidateQuote, strengthQuote} = makeSandboxProject(t);
  const basePack = compileSharedReviewBasePack(root, 2);
  assert.equal(basePack.ok, true);

  const forbiddenCombos = [
    ['MINOR', 'upstream_planning'],
    ['MINOR', 'finalized_canon'],
    ['SUGGESTION', 'upstream_planning'],
    ['SUGGESTION', 'finalized_canon'],
  ];

  for (const [severity, impactScope] of forbiddenCombos) {
    const report = {
      schemaVersion: R3_FINAL_REPORT_SCHEMA,
      protocolMode: 'single_stage_A',
      reviewFingerprint: basePack.reviewFingerprint,
      manuscriptHashes: basePack.manuscriptHashes,
      reviewer: {runId: `rev-b2-${severity}-${impactScope}`, contextId: `ctx-b2-${severity}-${impactScope}`, role: 'chapter_review_arbiter'},
      decision: 'pass_candidate',
      dimensionAuditSlots: makeFullSlots('HL-2'),
      semanticAuditResolutions: makeNsaResolutions(basePack.needsSemanticAudit),
      issues: [{
        id: `ISS-B2-${severity}-${impactScope}`,
        dimension: 'HL-2',
        severity,
        impactScope,
        blocking: false,
        mustCloseInReReview: false,
        quote: candidateQuote,
        evidence: '企图降级为非阻断绕过 OR6',
      }],
      planningConflictAdvisories: [],
      preserveStrengths: [{quote: strengthQuote, reason: '动作克制'}],
    };

    // 1. P0-4 kernel validateR3ReviewReport MUST reject
    const kernelRes = validateR3ReviewReport(root, 2, report, {allowDiscovery: false});
    assert.equal(kernelRes.ok, false, `P0-4 kernel must reject ${severity} + ${impactScope}`);
    assert.equal(kernelRes.exitCode, 2);
    assert.ok(
      kernelRes.errors.some(e => e.code === 'R3_OR6_NON_BLOCKING_CANNOT_HOLD_CONFLICT_SCOPE'),
      `Expected R3_OR6_NON_BLOCKING_CANNOT_HOLD_CONFLICT_SCOPE for ${severity}+${impactScope}, got: ${JSON.stringify(kernelRes.errors)}`
    );

    // 2. P0-5 impact_scope_router MUST also reject (never leak PASS_CANDIDATE)
    const routeRes = routeFinalReviewReport(report);
    assert.equal(routeRes.ok, false, `P0-5 router must reject ${severity} + ${impactScope}`);
    assert.equal(routeRes.exitCode, 2);
    assert.equal(routeRes.error, 'R3_OR6_NON_BLOCKING_CANNOT_HOLD_CONFLICT_SCOPE');

    // 3. Scheme A end-to-end MUST reject
    const schemeARes = await runSchemeA(root, 2, {runSingleStage: () => report}, {basePack});
    assert.equal(schemeARes.ok, false);
    assert.equal(schemeARes.exitCode, 2);
    assert.ok(schemeARes.errors.some(e => e.code === 'R3_OR6_NON_BLOCKING_CANNOT_HOLD_CONFLICT_SCOPE'));
  }

  // Positive control: legal non-blocking planning advisories + normal MINOR/SUGGESTION (omitted or draft_only) MUST pass cleanly
  const legalReport = {
    schemaVersion: R3_FINAL_REPORT_SCHEMA,
    protocolMode: 'single_stage_A',
    reviewFingerprint: basePack.reviewFingerprint,
    manuscriptHashes: basePack.manuscriptHashes,
    reviewer: {runId: 'rev-b2-ok', contextId: 'ctx-b2-ok', role: 'chapter_review_arbiter'},
    decision: 'pass_candidate',
    dimensionAuditSlots: makeFullSlots(),
    semanticAuditResolutions: makeNsaResolutions(basePack.needsSemanticAudit),
    issues: [
      {
        id: 'ISS-MINOR-DRAFT',
        dimension: 'HL-4',
        severity: 'MINOR',
        impactScope: 'draft_only',
        blocking: false,
        mustCloseInReReview: false,
        quote: strengthQuote,
        evidence: '局部词句节奏微瑕',
      },
      {
        id: 'ISS-SUG-OMITTED',
        dimension: 'HL-4',
        severity: 'SUGGESTION',
        blocking: false,
        mustCloseInReReview: false,
        quote: candidateQuote,
        evidence: '可选描写润色建议',
      },
    ],
    planningConflictAdvisories: [{id: 'ADV-LEGAL', note: '大纲显式批准的跨夜赶路桥段，不阻断。'}],
    preserveStrengths: [{quote: strengthQuote, reason: '动作克制'}],
  };
  const legalKernel = validateR3ReviewReport(root, 2, legalReport, {allowDiscovery: false});
  assert.equal(legalKernel.ok, true, `Legal non-blocking notes must pass: ${JSON.stringify(legalKernel.errors)}`);
  const legalRoute = routeFinalReviewReport(legalReport);
  assert.equal(legalRoute.ok, true);
  assert.equal(legalRoute.route, 'PASS_CANDIDATE');
  assert.equal(legalRoute.blocking, false);
  assert.equal(legalRoute.advisories.length, 1);
});

// ============================================================================
// TC-P0-5-B3: ±300 字窗口半径硬锁 + 重复引文按 paragraphIndex 精确定位
// ============================================================================
test('TC-P0-5-B3: context window radius is locked to +-300 chars and duplicate quotes require unambiguous paragraphIndex', async t => {
  const {root, strengthQuote} = makeSandboxProject(t);

  // Rewrite ch002 with an identical sentence appearing in BOTH paragraph 2 and paragraph 6
  const repeatedQuote = '赵有福站在院角，目光掠过半掩的门缝，始终没有开口。';
  const filler = '檐下青砖被秋雨浸透，远处木梆声缓缓传来又消散在长街雾气里。'.repeat(12);
  const dupChapter = [
    '# 第二章 寒夜探库',
    `${strengthQuote}账册上分明写着九月廿三比原定廿六提前两日交割。`, // paragraph 1
    `【首处重复哨兵_PARA2_ALPHA】${repeatedQuote}`,                 // paragraph 2
    filler,                                                        // paragraph 3
    filler,                                                        // paragraph 4
    filler,                                                        // paragraph 5
    `【次处重复哨兵_PARA6_BETA】${repeatedQuote}`,                  // paragraph 6
    filler,                                                        // paragraph 7
  ].join('\n\n') + '\n';
  fs.writeFileSync(path.join(root, 'chapters/ch002.md'), dupChapter, 'utf8');

  const spans = locateBodyParagraphSpans(dupChapter);
  assert.equal(spans.length, 7);
  assert.ok(spans[1].text.includes('PARA2_ALPHA'));
  assert.ok(spans[5].text.includes('PARA6_BETA'));

  // 1. Overriding radius (301 or 600) MUST fail closed directly and via runSchemeB / runSchemeC
  assert.throws(
    () => buildLocalContextExcerpt(dupChapter, strengthQuote, {radius: 301}),
    /R3_CONTEXT_WINDOW_RADIUS_LOCKED/
  );
  assert.throws(
    () => buildLocalContextExcerpt(dupChapter, strengthQuote, {radius: 600}),
    /R3_CONTEXT_WINDOW_RADIUS_LOCKED/
  );

  // 2. Duplicate quote WITHOUT paragraphIndex MUST fail closed (never silently grab indexOf first occurrence!)
  assert.throws(
    () => buildLocalContextExcerpt(dupChapter, repeatedQuote),
    /R3_AMBIGUOUS_DUPLICATE_QUOTE/
  );

  // 3. Duplicate quote WITH mismatched paragraphIndex (paragraph 3 does not contain repeatedQuote) -> Fail-Closed
  assert.throws(
    () => buildLocalContextExcerpt(dupChapter, repeatedQuote, {paragraphIndex: 3}),
    /R3_QUOTE_PARAGRAPH_MISMATCH/
  );

  // 4. Duplicate quote WITH accurate paragraphIndex: 6 -> slices ONLY around paragraph 6 (BETA, NOT ALPHA)
  const winPara6 = buildLocalContextExcerpt(dupChapter, repeatedQuote, {paragraphIndex: 6});
  assert.equal(winPara6.paragraphIndex, 6);
  assert.ok(winPara6.excerpt.includes('PARA6_BETA'));
  assert.equal(winPara6.excerpt.includes('PARA2_ALPHA'), false);
  assert.ok(winPara6.excerpt.length <= repeatedQuote.length + 2 * CONTEXT_WINDOW_RADIUS_CHARS);

  const basePack = compileSharedReviewBasePack(root, 2);
  assert.equal(basePack.ok, true);

  // 5. Scheme B end-to-end: radius override -> Fail-Closed before Pass 2 runs
  let pass2CallsOnBadRadius = 0;
  const bBadRadius = await runSchemeB(root, 2, {
    runPass1Discovery: input => ({
      schemaVersion: R3_DISCOVERY_REPORT_SCHEMA,
      protocolMode: 'two_stage_B',
      reviewFingerprint: input.reviewFingerprint,
      reviewer: {runId: 'b1-r', contextId: 'b1-r-ctx', role: 'chapter_discovery_auditor'},
      dimensionAuditSlots: makeFullSlots('HL-6'),
      semanticAuditResolutions: makeNsaResolutions(input.needsSemanticAudit),
      candidates: [{
        candidateId: 'CAND-R',
        dimension: 'HL-6',
        paragraphIndex: 6,
        quote: repeatedQuote,
        objectiveContradiction: '检查第六段动作衔接',
        suspectedImpactScope: 'draft_only',
      }],
    }),
    runPass2Calibration: () => {
      pass2CallsOnBadRadius++;
      throw new Error('Pass 2 must not be invoked on locked radius violation');
    },
  }, {basePack, radius: 600});
  assert.equal(bBadRadius.ok, false);
  assert.equal(bBadRadius.exitCode, 2);
  assert.equal(pass2CallsOnBadRadius, 0);
  assert.equal(bBadRadius.calls.pass2, 0);
  assert.ok(bBadRadius.errors.some(e => e.code === 'R3_CONTEXT_WINDOW_RADIUS_LOCKED'));

  // 6. Scheme B end-to-end: duplicate quote WITHOUT paragraphIndex -> Fail-Closed before Pass 2 runs
  let pass2CallsOnDup = 0;
  const bDupFail = await runSchemeB(root, 2, {
    runPass1Discovery: input => ({
      schemaVersion: R3_DISCOVERY_REPORT_SCHEMA,
      protocolMode: 'two_stage_B',
      reviewFingerprint: input.reviewFingerprint,
      reviewer: {runId: 'b1-dup', contextId: 'b1-dup-ctx', role: 'chapter_discovery_auditor'},
      dimensionAuditSlots: makeFullSlots('HL-6'),
      semanticAuditResolutions: makeNsaResolutions(input.needsSemanticAudit),
      candidates: [{
        candidateId: 'CAND-DUP',
        dimension: 'HL-6',
        quote: repeatedQuote,
        objectiveContradiction: '未给段落号的重复引文',
        suspectedImpactScope: 'draft_only',
      }],
    }),
    runPass2Calibration: () => {
      pass2CallsOnDup++;
      throw new Error('Pass 2 must not be invoked on ambiguous duplicate quote');
    },
  }, {basePack});
  assert.equal(bDupFail.ok, false);
  assert.equal(bDupFail.exitCode, 2);
  assert.equal(pass2CallsOnDup, 0);
  assert.ok(bDupFail.errors.some(e => e.code === 'R3_AMBIGUOUS_DUPLICATE_QUOTE'));

  // 7. Scheme B end-to-end: duplicate quote WITH paragraphIndex: 6 -> Pass 2 receives ONLY paragraph 6 window!
  let capturedWin = null;
  const bDupOk = await runSchemeB(root, 2, {
    runPass1Discovery: input => ({
      schemaVersion: R3_DISCOVERY_REPORT_SCHEMA,
      protocolMode: 'two_stage_B',
      reviewFingerprint: input.reviewFingerprint,
      reviewer: {runId: 'b1-p6', contextId: 'b1-p6-ctx', role: 'chapter_discovery_auditor'},
      dimensionAuditSlots: makeFullSlots('HL-6'),
      semanticAuditResolutions: makeNsaResolutions(input.needsSemanticAudit),
      candidates: [{
        candidateId: 'CAND-P6',
        dimension: 'HL-6',
        paragraphIndex: 6,
        quote: repeatedQuote,
        objectiveContradiction: '第六段重复动作核验',
        suspectedImpactScope: 'draft_only',
      }],
      preserveStrengths: [{quote: strengthQuote, reason: '动作克制'}],
    }),
    runPass2Calibration: input => {
      capturedWin = input.candidatesWithContext[0].contextWindow;
      return {
        schemaVersion: R3_FINAL_REPORT_SCHEMA,
        protocolMode: 'two_stage_B',
        reviewFingerprint: input.reviewFingerprint,
        manuscriptHashes: input.manuscriptHashes,
        reviewer: {runId: 'b2-p6', contextId: 'b2-p6-ctx', role: 'chapter_review_arbiter'},
        decision: 'pass_candidate',
        dimensionAuditSlots: input.dimensionAuditSlots,
        semanticAuditResolutions: input.semanticAuditResolutions,
        issues: [],
        planningConflictAdvisories: [],
        preserveStrengths: input.preserveStrengths,
      };
    },
  }, {basePack});
  assert.equal(bDupOk.ok, true);
  assert.equal(capturedWin.paragraphIndex, 6);
  assert.ok(capturedWin.excerpt.includes('PARA6_BETA'));
  assert.equal(capturedWin.excerpt.includes('PARA2_ALPHA'), false);

  // 8. Scheme C end-to-end: radius override -> Fail-Closed before Stage 2 runs
  let stage2CallsOnBadRadius = 0;
  const cBadRadius = await runSchemeC(root, 2, {
    runStage1HighRecall: input => ({
      schemaVersion: R3_FINAL_REPORT_SCHEMA,
      protocolMode: 'single_plus_triage_C',
      reviewFingerprint: input.reviewFingerprint,
      manuscriptHashes: input.manuscriptHashes,
      reviewer: {runId: 'c1-r', contextId: 'c1-r-ctx', role: 'chapter_review_arbiter'},
      decision: 'revise',
      dimensionAuditSlots: makeFullSlots('HL-6'),
      semanticAuditResolutions: makeNsaResolutions(input.needsSemanticAudit),
      issues: [{
        id: 'ISS-C-R',
        dimension: 'HL-6',
        severity: 'MAJOR',
        impactScope: 'draft_only',
        blocking: true,
        mustCloseInReReview: true,
        paragraphIndex: 6,
        quote: repeatedQuote,
        evidence: '第六段核验',
        reverseDefense: '交 Stage 2 复核',
      }],
      planningConflictAdvisories: [],
      preserveStrengths: [{quote: strengthQuote, reason: '动作克制'}],
    }),
    runStage2Triage: () => {
      stage2CallsOnBadRadius++;
      throw new Error('Stage 2 must not be invoked on locked radius violation');
    },
  }, {basePack, radius: 600});
  assert.equal(cBadRadius.ok, false);
  assert.equal(cBadRadius.exitCode, 2);
  assert.equal(stage2CallsOnBadRadius, 0);
  assert.equal(cBadRadius.calls.stage2, 0);
  assert.ok(cBadRadius.errors.some(e => e.code === 'R3_CONTEXT_WINDOW_RADIUS_LOCKED'));
});

// ============================================================================
// TC-P0-5-B4: 方案 B Pass 1 -> Pass 2 原始取证槽与 NSA 核销不可篡改校验
// ============================================================================
test('TC-P0-5-B4: Scheme B Pass 2 cannot tamper with Pass 1 dimensionAuditSlots or semanticAuditResolutions', async t => {
  const {root, candidateQuote, strengthQuote} = makeSandboxProject(t);
  const basePack = compileSharedReviewBasePack(root, 2);
  assert.equal(basePack.ok, true);
  assert.ok(basePack.needsSemanticAudit.length >= 1);

  const runBWithPass2Mutator = async mutatePass2 => runSchemeB(root, 2, {
    runPass1Discovery: input => ({
      schemaVersion: R3_DISCOVERY_REPORT_SCHEMA,
      protocolMode: 'two_stage_B',
      reviewFingerprint: input.reviewFingerprint,
      reviewer: {runId: 'b1-b4', contextId: 'b1-b4-ctx', role: 'chapter_discovery_auditor'},
      dimensionAuditSlots: makeFullSlots('HL-6'),
      semanticAuditResolutions: makeNsaResolutions(input.needsSemanticAudit),
      candidates: [{
        candidateId: 'CAND-B4',
        dimension: 'HL-6',
        quote: candidateQuote,
        objectiveContradiction: '检查排风口细节',
        suspectedImpactScope: 'draft_only',
      }],
      preserveStrengths: [{quote: strengthQuote, reason: '动作克制'}],
    }),
    runPass2Calibration: input => {
      const report = {
        schemaVersion: R3_FINAL_REPORT_SCHEMA,
        protocolMode: 'two_stage_B',
        reviewFingerprint: input.reviewFingerprint,
        manuscriptHashes: input.manuscriptHashes,
        reviewer: {runId: 'b2-b4', contextId: 'b2-b4-ctx', role: 'chapter_review_arbiter'},
        decision: 'pass_candidate',
        dimensionAuditSlots: structuredClone(input.dimensionAuditSlots),
        semanticAuditResolutions: structuredClone(input.semanticAuditResolutions),
        issues: [],
        planningConflictAdvisories: [],
        preserveStrengths: input.preserveStrengths,
      };
      mutatePass2(report);
      return report;
    },
  }, {basePack});

  // 1. Tampering checkedAnchor -> rejected
  const resAnchor = await runBWithPass2Mutator(r => {
    r.dimensionAuditSlots[0].checkedAnchor = 'Pass 2 擅自伪造的新取证锚点';
  });
  assert.equal(resAnchor.ok, false);
  assert.equal(resAnchor.exitCode, 2);
  assert.ok(resAnchor.errors.some(e => e.code === 'R3_SCHEME_B_PASS1_SLOTS_ALTERED'));

  // 2. Tampering slot.status -> rejected
  const resSlotStatus = await runBWithPass2Mutator(r => {
    const hl6 = r.dimensionAuditSlots.find(s => s.dimension === 'HL-6');
    hl6.status = 'pass';
  });
  assert.equal(resSlotStatus.ok, false);
  assert.equal(resSlotStatus.exitCode, 2);
  assert.ok(resSlotStatus.errors.some(e => e.code === 'R3_SCHEME_B_PASS1_SLOTS_ALTERED'));

  // 3. Tampering semanticAuditResolutions[0].status -> rejected
  const resNsaStatus = await runBWithPass2Mutator(r => {
    r.semanticAuditResolutions[0].status = 'issue_raised';
  });
  assert.equal(resNsaStatus.ok, false);
  assert.equal(resNsaStatus.exitCode, 2);
  assert.ok(resNsaStatus.errors.some(e => e.code === 'R3_SCHEME_B_PASS1_NSA_ALTERED'));

  // 4. Tampering semanticAuditResolutions[0].note -> rejected
  const resNsaNote = await runBWithPass2Mutator(r => {
    r.semanticAuditResolutions[0].note = 'Pass 2 篡改原始 NSA 备注';
  });
  assert.equal(resNsaNote.ok, false);
  assert.equal(resNsaNote.exitCode, 2);
  assert.ok(resNsaNote.errors.some(e => e.code === 'R3_SCHEME_B_PASS1_NSA_ALTERED'));

  // 5. Positive control: preserving Pass 1 slots/NSA verbatim + optional calibrationAuditNotes -> PASS
  const resPreserved = await runBWithPass2Mutator(r => {
    r.calibrationAuditNotes = ['Pass 2 补充说明：CAND-B4 经 ±300 字窗口核验降级消除。'];
  });
  assert.equal(resPreserved.ok, true);
});

// ============================================================================
// TC-P0-5-B5: 方案 C Stage 1 -> Stage 2 非阻断条目（MINOR/SUGGESTION）保留或显式处置
// ============================================================================
test('TC-P0-5-B5: Scheme C Stage 2 must preserve Stage 1 MINOR/SUGGESTION verbatim or record explicit carriedIssueDispositions', async t => {
  const {root, candidateQuote, strengthQuote} = makeSandboxProject(t);
  const basePack = compileSharedReviewBasePack(root, 2);
  assert.equal(basePack.ok, true);

  const stage1Minor = {
    id: 'ISS-C-MIN-1',
    dimension: 'HL-4',
    severity: 'MINOR',
    blocking: false,
    mustCloseInReReview: false,
    quote: strengthQuote,
    evidence: '局部衔接可更紧实',
  };
  const stage1Suggestion = {
    id: 'ISS-C-SUG-1',
    dimension: 'HL-5',
    severity: 'SUGGESTION',
    blocking: false,
    mustCloseInReReview: false,
    quote: '赵有福站在院角，目光掠过半掩的门缝，始终没有开口。',
    evidence: '可补一笔眼神压迫感',
  };

  const makeStage1 = input => ({
    schemaVersion: R3_FINAL_REPORT_SCHEMA,
    protocolMode: 'single_plus_triage_C',
    reviewFingerprint: input.reviewFingerprint,
    manuscriptHashes: input.manuscriptHashes,
    reviewer: {runId: 'c1-b5', contextId: 'c1-b5-ctx', role: 'chapter_review_arbiter'},
    decision: 'revise',
    dimensionAuditSlots: makeFullSlots('HL-6'),
    semanticAuditResolutions: makeNsaResolutions(input.needsSemanticAudit),
    issues: [
      {
        id: 'ISS-C-BLK-1',
        dimension: 'HL-6',
        severity: 'BLOCKER',
        impactScope: 'draft_only',
        blocking: true,
        mustCloseInReReview: true,
        quote: candidateQuote,
        evidence: '初审怀疑排风口过高',
        reverseDefense: '交 Stage 2 独立定级',
      },
      stage1Minor,
      stage1Suggestion,
    ],
    planningConflictAdvisories: [],
    preserveStrengths: [{quote: strengthQuote, reason: '动作克制'}],
  });

  // 1. Stage 2 silently drops MINOR & SUGGESTION -> Fail-Closed
  const resDropped = await runSchemeC(root, 2, {
    runStage1HighRecall: makeStage1,
    runStage2Triage: input => {
      assert.equal(input.nonBlockingIssuesCarried.length, 2);
      return {
        schemaVersion: R3_FINAL_REPORT_SCHEMA,
        protocolMode: 'single_plus_triage_C',
        reviewFingerprint: input.reviewFingerprint,
        manuscriptHashes: input.manuscriptHashes,
        reviewer: {runId: 'c2-b5-drop', contextId: 'c2-b5-drop-ctx', role: 'chapter_review_arbiter'},
        decision: 'pass_candidate',
        dimensionAuditSlots: input.dimensionAuditSlots,
        semanticAuditResolutions: input.semanticAuditResolutions,
        issues: [],
        planningConflictAdvisories: [],
        preserveStrengths: input.preserveStrengths,
      };
    },
  }, {basePack});
  assert.equal(resDropped.ok, false);
  assert.equal(resDropped.exitCode, 2);
  assert.equal(resDropped.errors.filter(e => e.code === 'R3_SCHEME_C_DROPPED_STAGE1_NONBLOCKING').length, 2);

  // 2. Stage 2 declares disposition='kept' without keeping the issue in issues -> Fail-Closed
  const resFakeKept = await runSchemeC(root, 2, {
    runStage1HighRecall: makeStage1,
    runStage2Triage: input => ({
      schemaVersion: R3_FINAL_REPORT_SCHEMA,
      protocolMode: 'single_plus_triage_C',
      reviewFingerprint: input.reviewFingerprint,
      manuscriptHashes: input.manuscriptHashes,
      reviewer: {runId: 'c2-b5-fakekept', contextId: 'c2-b5-fakekept-ctx', role: 'chapter_review_arbiter'},
      decision: 'pass_candidate',
      dimensionAuditSlots: input.dimensionAuditSlots,
      semanticAuditResolutions: input.semanticAuditResolutions,
      issues: [stage1Minor],
      carriedIssueDispositions: [
        {id: stage1Suggestion.id, disposition: 'kept', note: '声称保留但实际漏写'},
      ],
      planningConflictAdvisories: [],
      preserveStrengths: input.preserveStrengths,
    }),
  }, {basePack});
  assert.equal(resFakeKept.ok, false);
  assert.equal(resFakeKept.exitCode, 2);
  assert.ok(resFakeKept.errors.some(e => e.code === 'R3_SCHEME_C_DROPPED_STAGE1_NONBLOCKING' && e.issueId === stage1Suggestion.id));

  // 3. Positive control A: Stage 2 retains BOTH MINOR & SUGGESTION verbatim -> PASS
  const resRetainedAll = await runSchemeC(root, 2, {
    runStage1HighRecall: makeStage1,
    runStage2Triage: input => ({
      schemaVersion: R3_FINAL_REPORT_SCHEMA,
      protocolMode: 'single_plus_triage_C',
      reviewFingerprint: input.reviewFingerprint,
      manuscriptHashes: input.manuscriptHashes,
      reviewer: {runId: 'c2-b5-all', contextId: 'c2-b5-all-ctx', role: 'chapter_review_arbiter'},
      decision: 'pass_candidate',
      dimensionAuditSlots: input.dimensionAuditSlots,
      semanticAuditResolutions: input.semanticAuditResolutions,
      issues: [stage1Minor, stage1Suggestion],
      planningConflictAdvisories: [],
      preserveStrengths: input.preserveStrengths,
    }),
  }, {basePack});
  assert.equal(resRetainedAll.ok, true);

  // 4. Positive control B: Stage 2 retains MINOR verbatim & explicitly dismisses SUGGESTION with auditable note -> PASS
  const resWithDisp = await runSchemeC(root, 2, {
    runStage1HighRecall: makeStage1,
    runStage2Triage: input => ({
      schemaVersion: R3_FINAL_REPORT_SCHEMA,
      protocolMode: 'single_plus_triage_C',
      reviewFingerprint: input.reviewFingerprint,
      manuscriptHashes: input.manuscriptHashes,
      reviewer: {runId: 'c2-b5-disp', contextId: 'c2-b5-disp-ctx', role: 'chapter_review_arbiter'},
      decision: 'pass_candidate',
      dimensionAuditSlots: input.dimensionAuditSlots,
      semanticAuditResolutions: input.semanticAuditResolutions,
      issues: [stage1Minor],
      carriedIssueDispositions: [
        {id: stage1Suggestion.id, disposition: 'dismissed', note: '克制留白本身即本章风格优势，无需额外加戏'},
      ],
      planningConflictAdvisories: [],
      preserveStrengths: input.preserveStrengths,
    }),
  }, {basePack});
  assert.equal(resWithDisp.ok, true);
});

// ============================================================================
// TC-P0-5-B6: 多卷项目 P0-4 与 P0-5 端到端规划切片一致性测试（Owner 追加必测项）
// ============================================================================
test('TC-P0-5-B6: multi-volume P0-4 vs P0-5 planning slice end-to-end parity across Schemes A, B (Pass 1 & 2), and C (Stage 1 & 2)', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p05-multivol-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));

  fs.mkdirSync(path.join(root, 'chapters'), {recursive: true});
  fs.mkdirSync(path.join(root, 'outlines'), {recursive: true});

  const ch4Quote = '沈砚将那枚缺角铜印扣在案头，窗外运河雾气涌入舱室，账簿页脚还留着湿墨。';
  const ch4Strength = '船舱摇晃三寸，灯油却稳稳停在盏心，没有洒出一滴。';
  fs.writeFileSync(path.join(root, 'chapters/ch003.md'), '# 第三章 河口盘查\n\n沈砚核验完漕船文书五百石，暂留码头。\n', 'utf8');
  fs.writeFileSync(
    path.join(root, 'chapters/ch004.md'),
    `# 第四章 铜印暗账\n\n${ch4Strength}\n\n账面登记十月初八装船四百五十石，比原定初十早了两日。\n\n${ch4Quote}\n`,
    'utf8'
  );

  // Dedicated chapter outline referenced via `outlinePath`
  const dedicatedOutlineContent = '# 第四章专用细纲\n- 场景一：漕船舱内比对缺角铜印与暗账。\n- 场景二：借雾色封存副册，不惊动舱外哨兵。\n';
  fs.writeFileSync(path.join(root, 'outlines/ch004-outline.md'), dedicatedOutlineContent, 'utf8');

  // Multi-volume outline with Volume 1, Volume 2 (current, middle volume), and Volume 3 — all populated!
  const multiVolOutline = [
    '# 大纲',
    '## 核心契约',
    '现实向古风漕运探案，严格遵守地理里程与物理约束。',
    '## 滚动卷纲',
    '### 第1卷',
    '#### 第1章 初入漕署',
    '第一卷专属哨兵内容_VOL1_ONLY：盐道旧案初现端倪。',
    '### 第2卷',
    '#### 第4章 铜印暗账',
    '第二卷专属哨兵内容_VOL2_CURRENT：沈砚在漕船舱内以缺角铜印反查暗账，揭开提前两日装船的猫腻。',
    '### 第3卷',
    '#### 第7章 户部对质',
    '第三卷专属哨兵内容_VOL3_FUTURE：京师堂审与终极对质。',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(root, '01-大纲.md'), multiVolOutline, 'utf8');
  fs.writeFileSync(
    path.join(root, '00-人物档案.md'),
    '# 人物档案\n## 核心人设\n沈砚精于算学与印信辨伪，无超自然能力。\n## 动态状态与远期弧线\n第二卷暗查漕船。\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, '03-文风基准.md'),
    '# 文风基准\n## 文风指纹\n沉静克制，器物细节精确。\n## 本书校准段落\n雾气贴着水面铺开，船缆吱呀作响。\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, 'story-ledger.json'),
    JSON.stringify({
      schemaVersion: 1,
      facts: [{id: 'F-3', chapter: 3, scope: 'chapter', kind: 'established', subject: '沈砚', key: '核验粮数', value: '500石', evidence: '核验完漕船文书五百石'}],
      foreshadowing: [{id: 'P-3', chapter: 3, description: '缺角铜印来源', status: 'open'}],
      relationships: [],
      mechanisms: [],
      handoffs: [{chapter: 3, asOf: '十月初七夜', events: [{when: '亥时', event: '登船'}], knowledge: [{character: '沈砚', change: '发现粮数出入'}]}],
    }, null, 2) + '\n',
    'utf8'
  );

  // Chapter 4 deliberately omits explicit `volume` / `volumeId`, has dedicated `outlinePath`, and complete arc/beats/goal/conflict/hook!
  const ch4PlanEntry = {
    chapterNumber: 4,
    title: '第四章 铜印暗账',
    filePath: 'chapters/ch004.md',
    status: 'draft',
    // NO `volume` and NO `volumeId` — must infer Volume 2 via chapter tag, NOT Volume 1 or Volume 3!
    outlinePath: 'outlines/ch004-outline.md',
    arc: '运河暗账弧线',
    summary: '舱内核印锁定伪造日期',
    outline: '比对缺角铜印与十月初八装船记录',
    beats: ['登舱验灯', '比对铜印缺口', '封存湿墨副册'],
    goal: '在不惊动船头哨兵前提下取得暗账铁证',
    conflict: '装船日期提前两日且账册墨迹未干，舱外有人巡查',
    hook: '副册夹层掉出一枚户部火漆残片',
  };

  fs.writeFileSync(
    path.join(root, '02-写作计划.json'),
    JSON.stringify({
      novelName: '多卷规划切片一致性沙箱',
      writingMode: 'serial',
      minWordsPerChapter: 500,
      hardConstraints: {mustInclude: ['缺角铜印'], mustExclude: ['电报']},
      chapters: [
        {chapterNumber: 3, title: '第三章 河口盘查', filePath: 'chapters/ch003.md', status: 'completed', wordCount: 500, wordCountPass: true, volume: 1},
        ch4PlanEntry,
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
          corePlan: {status: 'frozen', snapshotSha256: 'a'.repeat(64)},
          volumeCheckpoints: {
            '1': {status: 'frozen', snapshotSha256: '1'.repeat(64)},
            '2': {status: 'frozen', snapshotSha256: '2'.repeat(64)},
            '3': {status: 'pending', snapshotSha256: null},
          },
          finalRefinement: {status: 'pending'},
        },
      },
    }, null, 2) + '\n',
    'utf8'
  );

  // 1. Direct P0-4 reference planning slice
  const plan = readPlan(root);
  const p04Slice = buildPlanningSlice(root, plan, plan.chapters[1], 4);

  // Sanity-check P0-4 reference slice captured every multi-volume & metadata nuance
  assert.equal(p04Slice.rawOutlineFallback, null, 'Valid R3 multi-volume outline must not fall back to raw outline');
  assert.ok(p04Slice.outlineCore && p04Slice.outlineCore.includes('现实向古风漕运探案'));
  assert.equal(p04Slice.currentVolumeId, 2, 'Chapter without explicit volume MUST resolve to Volume 2 (not Vol 1 or Vol 3)');
  assert.ok(p04Slice.currentVolumeAnchor.includes('VOL2_CURRENT'));
  assert.equal(p04Slice.currentVolumeAnchor.includes('VOL1_ONLY'), false);
  assert.equal(p04Slice.currentVolumeAnchor.includes('VOL3_FUTURE'), false);
  assert.ok(p04Slice.chapterOutlineSlice && p04Slice.chapterOutlineSlice.includes('VOL2_CURRENT'));
  assert.equal(p04Slice.dedicatedOutline, dedicatedOutlineContent);
  assert.equal(p04Slice.chapterMeta.volume, null);
  assert.equal(p04Slice.chapterMeta.arc, ch4PlanEntry.arc);
  assert.deepEqual(p04Slice.chapterMeta.beats, ch4PlanEntry.beats);
  assert.equal(p04Slice.chapterMeta.goal, ch4PlanEntry.goal);
  assert.equal(p04Slice.chapterMeta.conflict, ch4PlanEntry.conflict);
  assert.equal(p04Slice.chapterMeta.hook, ch4PlanEntry.hook);
  assert.deepEqual(p04Slice.volumeCheckpointRef, {status: 'frozen', snapshotSha256: '2'.repeat(64)});

  // 2. Capture the ACTUAL planningCoreSlice delivered to ALL THREE schemes (5 stage inputs total!)
  const received = {};

  const cmp = await runAllThreeSchemesComparison(root, 4, {
    adapterA: {
      runSingleStage: input => {
        received.A_stage1 = input.planningCoreSlice;
        return {
          schemaVersion: R3_FINAL_REPORT_SCHEMA,
          protocolMode: 'single_stage_A',
          reviewFingerprint: input.reviewFingerprint,
          manuscriptHashes: input.manuscriptHashes,
          reviewer: {runId: 'mv-a1', contextId: 'mv-a1-ctx', role: 'chapter_review_arbiter'},
          decision: 'pass_candidate',
          dimensionAuditSlots: makeFullSlots(),
          semanticAuditResolutions: makeNsaResolutions(input.needsSemanticAudit),
          issues: [],
          planningConflictAdvisories: [],
          preserveStrengths: [{quote: ch4Strength, reason: '画面沉静'}],
        };
      },
    },
    adapterB: {
      runPass1Discovery: input => {
        received.B_pass1 = input.planningCoreSlice;
        return {
          schemaVersion: R3_DISCOVERY_REPORT_SCHEMA,
          protocolMode: 'two_stage_B',
          reviewFingerprint: input.reviewFingerprint,
          reviewer: {runId: 'mv-b1', contextId: 'mv-b1-ctx', role: 'chapter_discovery_auditor'},
          dimensionAuditSlots: makeFullSlots('HL-2'),
          semanticAuditResolutions: makeNsaResolutions(input.needsSemanticAudit),
          candidates: [{
            candidateId: 'MV-CAND-1',
            dimension: 'HL-2',
            quote: ch4Quote,
            objectiveContradiction: '核验十月初八装船与前章500石记录',
            suspectedImpactScope: 'draft_only',
          }],
          preserveStrengths: [{quote: ch4Strength, reason: '画面沉静'}],
        };
      },
      runPass2Calibration: input => {
        received.B_pass2 = input.planningCoreSlice;
        return {
          schemaVersion: R3_FINAL_REPORT_SCHEMA,
          protocolMode: 'two_stage_B',
          reviewFingerprint: input.reviewFingerprint,
          manuscriptHashes: input.manuscriptHashes,
          reviewer: {runId: 'mv-b2', contextId: 'mv-b2-ctx', role: 'chapter_review_arbiter'},
          decision: 'pass_candidate',
          dimensionAuditSlots: input.dimensionAuditSlots,
          semanticAuditResolutions: input.semanticAuditResolutions,
          issues: [],
          planningConflictAdvisories: [],
          preserveStrengths: input.preserveStrengths,
        };
      },
    },
    adapterC: {
      runStage1HighRecall: input => {
        received.C_stage1 = input.planningCoreSlice;
        return {
          schemaVersion: R3_FINAL_REPORT_SCHEMA,
          protocolMode: 'single_plus_triage_C',
          reviewFingerprint: input.reviewFingerprint,
          manuscriptHashes: input.manuscriptHashes,
          reviewer: {runId: 'mv-c1', contextId: 'mv-c1-ctx', role: 'chapter_review_arbiter'},
          decision: 'revise',
          dimensionAuditSlots: makeFullSlots('HL-2'),
          semanticAuditResolutions: makeNsaResolutions(input.needsSemanticAudit),
          issues: [{
            id: 'MV-C1',
            dimension: 'HL-2',
            severity: 'MAJOR',
            impactScope: 'draft_only',
            blocking: true,
            mustCloseInReReview: true,
            quote: ch4Quote,
            evidence: '初审待复核',
            reverseDefense: '交 Stage 2 独立复核',
          }],
          planningConflictAdvisories: [],
          preserveStrengths: [{quote: ch4Strength, reason: '画面沉静'}],
        };
      },
      runStage2Triage: input => {
        received.C_stage2 = input.planningCoreSlice;
        return {
          schemaVersion: R3_FINAL_REPORT_SCHEMA,
          protocolMode: 'single_plus_triage_C',
          reviewFingerprint: input.reviewFingerprint,
          manuscriptHashes: input.manuscriptHashes,
          reviewer: {runId: 'mv-c2', contextId: 'mv-c2-ctx', role: 'chapter_review_arbiter'},
          decision: 'pass_candidate',
          dimensionAuditSlots: input.dimensionAuditSlots,
          semanticAuditResolutions: input.semanticAuditResolutions,
          issues: [],
          planningConflictAdvisories: [],
          preserveStrengths: input.preserveStrengths,
        };
      },
    },
  });

  assert.equal(cmp.ok, true, `Multi-volume comparison must succeed: ${JSON.stringify(cmp)}`);

  // 3. Assert 100% deep equality between P0-4 buildPlanningSlice() and EVERY actual P0-5 stage input!
  for (const [stageName, actualSlice] of Object.entries(received)) {
    assert.deepEqual(
      actualSlice,
      p04Slice,
      `${stageName} received planningCoreSlice diverged from P0-4 buildPlanningSlice()!`
    );
  }
  assert.deepEqual(Object.keys(received).sort(), ['A_stage1', 'B_pass1', 'B_pass2', 'C_stage1', 'C_stage2']);
});

