#!/usr/bin/env node
/**
 * P0-1 S1 4-tier severity compatibility & ENG-FIX-P1 regression suite.
 * Covers TC-P0-1-1 through TC-P0-1-6 across shared validators and real downstream CLI chains.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {structuredReportValid, sha256} from '../v3_common.mjs';
import {validCoreReview} from '../r3_plan_common.mjs';
import {validate as validateR2, checkGate} from '../r2_review_common.mjs';
import {
  S1_SEVERITIES,
  S1_BLOCKING_SEVERITIES,
  isS1BlockingSeverity,
  mustCloseInReReviewIssues,
  checkP1Report,
  readFeedback,
  legacyCandidates,
} from '../r3_p1_common.mjs';
import {momentum, cascadeWarnings} from '../r3_feedback_view.mjs';

const resolveScript = name => fileURLToPath(new URL('../' + name + '.mjs', import.meta.url));
const runCli = (name, root, ...args) => {
  const r = spawnSync(process.execPath, [resolveScript(name), root, ...args], {encoding: 'utf8'});
  assert.ok(r.stdout.trim(), `${name} produced empty stdout; stderr=${r.stderr}`);
  return {code: r.status, out: JSON.parse(r.stdout), stderr: r.stderr};
};
const writeJson = (root, rel, obj) => {
  const dst = path.join(root, rel);
  fs.mkdirSync(path.dirname(dst), {recursive: true});
  fs.writeFileSync(dst, JSON.stringify(obj, null, 2) + '\n');
};
const readPlan = root => JSON.parse(fs.readFileSync(path.join(root, '02-写作计划.json'), 'utf8'));
const savePlan = (root, plan) => writeJson(root, '02-写作计划.json', plan);

const OUTLINE = '# 故事大纲\n## 核心契约\n核心承诺：经营与修仙同频。核心能力不能读心。\n## 滚动卷纲\n### 第1卷\n卷一：灵米经营。\n### 第2卷\n卷二：开新坊市。\n';
const CHARACTER = '# 人物档案\n## 核心人设\n主角先小利后天下。\n## 动态状态与远期弧线\n角色成长由正文决定。\n';
const STYLE = '# 文风基准\n## 文风指纹\n烟火气，人物有私心。\n## 本书校准段落\n';

const H1 = 'a'.repeat(64);
const H2 = 'b'.repeat(64);
const H3 = 'c'.repeat(64);
const PILOT_HASHES = {'1': H1, '2': H2, '3': H3};

function basePilotReport(issues = [], decision = 'pass_candidate') {
  return {
    schemaVersion: 1,
    revision: 1,
    manuscriptHashes: PILOT_HASHES,
    reviewer: {kind: 'independent_agent', runId: 'pilot-editor-1', contextId: 'pilot-editor-ctx-1'},
    decision,
    summary: 'Fixture pilot review summary.',
    strengths: ['人物立得住'],
    issues,
  };
}

function baseCorePacket() {
  return {
    schemaVersion: 1,
    kind: 'r3_core',
    revision: 1,
    snapshotSha256: H1,
    planner: {runId: 'planner-1', contextId: 'planner-ctx-1'},
  };
}

function baseCoreReport(issues = [], decision = 'pass_candidate', role = 'architecture') {
  const checkIds = role === 'architecture'
    ? ['world_rules_and_power', 'character_causality', 'foreshadowing_and_finale']
    : ['genre_promise', 'opening_and_rewards', 'protagonist_agency'];
  return {
    schemaVersion: 1,
    kind: 'r3_core',
    role,
    revision: 1,
    snapshotSha256: H1,
    reviewer: {kind: 'independent_agent', runId: 'core-rev-' + role, contextId: 'core-ctx-' + role},
    summary: 'Fixture core review summary.',
    checks: checkIds.map(id => ({id, status: 'pass', evidence: '核对核心契约一致。'})),
    preserveStrengths: role === 'reader' ? ['强开篇', '烟火气', '钩子清晰'] : undefined,
    issues,
    decision,
  };
}

function setupR3P1Project(t, {withCoreSuggestion = false} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'r3-s1-compat-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  fs.mkdirSync(path.join(root, 'chapters'), {recursive: true});
  for (let n = 1; n <= 4; n++) {
    fs.writeFileSync(
      path.join(root, `chapters/${n}.md`),
      `# 第${n}章\n主角清点灵米账本，确认库房余粮充足，随后走向街口茶摊。`
    );
  }
  const plan = {
    novelName: 'S1兼容测试书',
    writingMode: 'serial',
    minWordsPerChapter: 5,
    totalChapters: 4,
    chapters: [1, 2, 3, 4].map(n => ({
      chapterNumber: n,
      title: `第${n}章`,
      filePath: `chapters/${n}.md`,
      status: n <= 3 ? 'completed' : 'pending',
      wordCountPass: n <= 3,
    })),
    v3: {
      schemaVersion: 1,
      creativeDecision: 'accepted',
      storyPlanApproved: false,
      r2: {schemaVersion: 1, chapterReviews: {}, arcReviews: {}},
      pilotGate: {status: 'pending', revision: 0, humanApproved: false},
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
  };
  savePlan(root, plan);
  fs.writeFileSync(path.join(root, '00-人物档案.md'), CHARACTER);
  fs.writeFileSync(path.join(root, '01-大纲.md'), OUTLINE);
  fs.writeFileSync(path.join(root, '03-文风基准.md'), STYLE);
  writeJson(root, 'story-ledger.json', {
    schemaVersion: 1,
    facts: [
      {id: 'F-001', chapter: 1, kind: 'established', subject: '主角', key: '余粮状态', scope: 'global', value: '充足', evidence: '主角清点灵米账本，确认库房余粮充足'},
    ],
    foreshadowing: [],
    relationships: [],
    mechanisms: [1, 2, 3].map(ch => ({
      id: `M-${ch}`, chapter: ch, goal: '经营灵米', strategy: '盘账定价', opposition: '缺钱', cost: '承担风险', outcome: '完成交易',
    })),
    handoffs: [1, 2, 3].map(ch => ({
      chapter: ch, asOf: `D+${ch}`, events: [{when: `D+${ch}`, event: '完成交易'}], knowledge: [],
    })),
  });

  // Core review & approval
  const prep = runCli('r3_plan', root, 'core-prepare', '--planner-run-id', 'planner-1', '--planner-context-id', 'planner-ctx-1');
  assert.equal(prep.code, 0, JSON.stringify(prep.out));
  const corePacket = JSON.parse(fs.readFileSync(path.join(root, prep.out.inputPath), 'utf8'));

  const coreArchIssues = withCoreSuggestion ? [{
    id: 'CORE-SUG-1',
    severity: 'SUGGESTION',
    status: 'open',
    artifact: '01-core.md',
    quote: '核心承诺：经营与修仙同频。',
    reason: '可选润色建议：可强化开篇节奏提示。',
    suggestion: '可在卷纲细化经营节点节奏。',
    evidenceLevel: 'narrative_risk',
  }] : [];

  for (const role of ['architecture', 'reader']) {
    const rep = baseCoreReport(role === 'architecture' ? coreArchIssues : [], 'pass_candidate', role);
    rep.revision = corePacket.revision;
    rep.snapshotSha256 = corePacket.snapshotSha256;
    writeJson(root, `core-src-${role}.json`, rep);
    const sub = runCli('r3_plan', root, 'core-submit', '--role', role, '--report', `core-src-${role}.json`);
    assert.equal(sub.code, 0, JSON.stringify(sub.out));
  }
  const coreGate = readPlan(root).v3.r3.corePlan;
  writeJson(root, 'core-approval.json', {
    schemaVersion: 1,
    kind: 'r3_core',
    approved: true,
    source: 'fixture-author',
    quote: '确认核心契约版本。',
    approvedAt: '2026-11-26T00:00:00Z',
    revision: coreGate.revision,
    inputSha256: coreGate.inputSha256,
    reviewSha256: {
      architecture: coreGate.reviews.architecture.sha256,
      reader: coreGate.reviews.reader.sha256,
    },
  });
  assert.equal(runCli('r3_plan', root, 'core-approve', '--evidence', 'core-approval.json').code, 0);

  // Volume 1 (covers chapters 1..4)
  assert.equal(runCli('r3_plan', root, 'volume-prepare', '--volume', '1', '--start', '1', '--end', '4').code, 0);
  const volRec = readPlan(root).v3.r3.volumeCheckpoints['1'];
  writeJson(root, 'vol1-approval.json', {
    schemaVersion: 1,
    kind: 'r3_volume',
    approved: true,
    source: 'fixture-author',
    quote: '确认第1卷规划。',
    approvedAt: '2026-11-26T00:00:00Z',
    volId: 1,
    revision: volRec.revision,
    inputSha256: volRec.inputSha256,
    coreInputSha256: volRec.coreInputSha256,
  });
  assert.equal(runCli('r3_plan', root, 'volume-approve', '--volume', '1', '--evidence', 'vol1-approval.json').code, 0);

  return root;
}

function bindChapter(root, chapterNum) {
  const ins = runCli('r3_p1', root, 'inspect', '--chapter', String(chapterNum));
  assert.equal(ins.code, 0, JSON.stringify(ins.out));
  const {rows, literaryStatus, ...base} = ins.out;
  const anchors = Object.fromEntries(rows.map(r => [
    r.id,
    chapterNum === 0 ? '核心能力不能读心。' : '主角清点灵米账本，确认库房余粮充足',
  ]));
  const ev = {
    schemaVersion: 1,
    ...base,
    checkedBy: {runId: `binder-run-${chapterNum}`, contextId: `binder-ctx-${chapterNum}`},
    reviewNote: '测试：逐条回查原文，非真实文学判断。',
    anchors,
  };
  const rel = `bind-ch-${chapterNum}.json`;
  writeJson(root, rel, ev);
  const res = runCli('r3_p1', root, 'bind', '--evidence', rel);
  assert.equal(res.code, 0, JSON.stringify(res.out));
}

// ============================================================================
// TC-P0-1-6: Shared validator direct contracts (v3_common & r3_plan_common)
// ============================================================================
test('TC-P0-1-6a: structuredReportValid() accepts non-blocking SUGGESTION, rejects overrides, preserves 3-tier rules', () => {
  assert.deepEqual(S1_SEVERITIES, ['BLOCKER', 'MAJOR', 'MINOR', 'SUGGESTION']);
  assert.deepEqual(S1_BLOCKING_SEVERITIES, ['BLOCKER', 'MAJOR']);
  assert.equal(isS1BlockingSeverity('BLOCKER'), true);
  assert.equal(isS1BlockingSeverity('MAJOR'), true);
  assert.equal(isS1BlockingSeverity('MINOR'), false);
  assert.equal(isS1BlockingSeverity('SUGGESTION'), false);

  // Legal SUGGESTION (open, no reverseDefense, default/explicit false flags) passes non-blocking
  const validSugReport = basePilotReport([
    {
      id: 'SUG-1',
      severity: 'SUGGESTION',
      status: 'open',
      chapter: 1,
      quote: '库房余粮充足',
      reason: '可补充一笔市井细节增强画面感',
      suggestion: '可酌情加一句伙计报数声',
    },
    {
      id: 'SUG-2',
      severity: 'SUGGESTION',
      status: 'open',
      chapter: 2,
      quote: '走向街口茶摊',
      reason: '过渡句可更凝练',
      suggestion: '可删去冗余连接词',
      blocking: false,
      mustCloseInReReview: false,
    },
    {
      id: 'MIN-1',
      severity: 'MINOR',
      status: 'open',
      chapter: 3,
      quote: '灵米账本',
      reason: '局部称谓略有重复',
      suggestion: '后续章节微调即可',
    },
  ], 'pass_candidate');
  assert.deepEqual(structuredReportValid(validSugReport, 1, PILOT_HASHES), []);
  assert.equal(mustCloseInReReviewIssues(validSugReport).length, 0);

  // Override attempts on SUGGESTION MUST be hard-rejected
  const baseSug = validSugReport.issues[0];
  assert.ok(structuredReportValid(basePilotReport([{...baseSug, blocking: true}]), 1, PILOT_HASHES).includes('SUGGESTION_CANNOT_BLOCK'));
  assert.ok(structuredReportValid(basePilotReport([{...baseSug, mustCloseInReReview: true}]), 1, PILOT_HASHES).includes('SUGGESTION_CANNOT_BLOCK'));
  assert.ok(structuredReportValid(basePilotReport([{...baseSug, disposition: 'fix_now'}]), 1, PILOT_HASHES).includes('SUGGESTION_CANNOT_BLOCK'));
  assert.ok(structuredReportValid(basePilotReport([{...baseSug, blocking: 'true'}]), 1, PILOT_HASHES).includes('SUGGESTION_CANNOT_BLOCK'));

  // Legacy 3-tier BLOCKER/MAJOR/MINOR behavior unchanged
  const legacyPass = basePilotReport([
    {id: 'L-MIN', severity: 'MINOR', status: 'open', chapter: 1, quote: 'q', reason: 'r', suggestion: 's'},
    {id: 'L-MAJ', severity: 'MAJOR', status: 'resolved', chapter: 1, quote: 'q', reason: 'r', suggestion: 's'},
  ], 'pass_candidate');
  assert.deepEqual(structuredReportValid(legacyPass, 1, PILOT_HASHES), []);
  assert.ok(structuredReportValid(basePilotReport([
    {id: 'L-OPEN-MAJ', severity: 'MAJOR', status: 'open', chapter: 1, quote: 'q', reason: 'r', suggestion: 's'},
  ], 'pass_candidate'), 1, PILOT_HASHES).includes('UNRESOLVED_MAJOR_ISSUES'));
  assert.ok(structuredReportValid(basePilotReport([
    {id: 'L-ACC-BLK', severity: 'BLOCKER', status: 'accepted', acceptanceReason: 'try', chapter: 1, quote: 'q', reason: 'r', suggestion: 's'},
  ], 'pass_candidate'), 1, PILOT_HASHES).includes('BLOCKER_CANNOT_BE_ACCEPTED'));
  assert.ok(structuredReportValid(basePilotReport([
    {id: 'L-BAD', severity: 'CRITICAL', status: 'open', chapter: 1, quote: 'q', reason: 'r', suggestion: 's'},
  ], 'revise'), 1, PILOT_HASHES).includes('INVALID_ISSUE'));
});

test('TC-P0-1-6b: validCoreReview() accepts non-blocking SUGGESTION without reverseDefense, rejects overrides, preserves 3-tier rules', () => {
  const pkt = baseCorePacket();
  const srcFiles = {'01-core.md': '核心承诺：经营与修仙同频。核心能力不能读心。'};

  // Legal SUGGESTION without reverseDefense passes pass_candidate
  const validSug = {
    id: 'C-SUG-1',
    severity: 'SUGGESTION',
    status: 'open',
    artifact: '01-core.md',
    quote: '核心承诺：经营与修仙同频。',
    reason: '可选节奏建议',
    suggestion: '可在前两章强化市井对照',
    evidenceLevel: 'narrative_risk',
  };
  assert.equal(validCoreReview(baseCoreReport([validSug], 'pass_candidate'), pkt, 'architecture', null, srcFiles), true);
  assert.equal(validCoreReview(baseCoreReport([{...validSug, blocking: false, mustCloseInReReview: false}], 'pass_candidate'), pkt, 'architecture', null, srcFiles), true);

  // Override attempts hard-rejected
  assert.equal(validCoreReview(baseCoreReport([{...validSug, blocking: true}], 'pass_candidate'), pkt, 'architecture', null, srcFiles), false);
  assert.equal(validCoreReview(baseCoreReport([{...validSug, mustCloseInReReview: true}], 'pass_candidate'), pkt, 'architecture', null, srcFiles), false);
  assert.equal(validCoreReview(baseCoreReport([{...validSug, disposition: 'fix_now'}], 'pass_candidate'), pkt, 'architecture', null, srcFiles), false);

  // BLOCKER/MAJOR/MINOR existing rules preserved verbatim
  const openMajorWithDefense = {
    id: 'C-MAJ-1',
    severity: 'MAJOR',
    status: 'open',
    artifact: '01-core.md',
    quote: '核心能力不能读心。',
    reason: '缺少触发边界',
    suggestion: '补齐边界',
    evidenceLevel: 'explicit_conflict',
    reverseDefense: '即使考虑后续揭晓，当前核心契约仍需明确。',
  };
  assert.equal(validCoreReview(baseCoreReport([openMajorWithDefense], 'revise'), pkt, 'architecture', null, srcFiles), true);
  assert.equal(validCoreReview(baseCoreReport([openMajorWithDefense], 'pass_candidate'), pkt, 'architecture', null, srcFiles), false);
  const majorNoDefense = {...openMajorWithDefense};
  delete majorNoDefense.reverseDefense;
  assert.equal(validCoreReview(baseCoreReport([majorNoDefense], 'revise'), pkt, 'architecture', null, srcFiles), false);
  const openMinor = {
    id: 'C-MIN-1',
    severity: 'MINOR',
    status: 'open',
    artifact: '01-core.md',
    quote: '经营与修仙同频',
    reason: '措辞略简',
    suggestion: '可略微润色',
    evidenceLevel: 'narrative_risk',
  };
  assert.equal(validCoreReview(baseCoreReport([openMinor], 'pass_candidate'), pkt, 'architecture', null, srcFiles), true);
});

// ============================================================================
// TC-P0-1-1, TC-P0-1-2, TC-P0-1-3: Full downstream E2E chain + bidirectional compat
// ============================================================================
test('TC-P0-1-1 & TC-P0-1-3: Full R3/P1 E2E chain with SUGGESTION (core, chapters, Pilot approval chain, v3_gate, r3_delivery_check, r3_p1, r3_feedback_view)', t => {
  const root = setupR3P1Project(t, {withCoreSuggestion: true});

  // Also verify R3 core-submit hard-rejects overriding SUGGESTION on Core review
  const badCorePrep = runCli('r3_plan', root, 'core-prepare', '--planner-run-id', 'planner-2', '--planner-context-id', 'planner-ctx-2');
  // Core is already passed; verify via validCoreReview directly on bad override and test fresh project core-submit rejection
  assert.ok(badCorePrep.code === 0 || badCorePrep.code === 2);

  // Use a clean project with core approved + SUGGESTION, activate P1
  const root2 = setupR3P1Project(t, {withCoreSuggestion: true});
  // Before P1 activation, complete ch1 with a legacy 3-tier review (contains open MINOR) to test "new reads old"
  let p = readPlan(root2);
  p.chapters[1].status = 'pending'; p.chapters[1].wordCountPass = false;
  p.chapters[2].status = 'pending'; p.chapters[2].wordCountPass = false;
  savePlan(root2, p);

  assert.equal(runCli('r2_review', root2, 'prepare', '--scope', 'chapter', '--end', '1',
    '--writer-run-id', 'w1', '--writer-context-id', 'wc1').code, 0);
  const rec1 = readPlan(root2).v3.r2.chapterReviews['1'];
  const pkt1 = JSON.parse(fs.readFileSync(path.join(root2, rec1.inputPath), 'utf8'));

  // Before P1 activation (non-S1 legacy mode), SUGGESTION must still be rejected by r2_review_common.validate
  const legacyWithSug = {
    schemaVersion: 1, kind: 'chapter', end: 1, revision: rec1.revision,
    manuscriptHashes: pkt1.manuscriptHashes,
    reviewer: {kind: 'independent_agent', runId: 'ed-leg-1', contextId: 'ed-leg-ctx-1'},
    decision: 'pass_candidate', summary: 'Legacy mode must reject SUGGESTION',
    issues: [{id: 'LEG-SUG', severity: 'SUGGESTION', status: 'open', chapter: 1, quote: '库房余粮充足', reason: '润色', suggestion: '可微调'}],
  };
  writeJson(root2, 'leg-sug.json', legacyWithSug);
  const legSugRes = runCli('r2_review', root2, 'submit', '--scope', 'chapter', '--end', '1', '--report', 'leg-sug.json');
  assert.equal(legSugRes.code, 2);
  assert.match(legSugRes.out.error, /R2_INVALID_ISSUE/);

  // Submit genuine legacy 3-tier report (with open MINOR) before P1 activation
  writeJson(root2, 'leg-3tier.json', {
    schemaVersion: 1, kind: 'chapter', end: 1, revision: rec1.revision,
    manuscriptHashes: pkt1.manuscriptHashes,
    reviewer: {kind: 'independent_agent', runId: 'ed-leg-1', contextId: 'ed-leg-ctx-1'},
    decision: 'pass_candidate', summary: 'Legacy 3-tier pass with MINOR',
    issues: [{id: 'LEG-MIN', severity: 'MINOR', status: 'open', chapter: 1, quote: '库房余粮充足', reason: '细节略简', suggestion: '后文补一句'}],
  });
  assert.equal(runCli('r2_review', root2, 'submit', '--scope', 'chapter', '--end', '1', '--report', 'leg-3tier.json').code, 0);

  // Activate R3 P1 on top of legacy ch1 review -> binds ch0 & ch1
  const act = runCli('r3_p1', root2, 'activate', '--project-id', 's1-compat-proj');
  assert.equal(act.code, 0, JSON.stringify(act.out));
  bindChapter(root2, 0);
  bindChapter(root2, 1);

  // Verify legacy 3-tier candidate still readable and does NOT fabricate SUGGESTION
  const legCands = legacyCandidates(root2, readPlan(root2));
  assert.equal(legCands.length, 1);
  assert.equal(legCands[0].severity, 'MINOR');

  // Now complete chapters 2 and 3 under R3/P1 4-tier S1 protocol with MINOR + SUGGESTION
  for (const ch of [2, 3]) {
    p = readPlan(root2);
    p.chapters[ch - 1].status = 'completed';
    p.chapters[ch - 1].wordCountPass = true;
    savePlan(root2, p);
    assert.equal(runCli('r2_review', root2, 'prepare', '--scope', 'chapter', '--end', String(ch),
      '--writer-run-id', `w${ch}`, '--writer-context-id', `wc${ch}`).code, 0);
    const rec = readPlan(root2).v3.r2.chapterReviews[String(ch)];
    const pkt = JSON.parse(fs.readFileSync(path.join(root2, rec.inputPath), 'utf8'));

    // TC-P0-1-2: CLI hard rejection of overriding SUGGESTION on chapter review
    for (const [tag, badIssue] of [
      ['blocking_true', {id: 'BAD-1', severity: 'SUGGESTION', status: 'open', chapter: ch, quote: '库房余粮充足', reason: '润色', suggestion: '可改', blocking: true}],
      ['mustClose_true', {id: 'BAD-2', severity: 'SUGGESTION', status: 'open', chapter: ch, quote: '库房余粮充足', reason: '润色', suggestion: '可改', mustCloseInReReview: true}],
      ['disp_fix_now', {id: 'BAD-3', severity: 'SUGGESTION', status: 'open', chapter: ch, quote: '库房余粮充足', reason: '润色', suggestion: '可改', disposition: 'fix_now'}],
      ['disp_fix_in_arc', {id: 'BAD-4', severity: 'SUGGESTION', status: 'open', chapter: ch, quote: '库房余粮充足', reason: '润色', suggestion: '可改', disposition: 'fix_in_arc'}],
    ]) {
      writeJson(root2, `bad-ch${ch}-${tag}.json`, {
        schemaVersion: 1, kind: 'chapter', end: ch, revision: rec.revision,
        manuscriptHashes: pkt.manuscriptHashes,
        reviewer: {kind: 'independent_agent', runId: `ed-${ch}`, contextId: `ed-ctx-${ch}`},
        decision: 'pass_candidate', summary: 'Invalid override attempt',
        issues: [badIssue],
        p1: {schemaVersion: 1, literaryStatus: 'UNVERIFIED', preserveStrengths: [], signals: [], followUps: [], revisionProtection: []},
      });
      const badRes = runCli('r2_review', root2, 'submit', '--scope', 'chapter', '--end', String(ch), '--report', `bad-ch${ch}-${tag}.json`);
      assert.equal(badRes.code, 2, `Expected rejection for ${tag}`);
      assert.match(badRes.out.error, /R2_SUGGESTION_CANNOT_BLOCK/);
    }

    // TC-P0-1-1: Valid 4-tier report with MINOR + SUGGESTION (0 blocking, 0 mustCloseInReReview)
    const chReport = {
      schemaVersion: 1, kind: 'chapter', end: ch, revision: rec.revision,
      manuscriptHashes: pkt.manuscriptHashes,
      reviewer: {kind: 'independent_agent', runId: `ed-${ch}`, contextId: `ed-ctx-${ch}`},
      decision: 'pass_candidate', summary: `第${ch}章四级非阻断通过`,
      issues: [
        {
          id: `MIN-${ch}`,
          severity: 'MINOR',
          status: 'open',
          chapter: ch,
          quote: '灵米账本',
          reason: '局部细节可微调',
          suggestion: '完稿前统一账本称呼',
          classification: 'C',
          evidenceLevel: 'narrative_risk',
          evidenceBasis: 'explicit_text',
          disposition: 'defer_to_final',
          subject: '主角',
          key: `账本措辞-${ch}`,
        },
        {
          id: `SUG-${ch}-A`,
          severity: 'SUGGESTION',
          status: 'open',
          chapter: ch,
          quote: '走向街口茶摊',
          reason: '可选润色：增加市井环境声效',
          suggestion: '可酌情加半句茶客议论',
          classification: 'advisory',
          disposition: 'advisory',
          blocking: false,
          mustCloseInReReview: false,
        },
        {
          id: `SUG-${ch}-B`,
          severity: 'SUGGESTION',
          status: 'open',
          chapter: ch,
          quote: '确认库房余粮充足',
          reason: '可选润色：即使带 defer_to_final 亦不进债务池',
          suggestion: '无需强制修改',
          classification: 'C',
          evidenceLevel: 'narrative_risk',
          evidenceBasis: 'explicit_text',
          disposition: 'defer_to_final',
        },
      ],
      p1: {
        schemaVersion: 1,
        literaryStatus: 'UNVERIFIED',
        preserveStrengths: [{id: `S-${ch}`, status: 'observed', chapter: ch, quote: '主角清点灵米账本', reason: '开篇动作具体'}],
        signals: [{id: `SIG-${ch}`, kind: 'spark', chapter: ch, quote: '街口茶摊', description: '市井感自然'}],
        followUps: [],
        revisionProtection: [],
      },
    };
    assert.equal(mustCloseInReReviewIssues(chReport).length, 0);
    writeJson(root2, `good-ch${ch}.json`, chReport);
    const okRes = runCli('r2_review', root2, 'submit', '--scope', 'chapter', '--end', String(ch), '--report', `good-ch${ch}.json`);
    assert.equal(okRes.code, 0, JSON.stringify(okRes.out));
    assert.equal(okRes.out.status, 'passed');
    bindChapter(root2, ch);
  }

  // Full Pilot approval chain: prepare_pilot_review -> submit_pilot_review -> record_pilot_approval -> v3_gate --chapter 4 -> r3_delivery_check
  const pPrep = runCli('prepare_pilot_review', root2, '--json');
  assert.equal(pPrep.code, 0, JSON.stringify(pPrep.out));
  const pGate = readPlan(root2).v3.pilotGate;

  // TC-P0-1-2: Pilot submit hard-rejects overriding SUGGESTION
  const badPilotReport = {
    schemaVersion: 1, revision: pGate.revision,
    manuscriptHashes: pGate.reviewedChapterHashes,
    reviewer: {kind: 'independent_agent', runId: 'pilot-ed-1', contextId: 'pilot-ed-ctx-1'},
    decision: 'pass_candidate', summary: 'Bad pilot override',
    strengths: ['人物清晰'],
    issues: [{
      id: 'PSUG-BAD', severity: 'SUGGESTION', status: 'open', chapter: 1,
      quote: '库房余粮充足', reason: '润色', suggestion: '可改', blocking: true,
    }],
    p1: {
      schemaVersion: 1, literaryStatus: 'UNVERIFIED',
      preserveStrengths: [
        {id: 'PS1', status: 'observed', chapter: 1, quote: '灵米账本', reason: '生活质感'},
        {id: 'PS2', status: 'observed', chapter: 2, quote: '库房余粮充足', reason: '经营节奏'},
        {id: 'PS3', status: 'observed', chapter: 3, quote: '街口茶摊', reason: '市井气氛'},
      ],
      signals: [], followUps: [], revisionProtection: [],
    },
  };
  writeJson(root2, 'pilot-bad.json', badPilotReport);
  const pBadSub = runCli('submit_pilot_review', root2, 'pilot-bad.json', '--json');
  assert.equal(pBadSub.code, 2);
  assert.match(pBadSub.out.error, /SUGGESTION_CANNOT_BLOCK/);

  // Valid Pilot report containing SUGGESTION (passes submit_pilot_review -> unmodified record_pilot_approval -> v3_gate -> unmodified r3_delivery_check)
  const goodPilotReport = {
    ...badPilotReport,
    summary: 'Pilot 四级审稿非阻断通过（含 SUGGESTION）',
    issues: [{
      id: 'PSUG-1', severity: 'SUGGESTION', status: 'open', chapter: 2,
      quote: '走向街口茶摊', reason: '可选润色建议', suggestion: '可增强街市声色描写',
      classification: 'advisory', disposition: 'advisory', blocking: false, mustCloseInReReview: false,
    }],
  };
  assert.equal(mustCloseInReReviewIssues(goodPilotReport).length, 0);
  writeJson(root2, 'pilot-good.json', goodPilotReport);
  const pSub = runCli('submit_pilot_review', root2, 'pilot-good.json', '--json');
  assert.equal(pSub.code, 0, JSON.stringify(pSub.out));
  assert.equal(pSub.out.status, 'awaiting_approval');

  const pGateAfter = readPlan(root2).v3.pilotGate;
  writeJson(root2, 'pilot-approval.json', {
    schemaVersion: 1,
    approved: true,
    revision: pGateAfter.revision,
    reviewSha256: pGateAfter.reviewSha256,
    quote: '确认通过前三章 Pilot 审稿。',
    source: 'fixture-author',
    approvedAt: '2026-11-26T00:10:00Z',
  });
  const pApp = runCli('record_pilot_approval', root2, '--evidence', 'pilot-approval.json', '--json');
  assert.equal(pApp.code, 0, JSON.stringify(pApp.out));
  assert.equal(pApp.out.status, 'passed');

  // v3_gate --chapter 4 MUST allow (exit 0)
  const gate4 = runCli('v3_gate', root2, '--chapter', '4', '--json');
  assert.equal(gate4.code, 0, JSON.stringify(gate4.out));
  assert.equal(gate4.out.status, 'allowed');

  // r3_delivery_check --upto 3 (unmodified caller!) MUST pass (exit 0)
  const deliv = runCli('r3_delivery_check', root2, '--upto', '3');
  assert.equal(deliv.code, 0, JSON.stringify(deliv.out));
  assert.equal(deliv.out.pilotStatus, 'passed');

  // r3_p1 status & r3_feedback_view: 0 SUGGESTION in deferredIssues, 0 cascadeWarnings
  const p1Status = runCli('r3_p1', root2, 'status', '--upto', '3');
  assert.equal(p1Status.code, 0, JSON.stringify(p1Status.out));
  assert.equal(p1Status.out.status, 'ready');
  assert.equal(p1Status.out.dueIssues.length, 0);
  assert.equal(p1Status.out.deferredIssues.some(i => i.severity === 'SUGGESTION'), false, 'SUGGESTION must NEVER enter deferredIssues');
  assert.equal(p1Status.out.deferredIssues.length, 2, 'Only the two MINOR defer_to_final items appear in deferredIssues');

  const fb = readFeedback(root2, readPlan(root2), {upto: 3});
  assert.equal(fb.deferredIssues.some(i => i.severity === 'SUGGESTION'), false);
  const mom = momentum(fb, JSON.parse(fs.readFileSync(path.join(root2, 'story-ledger.json'), 'utf8')), 3);
  assert.equal(mom.literaryStatus, 'UNVERIFIED');
  // Defensive guard in cascadeWarnings even if a caller manually passes a SUGGESTION item
  const cw = cascadeWarnings(
    {deferredIssues: [{trackingId: 'T-SUG', status: 'open', severity: 'SUGGESTION', chapter: 1, subject: '主角', key: '余粮状态', factId: 'F-001', reason: '润色'}]},
    [{id: 'F-001', subject: '主角', key: '余粮状态'}]
  );
  assert.deepEqual(cw, []);
});

// ============================================================================
// TC-P0-1-3b: Core review CLI entry rejects overriding SUGGESTION
// ============================================================================
test('TC-P0-1-3b: r3_plan core-submit rejects overriding SUGGESTION and accepts legal SUGGESTION', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'r3-core-sug-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  savePlan(root, {
    novelName: 'CoreS1测试',
    writingMode: 'serial',
    minWordsPerChapter: 5,
    totalChapters: 2,
    chapters: [1, 2].map(n => ({chapterNumber: n, title: `第${n}章`, filePath: `chapters/${n}.md`, status: 'pending'})),
    v3: {
      schemaVersion: 1, creativeDecision: 'accepted', storyPlanApproved: false,
      r2: {schemaVersion: 1, chapterReviews: {}, arcReviews: {}}, pilotGate: {status: 'pending'},
      r3: {schemaVersion: 1, mode: 'experimental', status: 'bootstrap', reviewPolicy: 'every_chapter',
        corePlan: {status: 'pending'}, volumeCheckpoints: {}, finalRefinement: {status: 'pending'}},
    },
  });
  fs.writeFileSync(path.join(root, '00-人物档案.md'), CHARACTER);
  fs.writeFileSync(path.join(root, '01-大纲.md'), OUTLINE);
  fs.writeFileSync(path.join(root, '03-文风基准.md'), STYLE);

  const prep = runCli('r3_plan', root, 'core-prepare', '--planner-run-id', 'pl-1', '--planner-context-id', 'pl-ctx-1');
  assert.equal(prep.code, 0);
  const pkt = JSON.parse(fs.readFileSync(path.join(root, prep.out.inputPath), 'utf8'));

  const badRep = baseCoreReport([{
    id: 'CS-BAD', severity: 'SUGGESTION', status: 'open', artifact: '01-core.md',
    quote: '核心承诺：经营与修仙同频。', reason: '润色', suggestion: '可改',
    evidenceLevel: 'narrative_risk', blocking: true,
  }], 'pass_candidate', 'architecture');
  badRep.revision = pkt.revision;
  badRep.snapshotSha256 = pkt.snapshotSha256;
  writeJson(root, 'core-bad.json', badRep);
  assert.equal(runCli('r3_plan', root, 'core-submit', '--role', 'architecture', '--report', 'core-bad.json').code, 2);

  const goodRep = baseCoreReport([{
    id: 'CS-OK', severity: 'SUGGESTION', status: 'open', artifact: '01-core.md',
    quote: '核心承诺：经营与修仙同频。', reason: '可选润色', suggestion: '可强化节奏',
    evidenceLevel: 'narrative_risk',
  }], 'pass_candidate', 'architecture');
  goodRep.revision = pkt.revision;
  goodRep.snapshotSha256 = pkt.snapshotSha256;
  writeJson(root, 'core-ok.json', goodRep);
  assert.equal(runCli('r3_plan', root, 'core-submit', '--role', 'architecture', '--report', 'core-ok.json').code, 0);
});

// ============================================================================
// TC-P0-1-4: ENG-FIX-P1 legacy field validation boundary regressions
// ============================================================================
test('TC-P0-1-4: ENG-FIX-P1 checkP1Report boundary validations', t => {
  const root = setupR3P1Project(t);
  // Activate P1 cleanly on 0 completed chapters
  const p = readPlan(root);
  for (const c of p.chapters) { c.status = 'pending'; c.wordCountPass = false; }
  savePlan(root, p);
  assert.equal(runCli('r3_p1', root, 'activate', '--project-id', 'eng-fix-p1').code, 0);
  const plan = readPlan(root);

  const pkt = {schemaVersion: 1, kind: 'chapter', end: 1, revision: 1, p1Protocol: 1, manuscriptHashes: {'1': H1}, writers: [{chapter: 1, runId: 'w1', contextId: 'wc1'}], priorStrengths: []};
  const mkReport = issues => ({
    schemaVersion: 1, kind: 'chapter', end: 1, revision: 1, manuscriptHashes: {'1': H1},
    reviewer: {kind: 'independent_agent', runId: 'e1', contextId: 'ec1'},
    decision: 'revise', summary: 'ENG-FIX-P1 check', issues,
    p1: {schemaVersion: 1, literaryStatus: 'UNVERIFIED', preserveStrengths: [], signals: [], followUps: [], revisionProtection: []},
  });

  // 1. L118 bug fix: classification 'A' with SUGGESTION must be rejected (previously only MINOR was blocked)
  assert.throws(() => checkP1Report(root, plan, mkReport([{
    id: 'E1', severity: 'SUGGESTION', status: 'open', chapter: 1, quote: '库房余粮充足',
    reason: 'r', suggestion: 's', classification: 'A', evidenceLevel: 'explicit_conflict',
    evidenceBasis: 'explicit_text', disposition: 'advisory',
  }]), 'chapter', 1, pkt), /SUGGESTION_INVALID_CLASSIFICATION/);

  // 2. classification 'B' with SUGGESTION must be rejected
  assert.throws(() => checkP1Report(root, plan, mkReport([{
    id: 'E2', severity: 'SUGGESTION', status: 'open', chapter: 1, quote: '库房余粮充足',
    reason: 'r', suggestion: 's', classification: 'B', evidenceLevel: 'narrative_risk',
    evidenceBasis: 'explicit_text', disposition: 'advisory',
  }]), 'chapter', 1, pkt), /SUGGESTION_INVALID_CLASSIFICATION/);

  // 3. SUGGESTION with causal_break must be rejected
  assert.throws(() => checkP1Report(root, plan, mkReport([{
    id: 'E3', severity: 'SUGGESTION', status: 'open', chapter: 1, quote: '库房余粮充足',
    reason: 'r', suggestion: 's', classification: 'C', evidenceLevel: 'causal_break',
    evidenceBasis: 'explicit_text', disposition: 'advisory',
  }]), 'chapter', 1, pkt), /CAUSAL_BREAK_MUST_FIX_NOW/);

  // 4. SUGGESTION with fix_now or blocking:true or mustCloseInReReview:true must be rejected
  assert.throws(() => checkP1Report(root, plan, mkReport([{
    id: 'E4', severity: 'SUGGESTION', status: 'open', chapter: 1, quote: '库房余粮充足',
    reason: 'r', suggestion: 's', classification: 'C', disposition: 'fix_now',
  }]), 'chapter', 1, pkt), /SUGGESTION_CANNOT_BLOCK/);
  assert.throws(() => checkP1Report(root, plan, mkReport([{
    id: 'E5', severity: 'SUGGESTION', status: 'open', chapter: 1, quote: '库房余粮充足',
    reason: 'r', suggestion: 's', blocking: true,
  }]), 'chapter', 1, pkt), /SUGGESTION_CANNOT_BLOCK/);
  assert.throws(() => checkP1Report(root, plan, mkReport([{
    id: 'E6', severity: 'SUGGESTION', status: 'open', chapter: 1, quote: '库房余粮充足',
    reason: 'r', suggestion: 's', mustCloseInReReview: true,
  }]), 'chapter', 1, pkt), /SUGGESTION_CANNOT_BLOCK/);

  // 5. Invalid severity enum directly caught by checkP1Report
  assert.throws(() => checkP1Report(root, plan, mkReport([{
    id: 'E7', severity: 'UNKNOWN', status: 'open', chapter: 1, quote: '库房余粮充足',
    reason: 'r', suggestion: 's', classification: 'A', evidenceLevel: 'explicit_conflict',
    evidenceBasis: 'explicit_text', disposition: 'fix_now',
  }]), 'chapter', 1, pkt), /INVALID_SEVERITY/);

  // 6. MINOR with blocking:true or mustCloseInReReview:true rejected
  assert.throws(() => checkP1Report(root, plan, mkReport([{
    id: 'E8', severity: 'MINOR', status: 'open', chapter: 1, quote: '库房余粮充足',
    reason: 'r', suggestion: 's', classification: 'C', evidenceLevel: 'narrative_risk',
    evidenceBasis: 'explicit_text', disposition: 'defer_to_final', subject: '主角', key: 'k',
    blocking: true,
  }]), 'chapter', 1, pkt), /MINOR_CANNOT_BLOCK/);

  // 7. validateR2 directly verifies pure R2 (allowP1=false) rejects SUGGESTION while S1 mode (allowP1=true, p1Protocol=1) accepts it
  const r2SugRep = {
    schemaVersion: 1, kind: 'chapter', end: 1, revision: 1, manuscriptHashes: {'1': H1},
    reviewer: {kind: 'independent_agent', runId: 'e1', contextId: 'ec1'},
    decision: 'pass_candidate', summary: 's',
    issues: [{id: 'S1', severity: 'SUGGESTION', status: 'open', chapter: 1, quote: 'q', reason: 'r', suggestion: 's'}],
  };
  assert.ok(validateR2(r2SugRep, {...pkt, p1Protocol: undefined}, false).includes('R2_INVALID_ISSUE'));
  assert.deepEqual(validateR2(r2SugRep, pkt, true), []);
  assert.ok(validateR2({...r2SugRep, issues: [{...r2SugRep.issues[0], blocking: true}]}, pkt, true).includes('R2_SUGGESTION_CANNOT_BLOCK'));
});
