#!/usr/bin/env node
/**
 * P0-4 Comprehensive Test Suite:
 *   TC-P0-4-1: 规划 / 账本 / 硬约束 / 正文 1 字节篡改 -> fingerprint_mismatch (exit code 2, 0 落盘)
 *   TC-P0-4-2: 漏 6 维 dimensionAuditSlots 或空 checkedAnchor -> 拒收 (exit code 2, 0 落盘)
 *   TC-P0-4-3: 漏核销 NEEDS_SEMANTIC_AUDIT (NSA-001) -> 拒收 (exit code 2, 0 落盘)
 *   TC-P0-4-4: 伪造 quote (改 1 字不在冻结正文) -> 拒收 (exit code 2, 0 落盘)
 *   TC-P0-4-5: BLOCKER/MAJOR 缺失 reverseDefense 或 impactScope -> 拒收 (exit code 2, 0 落盘)
 *   TC-P0-4-6: 连续 3 次 --dry-run + 2 次 hardErrors 预检失败后首次送审 -> revision 严格为 v1 (空增=0)
 *   TC-P0-4-7: 合法报告落盘、Pass1DiscoveryReport 校验、S1 SUGGESTION/OR6 一致性、指纹计算 <30ms 及 R2 兼容隔离
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {
  R3_REVIEW_PROTOCOL_VERSION,
  R3_DISCOVERY_REPORT_SCHEMA,
  R3_FINAL_REPORT_SCHEMA,
  DIMENSION_SLOTS,
  canonicalJson,
  computeReviewFingerprint,
  prepareR3Review,
  validateR3ReviewReport,
  applyR3Review,
} from '../r3_review_kernel.mjs';

const CLI_PATH = fileURLToPath(new URL('../r3_review_kernel.mjs', import.meta.url));
const R2_CLI_PATH = fileURLToPath(new URL('../r2_review.mjs', import.meta.url));

function runKernelCli(root, ...args) {
  const res = spawnSync(process.execPath, [CLI_PATH, root, ...args], {encoding: 'utf8'});
  assert.ok(res.stdout.trim(), `Expected JSON stdout, stderr=${res.stderr}`);
  return {status: res.status, json: JSON.parse(res.stdout), stderr: res.stderr};
}

function makeTempProject(t, {
  ch2Text = null,
  hardConstraints = {mustInclude: ['护心镜'], mustExclude: ['智能手机']},
  outlineExtra = '',
  ledgerExtraFact = null,
} = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'p04-fp-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));

  fs.mkdirSync(path.join(root, 'chapters'), {recursive: true});

  const ch1 = '# 第一章 盐引旧账\n\n' +
    '周衡清点账房柜台上的青铜筹码，确认银钱余额三十二两整，门口青石板在秋雨里泛着微光。\n\n'.repeat(20);
  const defaultCh2 = '# 第二章 寒夜探库\n\n' +
    '周衡将护心镜按在左肋外侧，贴着青砖墙檐缓缓挪步。\n\n' +
    '账册上分明写着九月廿三比原定廿六提前两日交割，连同三副药膏一并入了偏库。\n\n' +
    '冷库木门正上方三米处有一道半尺宽的排风口，寒风顺着木格灌进屋内，灯芯轻轻摇晃。\n\n' +
    '赵有福站在院角，目光掠过半掩的门缝，始终没有开口。\n\n';

  fs.writeFileSync(path.join(root, 'chapters/ch001.md'), ch1, 'utf8');
  fs.writeFileSync(path.join(root, 'chapters/ch002.md'), ch2Text ?? defaultCh2, 'utf8');

  fs.writeFileSync(
    path.join(root, '00-人物档案.md'),
    '# 人物档案\n## 核心人设\n周衡行事谨慎，不具备读心或超自然能力。\n## 动态状态与远期弧线\n第二章潜入偏库查账。\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, '01-大纲.md'),
    '# 大纲\n## 核心契约\n现实向古风推理，严禁出现现代电子设备。\n## 滚动卷纲\n### 第1卷\n#### 第1章\n周衡接手盐引旧账。\n#### 第2章\n周衡携带护心镜夜探偏库，核对九月交割日期与排风口布局。' + outlineExtra + '\n',
    'utf8'
  );
  fs.writeFileSync(
    path.join(root, '03-文风基准.md'),
    '# 文风基准\n## 文风指纹\n冷峻克制，动作链清晰。\n## 本书校准段落\n雨水敲在青瓦上，声音细密。\n',
    'utf8'
  );

  const ledger = {
    schemaVersion: 1,
    facts: [
      {id: 'F-0', chapter: 0, scope: 'global', kind: 'established', subject: '银两换算', key: '制钱比价', value: '一两银折一千文', evidence: '卷首设定'},
      {id: 'F-1', chapter: 1, scope: 'chapter', kind: 'established', subject: '周衡', key: '银钱余额', value: '32两', evidence: '确认银钱余额三十二两整'},
      ...(ledgerExtraFact ? [ledgerExtraFact] : []),
    ],
    foreshadowing: [
      {id: 'P-1', chapter: 1, description: '盐引副簿缺页线索', status: 'open'},
    ],
    relationships: [
      {id: 'R-1', chapter: 1, characters: ['周衡', '赵有福'], change: '初次试探', consequence: '双方各留后手'},
    ],
    mechanisms: [
      {id: 'M-1', chapter: 1, goal: '清点账目', strategy: '对照底簿', opposition: '账目涂改', cost: '暴露查账意图', outcome: '锁定偏库'},
    ],
    handoffs: [
      {
        chapter: 1,
        asOf: '九月廿二夜',
        events: [{when: '戌时', event: '周衡完成首轮账房盘点'}],
        knowledge: [{character: '周衡', change: '发现交割日期存疑'}],
      },
    ],
  };
  fs.writeFileSync(path.join(root, 'story-ledger.json'), JSON.stringify(ledger, null, 2) + '\n', 'utf8');

  const plan = {
    novelName: 'P0-4 指纹测试卷',
    writingMode: 'serial',
    minWordsPerChapter: 500,
    hardConstraints,
    chapters: [
      {chapterNumber: 1, title: '第一章 盐引旧账', filePath: 'chapters/ch001.md', status: 'completed', wordCount: 600, wordCountPass: true, volume: 1},
      {chapterNumber: 2, title: '第二章 寒夜探库', filePath: 'chapters/ch002.md', status: 'draft', volume: 1},
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
  };
  fs.writeFileSync(path.join(root, '02-写作计划.json'), JSON.stringify(plan, null, 2) + '\n', 'utf8');
  return root;
}

function makeValidSlots() {
  return DIMENSION_SLOTS.map(d => ({
    dimension: d,
    checkedAnchor: `已逐段核查维度 ${d} 对应动作、账目与视角边界`,
    status: 'pass',
  }));
}

function makeValidFinalReport(prep, overrides = {}) {
  const resolutions = (prep.needsSemanticAudit || []).map(item => ({
    auditId: item.auditId,
    status: 'pass',
    note: `已独立复核 ${item.auditId}（${item.category}），与上下文一致`,
  }));
  return {
    schemaVersion: R3_FINAL_REPORT_SCHEMA,
    protocolMode: 'two_stage_B',
    reviewFingerprint: prep.reviewFingerprint,
    manuscriptHashes: prep.manuscriptHashes,
    reviewer: {runId: 'rev-run-1', contextId: 'rev-ctx-1', role: 'chapter_review_arbiter'},
    decision: 'pass_candidate',
    dimensionAuditSlots: makeValidSlots(),
    semanticAuditResolutions: resolutions,
    issues: [],
    planningConflictAdvisories: [],
    preserveStrengths: [
      {quote: '周衡将护心镜按在左肋外侧，贴着青砖墙檐缓缓挪步。', reason: '动作克制具体，空间感扎实'},
    ],
    revisionProtection: {strengthsPreserved: true, defensivePatchDetected: false},
    ...overrides,
  };
}

function writeReport(root, name, obj) {
  fs.writeFileSync(path.join(root, name), JSON.stringify(obj, null, 2) + '\n', 'utf8');
  return name;
}

// ============================================================================
// TC-P0-4-1: 规划 / 账本 / 硬约束 / 正文任意 1 字节篡改 -> fingerprint_mismatch (exit code 2, 0 落盘)
// ============================================================================
test('TC-P0-4-1: 1-byte mutation in outline, ledger, hardConstraints, or manuscript triggers fingerprint_mismatch (exit code 2, 0 writes)', t => {
  const cases = [
    {
      name: 'outline 1-byte edit (01-大纲.md)',
      mutate: root => {
        const p = path.join(root, '01-大纲.md');
        fs.writeFileSync(p, fs.readFileSync(p, 'utf8') + '。', 'utf8');
      },
      expectedComponent: 'planningSliceSha256',
    },
    {
      name: 'ledger 1-byte edit (story-ledger.json chapter <= N-1)',
      mutate: root => {
        const p = path.join(root, 'story-ledger.json');
        const l = JSON.parse(fs.readFileSync(p, 'utf8'));
        l.facts[1].value = '33两';
        fs.writeFileSync(p, JSON.stringify(l, null, 2) + '\n', 'utf8');
      },
      expectedComponent: 'ledgerSliceSha256',
    },
    {
      name: 'previous handoff 1-byte edit (story-ledger.json handoffs)',
      mutate: root => {
        const p = path.join(root, 'story-ledger.json');
        const l = JSON.parse(fs.readFileSync(p, 'utf8'));
        l.handoffs[0].asOf = '九月廿二晚';
        fs.writeFileSync(p, JSON.stringify(l, null, 2) + '\n', 'utf8');
      },
      expectedComponent: 'ledgerSliceSha256',
    },
    {
      name: 'hardConstraints 1-byte edit (02-写作计划.json)',
      mutate: root => {
        const p = path.join(root, '02-写作计划.json');
        const plan = JSON.parse(fs.readFileSync(p, 'utf8'));
        plan.hardConstraints.mustExclude.push('手电筒');
        fs.writeFileSync(p, JSON.stringify(plan, null, 2) + '\n', 'utf8');
      },
      expectedComponent: 'hardConstraintsHash',
    },
    {
      name: 'manuscript 1-byte edit (chapters/ch002.md)',
      mutate: root => {
        const p = path.join(root, 'chapters/ch002.md');
        fs.writeFileSync(p, fs.readFileSync(p, 'utf8') + ' ', 'utf8');
      },
      expectedComponent: 'manuscriptSha256',
    },
  ];

  for (const tc of cases) {
    const root = makeTempProject(t);
    const prep = prepareR3Review(root, 2, {writerRunId: 'w-1', writerContextId: 'w-ctx-1'});
    assert.equal(prep.ok, true, `${tc.name}: prepare should pass`);
    assert.equal(prep.revision, 1);

    const reportRel = writeReport(root, 'report-src.json', makeValidFinalReport(prep));

    // Mutate 1 byte AFTER freeze (while manuscript remains untouched for outline/ledger/hardConstraints cases)
    tc.mutate(root);
    const planBefore = fs.readFileSync(path.join(root, '02-写作计划.json'), 'utf8');
    const committedReportPath = path.join(root, 'reviews/r3/review-v3/report-ch002-v1.json');

    const cli = runKernelCli(root, 'apply-review', '--chapter', '2', '--report', reportRel);
    assert.equal(cli.status, 2, `${tc.name}: CLI MUST exit code 2`);
    assert.equal(cli.json.ok, false);
    assert.ok(
      cli.json.errors.some(e => e.code === 'fingerprint_mismatch'),
      `${tc.name}: expected fingerprint_mismatch, got ${JSON.stringify(cli.json.errors)}`
    );
    const fpErr = cli.json.errors.find(e => e.code === 'fingerprint_mismatch' && Array.isArray(e.changedParts));
    assert.ok(fpErr && fpErr.changedParts.includes(tc.expectedComponent), `${tc.name}: expected changedParts to include ${tc.expectedComponent}`);

    // Strictly 0 disk writes on rejection
    assert.equal(fs.existsSync(committedReportPath), false, `${tc.name}: rejected report MUST NOT be written`);
    assert.equal(fs.readFileSync(path.join(root, '02-写作计划.json'), 'utf8'), planBefore, `${tc.name}: plan MUST stay untouched`);
  }

  // Also verify canonicalJson stability + future chapter (>= N) ledger entries do NOT pollute chapter N's ledgerSliceSha256
  const rootIso = makeTempProject(t);
  const fpBefore = computeReviewFingerprint(rootIso, 2);
  assert.equal(fpBefore.components.protocolVersion, R3_REVIEW_PROTOCOL_VERSION);
  assert.equal(canonicalJson({b: 1, a: 2}), canonicalJson({a: 2, b: 1}));
  const lp = path.join(rootIso, 'story-ledger.json');
  const l = JSON.parse(fs.readFileSync(lp, 'utf8'));
  l.facts.push({id: 'F-future', chapter: 2, scope: 'chapter', kind: 'established', subject: '未来', key: 'k', value: 'v', evidence: 'e'});
  fs.writeFileSync(lp, JSON.stringify(l, null, 2) + '\n', 'utf8');
  const fpAfterFuture = computeReviewFingerprint(rootIso, 2);
  assert.equal(fpAfterFuture.reviewFingerprint, fpBefore.reviewFingerprint, 'Ledger entries for chapter >= N must not alter N-1 ledgerSliceSha256');
});

// ============================================================================
// TC-P0-4-2: 漏 6 维 dimensionAuditSlots 或空 checkedAnchor -> 拒收 (exit code 2, 0 落盘)
// ============================================================================
test('TC-P0-4-2: missing dimensionAuditSlots (e.g. HL-6) or empty checkedAnchor is rejected with exit code 2', t => {
  const root = makeTempProject(t);
  const prep = prepareR3Review(root, 2, {writerRunId: 'w-1', writerContextId: 'w-ctx-1'});
  assert.equal(prep.ok, true);
  const planBefore = fs.readFileSync(path.join(root, '02-写作计划.json'), 'utf8');

  // Case 1: Missing HL-6
  const missingHl6 = makeValidFinalReport(prep, {
    dimensionAuditSlots: makeValidSlots().filter(s => s.dimension !== 'HL-6'),
  });
  const r1 = runKernelCli(root, 'apply-review', '--chapter', '2', '--report', writeReport(root, 'r-no-hl6.json', missingHl6));
  assert.equal(r1.status, 2);
  assert.ok(r1.json.errors.some(e => e.code === 'R3_DIMENSION_AUDIT_SLOTS_INCOMPLETE' && e.missingDimensions?.includes('HL-6')));

  // Case 2: Empty / whitespace checkedAnchor on HL-3
  const emptyAnchorSlots = makeValidSlots().map(s => (s.dimension === 'HL-3' ? {...s, checkedAnchor: '   '} : s));
  const emptyAnchor = makeValidFinalReport(prep, {dimensionAuditSlots: emptyAnchorSlots});
  const r2 = runKernelCli(root, 'apply-review', '--chapter', '2', '--report', writeReport(root, 'r-empty-anchor.json', emptyAnchor));
  assert.equal(r2.status, 2);
  assert.ok(r2.json.errors.some(e => e.code === 'R3_DIMENSION_AUDIT_ANCHOR_EMPTY' && e.dimension === 'HL-3'));

  // Case 3: Duplicate dimension slot
  const dupSlots = [...makeValidSlots().slice(0, 5), makeValidSlots()[0]];
  const dupRep = makeValidFinalReport(prep, {dimensionAuditSlots: dupSlots});
  const r3 = runKernelCli(root, 'apply-review', '--chapter', '2', '--report', writeReport(root, 'r-dup-slot.json', dupRep));
  assert.equal(r3.status, 2);
  assert.ok(r3.json.errors.some(e => e.code === 'R3_DIMENSION_AUDIT_SLOT_DUPLICATE'));

  assert.equal(fs.existsSync(path.join(root, 'reviews/r3/review-v3/report-ch002-v1.json')), false);
  assert.equal(fs.readFileSync(path.join(root, '02-写作计划.json'), 'utf8'), planBefore);
});

// ============================================================================
// TC-P0-4-3: 漏核销 NEEDS_SEMANTIC_AUDIT (NSA-001) -> 拒收 (exit code 2, 0 落盘)
// ============================================================================
test('TC-P0-4-3: missing or invalid NEEDS_SEMANTIC_AUDIT resolution is rejected with exit code 2', t => {
  const root = makeTempProject(t);
  const prep = prepareR3Review(root, 2, {writerRunId: 'w-1', writerContextId: 'w-ctx-1'});
  assert.equal(prep.ok, true);
  assert.ok(prep.needsSemanticAudit.length >= 1, 'Fixture ch002 should trigger at least NSA-001 from precheck v2');
  const firstAuditId = prep.needsSemanticAudit[0].auditId;
  assert.equal(firstAuditId, 'NSA-001');
  const planBefore = fs.readFileSync(path.join(root, '02-写作计划.json'), 'utf8');

  // Omit NSA-001
  const omitOne = makeValidFinalReport(prep, {
    semanticAuditResolutions: prep.needsSemanticAudit
      .filter(a => a.auditId !== 'NSA-001')
      .map(a => ({auditId: a.auditId, status: 'pass', note: '已核查'})),
  });
  const r1 = runKernelCli(root, 'apply-review', '--chapter', '2', '--report', writeReport(root, 'r-miss-nsa.json', omitOne));
  assert.equal(r1.status, 2);
  assert.ok(r1.json.errors.some(e => e.code === 'R3_SEMANTIC_AUDIT_UNRESOLVED' && e.unresolvedAuditIds?.includes('NSA-001')));

  // Invalid status on NSA-001
  const badStatus = makeValidFinalReport(prep, {
    semanticAuditResolutions: prep.needsSemanticAudit.map(a => ({
      auditId: a.auditId,
      status: a.auditId === 'NSA-001' ? 'ignored' : 'pass',
      note: '说明',
    })),
  });
  const r2 = runKernelCli(root, 'apply-review', '--chapter', '2', '--report', writeReport(root, 'r-bad-nsa.json', badStatus));
  assert.equal(r2.status, 2);
  assert.ok(r2.json.errors.some(e => e.code === 'R3_SEMANTIC_AUDIT_STATUS_INVALID'));

  assert.equal(fs.existsSync(path.join(root, 'reviews/r3/review-v3/report-ch002-v1.json')), false);
  assert.equal(fs.readFileSync(path.join(root, '02-写作计划.json'), 'utf8'), planBefore);
});

// ============================================================================
// TC-P0-4-4: 伪造 quote (改 1 字不在冻结正文中) -> 拒收 (exit code 2, 0 落盘)
// ============================================================================
test('TC-P0-4-4: fabricated quote (1 character altered) in issue, candidate, or preserveStrengths is rejected with exit code 2', t => {
  const root = makeTempProject(t);
  const prep = prepareR3Review(root, 2, {writerRunId: 'w-1', writerContextId: 'w-ctx-1'});
  assert.equal(prep.ok, true);
  const planBefore = fs.readFileSync(path.join(root, '02-写作计划.json'), 'utf8');

  // 1-char altered quote in issue ("左肋" -> "右肋")
  const badIssueQuote = makeValidFinalReport(prep, {
    decision: 'revise',
    issues: [{
      id: 'ISS-001',
      dimension: 'HL-1',
      severity: 'MAJOR',
      impactScope: 'draft_only',
      blocking: true,
      mustCloseInReReview: true,
      quote: '周衡将护心镜按在右肋外侧，贴着青砖墙檐缓缓挪步。',
      evidence: '测试伪造引文拦截',
      reverseDefense: '即使考虑惯用手切换，原文也应与前文动作一致。',
      narrativeGuidance: '保持握持位置与前文动作连贯。',
    }],
  });
  const r1 = runKernelCli(root, 'apply-review', '--chapter', '2', '--report', writeReport(root, 'r-fake-quote.json', badIssueQuote));
  assert.equal(r1.status, 2);
  assert.ok(r1.json.errors.some(e => e.code === 'R3_QUOTE_NOT_IN_FROZEN_MANUSCRIPT'));

  // 1-char altered quote in preserveStrengths
  const badStrengthQuote = makeValidFinalReport(prep, {
    preserveStrengths: [{quote: '赵有福站在院角，目光掠过全掩的门缝', reason: '测试亮点引文核验'}],
  });
  const r2 = runKernelCli(root, 'apply-review', '--chapter', '2', '--report', writeReport(root, 'r-fake-strength.json', badStrengthQuote));
  assert.equal(r2.status, 2);
  assert.ok(r2.json.errors.some(e => e.code === 'R3_QUOTE_NOT_IN_FROZEN_MANUSCRIPT'));

  // 1-char altered quote in Pass1DiscoveryReport candidate
  const badDiscovery = {
    schemaVersion: R3_DISCOVERY_REPORT_SCHEMA,
    protocolMode: 'two_stage_B',
    reviewFingerprint: prep.reviewFingerprint,
    reviewer: {runId: 'disc-1', contextId: 'disc-ctx-1', role: 'chapter_discovery_auditor'},
    dimensionAuditSlots: makeValidSlots(),
    semanticAuditResolutions: prep.needsSemanticAudit.map(a => ({auditId: a.auditId, status: 'pass', note: '已核查'})),
    candidates: [{
      candidateId: 'CAND-01',
      dimension: 'HL-6',
      quote: '冷库木门正上方四米处有一道半尺宽的排风口',
      objectiveContradiction: '高度改为四米伪造测试',
      suspectedImpactScope: 'draft_only',
    }],
  };
  const r3 = runKernelCli(root, 'validate-report', '--chapter', '2', '--report', writeReport(root, 'r-fake-cand.json', badDiscovery));
  assert.equal(r3.status, 2);
  assert.ok(r3.json.errors.some(e => e.code === 'R3_QUOTE_NOT_IN_FROZEN_MANUSCRIPT'));

  assert.equal(fs.existsSync(path.join(root, 'reviews/r3/review-v3/report-ch002-v1.json')), false);
  assert.equal(fs.readFileSync(path.join(root, '02-写作计划.json'), 'utf8'), planBefore);
});

// ============================================================================
// TC-P0-4-5: BLOCKER / MAJOR 缺失 reverseDefense 或 impactScope -> 拒收 (exit code 2, 0 落盘)
// ============================================================================
test('TC-P0-4-5: BLOCKER/MAJOR missing reverseDefense or valid impactScope is rejected with exit code 2', t => {
  const root = makeTempProject(t);
  const prep = prepareR3Review(root, 2, {writerRunId: 'w-1', writerContextId: 'w-ctx-1'});
  assert.equal(prep.ok, true);
  const planBefore = fs.readFileSync(path.join(root, '02-写作计划.json'), 'utf8');

  const validQuote = '冷库木门正上方三米处有一道半尺宽的排风口，寒风顺着木格灌进屋内，灯芯轻轻摇晃。';

  // Case 1: BLOCKER missing reverseDefense
  const noReverseDef = makeValidFinalReport(prep, {
    decision: 'revise',
    issues: [{
      id: 'ISS-B1',
      dimension: 'HL-6',
      severity: 'BLOCKER',
      impactScope: 'draft_only',
      blocking: true,
      mustCloseInReReview: true,
      quote: validQuote,
      evidence: '排风口空间高度与后续攀爬动作冲突',
    }],
  });
  const r1 = runKernelCli(root, 'apply-review', '--chapter', '2', '--report', writeReport(root, 'r-no-rd.json', noReverseDef));
  assert.equal(r1.status, 2);
  assert.ok(r1.json.errors.some(e => e.code === 'R3_MISSING_REVERSE_DEFENSE'));

  // Case 2: MAJOR missing impactScope
  const noImpactScope = makeValidFinalReport(prep, {
    decision: 'revise',
    issues: [{
      id: 'ISS-M1',
      dimension: 'HL-2',
      severity: 'MAJOR',
      blocking: true,
      mustCloseInReReview: true,
      quote: validQuote,
      evidence: '日期差与账册记录不符',
      reverseDefense: '即使考虑历法口语约数，原文明确写了廿三与廿六，差值仍为三日。',
    }],
  });
  const r2 = runKernelCli(root, 'apply-review', '--chapter', '2', '--report', writeReport(root, 'r-no-scope.json', noImpactScope));
  assert.equal(r2.status, 2);
  assert.ok(r2.json.errors.some(e => e.code === 'R3_INVALID_IMPACT_SCOPE'));

  // Case 3: MAJOR with invalid impactScope
  const badImpactScope = makeValidFinalReport(prep, {
    decision: 'revise',
    issues: [{
      id: 'ISS-M2',
      dimension: 'HL-2',
      severity: 'MAJOR',
      impactScope: 'unknown_scope',
      blocking: true,
      mustCloseInReReview: true,
      quote: validQuote,
      evidence: '测试非法 impactScope',
      reverseDefense: '反向辩护说明。',
    }],
  });
  const r3 = runKernelCli(root, 'apply-review', '--chapter', '2', '--report', writeReport(root, 'r-bad-scope.json', badImpactScope));
  assert.equal(r3.status, 2);
  assert.ok(r3.json.errors.some(e => e.code === 'R3_INVALID_IMPACT_SCOPE'));

  // Case 4: upstream_planning BLOCKER whitewashed as 'revise' instead of 'PLANNING_CONFLICT_BLOCK' -> rejected (OR6)
  const whitewashedConflict = makeValidFinalReport(prep, {
    decision: 'revise',
    issues: [{
      id: 'ISS-OR6',
      dimension: 'HL-6',
      severity: 'BLOCKER',
      impactScope: 'upstream_planning',
      blocking: true,
      mustCloseInReReview: true,
      quote: validQuote,
      evidence: '大纲自身空间尺寸死锁',
      reverseDefense: '正文完全按大纲落笔，冲突源于大纲本身。',
    }],
  });
  const r4 = runKernelCli(root, 'apply-review', '--chapter', '2', '--report', writeReport(root, 'r-or6.json', whitewashedConflict));
  assert.equal(r4.status, 2);
  assert.ok(r4.json.errors.some(e => e.code === 'R3_PLANNING_CONFLICT_MUST_BLOCK'));

  assert.equal(fs.existsSync(path.join(root, 'reviews/r3/review-v3/report-ch002-v1.json')), false);
  assert.equal(fs.readFileSync(path.join(root, '02-写作计划.json'), 'utf8'), planBefore);
});

// ============================================================================
// TC-P0-4-6: 连续 3 次 --dry-run + 2 次 hardErrors 预检失败后首次正式送审 -> revision 严格为 v1 (空增 = 0)
// ============================================================================
test('TC-P0-4-6: 3 dry-runs + 2 precheck hardErrors failures produce 0 empty revision increments; first valid freeze is strictly v1', t => {
  // Start with a draft violating author hardConstraint (contains forbidden '智能手机' & lacks '护心镜')
  const badDraft = '# 第二章 寒夜探库\n\n周衡掏出智能手机照亮冷库门缝。\n';
  const root = makeTempProject(t, {ch2Text: badDraft});
  const planInitial = fs.readFileSync(path.join(root, '02-写作计划.json'), 'utf8');

  // 3 consecutive --dry-run calls
  for (let i = 0; i < 3; i++) {
    const dry = runKernelCli(root, 'prepare', '--chapter', '2', '--dry-run');
    assert.equal(dry.status, 2, 'Dry-run on violating draft exits 2 but writes nothing');
    assert.equal(dry.json.revisionAllocated, false);
    assert.equal(dry.json.currentRevision, 0);
  }

  // 2 consecutive real prepare calls hitting hardErrors (hardConstraints violation)
  for (let i = 0; i < 2; i++) {
    const blocked = runKernelCli(
      root,
      'prepare',
      '--chapter', '2',
      '--writer-run-id', 'w-1',
      '--writer-context-id', 'w-ctx-1'
    );
    assert.equal(blocked.status, 2);
    assert.equal(blocked.json.error, 'R3_PRECHECK_BLOCKED');
    assert.equal(blocked.json.revisionAllocated, false);
    assert.equal(blocked.json.currentRevision, 0);
  }

  // Confirm ZERO disk mutations & ZERO revision bump during all 5 pre-submission attempts
  assert.equal(fs.readFileSync(path.join(root, '02-写作计划.json'), 'utf8'), planInitial);
  assert.equal(fs.existsSync(path.join(root, 'reviews/r3/review-v3')), false);

  // Writer fixes manuscript so precheck passes; test 1 clean --dry-run (still 0 revision allocated!)
  const fixedDraft =
    '# 第二章 寒夜探库\n\n' +
    '周衡将护心镜按在左肋外侧，贴着青砖墙檐缓缓挪步。\n\n' +
    '账册上写着九月廿三比原定廿六提前两日交割，灯芯微晃。\n';
  fs.writeFileSync(path.join(root, 'chapters/ch002.md'), fixedDraft, 'utf8');

  const dryOk = runKernelCli(root, 'prepare', '--chapter', '2', '--dry-run');
  assert.equal(dryOk.status, 0);
  assert.equal(dryOk.json.revisionAllocated, false);
  assert.equal(dryOk.json.currentRevision, 0);
  assert.equal(fs.existsSync(path.join(root, 'reviews/r3/review-v3')), false);

  // First real prepare after passing precheck -> strictly revision v1!
  const firstFreeze = runKernelCli(
    root,
    'prepare',
    '--chapter', '2',
    '--writer-run-id', 'w-1',
    '--writer-context-id', 'w-ctx-1'
  );
  assert.equal(firstFreeze.status, 0);
  assert.equal(firstFreeze.json.revision, 1, 'First valid freeze MUST be strictly v1 (0 empty revision increments)');
  assert.equal(firstFreeze.json.revisionAllocated, true);
  assert.equal(firstFreeze.json.effectiveReviewSubmissions, 0);

  // Re-running prepare on identical frozen fingerprint reuses v1 without burning v2
  const idempotent = runKernelCli(
    root,
    'prepare',
    '--chapter', '2',
    '--writer-run-id', 'w-1',
    '--writer-context-id', 'w-ctx-1'
  );
  assert.equal(idempotent.status, 0);
  assert.equal(idempotent.json.revision, 1);
  assert.equal(idempotent.json.reused, true);
  assert.equal(idempotent.json.revisionAllocated, false);

  // Submit valid report -> effectiveReviewSubmissions increments from 0 to 1
  const validRep = makeValidFinalReport(firstFreeze.json, {
    preserveStrengths: [{quote: '周衡将护心镜按在左肋外侧，贴着青砖墙檐缓缓挪步。', reason: '动作克制'}],
  });
  const applied = runKernelCli(root, 'apply-review', '--chapter', '2', '--report', writeReport(root, 'r-ok.json', validRep));
  assert.equal(applied.status, 0);
  assert.equal(applied.json.revision, 1);
  assert.equal(applied.json.effectiveReviewSubmissions, 1);
  assert.equal(applied.json.status, 'passed');
});

// ============================================================================
// TC-P0-4-7: 合法报告全路径（含 SUGGESTION 非阻断、Pass1DiscoveryReport、PLANNING_CONFLICT_BLOCK）、
//            指纹计算 < 30ms 及 R2 旧哈希/命名空间完全隔离
// ============================================================================
test('TC-P0-4-7: valid reports (pass + SUGGESTION, PLANNING_CONFLICT_BLOCK, Pass1DiscoveryReport), <30ms fingerprint latency, and R2 isolation', t => {
  const root = makeTempProject(t);

  // 1. Fingerprint computation latency (< 30ms per chapter)
  const timings = [];
  for (let i = 0; i < 5; i++) {
    const t0 = performance.now();
    const fp = computeReviewFingerprint(root, 2);
    timings.push(performance.now() - t0);
    assert.match(fp.reviewFingerprint, /^[a-f0-9]{64}$/);
  }
  const minMs = Math.min(...timings);
  const avgMs = timings.reduce((a, b) => a + b, 0) / timings.length;
  assert.ok(avgMs < 30, `Expected avg fingerprint latency < 30ms, got avg=${avgMs.toFixed(2)}ms (min=${minMs.toFixed(2)}ms)`);

  // 2. Freeze v1, validate Pass1DiscoveryReport, verify self-review rejection, then apply valid pass_candidate with SUGGESTION
  const prep = prepareR3Review(root, 2, {writerRunId: 'w-1', writerContextId: 'w-ctx-1'});
  assert.equal(prep.ok, true);

  const discovery = {
    schemaVersion: R3_DISCOVERY_REPORT_SCHEMA,
    protocolMode: 'two_stage_B',
    reviewFingerprint: prep.reviewFingerprint,
    reviewer: {runId: 'disc-1', contextId: 'disc-ctx-1', role: 'chapter_discovery_auditor'},
    dimensionAuditSlots: makeValidSlots(),
    semanticAuditResolutions: prep.needsSemanticAudit.map(a => ({auditId: a.auditId, status: 'pass', note: '已核查'})),
    candidates: [{
      candidateId: 'CAND-01',
      dimension: 'HL-6',
      quote: '冷库木门正上方三米处有一道半尺宽的排风口，寒风顺着木格灌进屋内，灯芯轻轻摇晃。',
      objectiveContradiction: '检查三米高度与后续动作匹配性',
      suspectedImpactScope: 'draft_only',
    }],
  };
  const discRes = validateR3ReviewReport(root, 2, discovery, {allowDiscovery: true});
  assert.equal(discRes.ok, true, `Valid Pass1DiscoveryReport should pass, got: ${JSON.stringify(discRes.errors)}`);

  // Anti-self-review check
  const selfRep = makeValidFinalReport(prep, {
    reviewer: {runId: 'w-1', contextId: 'rev-ctx-9', role: 'chapter_review_arbiter'},
  });
  const selfRes = validateR3ReviewReport(root, 2, selfRep);
  assert.equal(selfRes.ok, false);
  assert.ok(selfRes.errors.some(e => e.code === 'R3_REVIEW_SELF_REVIEW'));

  // SUGGESTION with blocking=true must be rejected; SUGGESTION with blocking=false passes with pass_candidate
  const badSug = makeValidFinalReport(prep, {
    issues: [{
      id: 'ISS-S1',
      dimension: 'HL-4',
      severity: 'SUGGESTION',
      blocking: true,
      quote: '赵有福站在院角，目光掠过半掩的门缝，始终没有开口。',
      evidence: '可选润色建议',
    }],
  });
  assert.equal(validateR3ReviewReport(root, 2, badSug).ok, false);

  const goodSugPass = makeValidFinalReport(prep, {
    decision: 'pass_candidate',
    issues: [{
      id: 'ISS-S1',
      dimension: 'HL-4',
      severity: 'SUGGESTION',
      blocking: false,
      mustCloseInReReview: false,
      quote: '赵有福站在院角，目光掠过半掩的门缝，始终没有开口。',
      evidence: '可微调停顿节奏增强压迫感',
    }],
  });
  const applied = applyR3Review(root, 2, writeReport(root, 'r-good-sug.json', goodSugPass));
  assert.equal(applied.ok, true, `Valid report with non-blocking SUGGESTION should apply, got: ${JSON.stringify(applied.errors)}`);
  assert.equal(applied.status, 'passed');

  // 3. Verify PLANNING_CONFLICT_BLOCK applies cleanly when impactScope is upstream_planning
  const rootConflict = makeTempProject(t);
  const prepC = prepareR3Review(rootConflict, 2, {writerRunId: 'w-1', writerContextId: 'w-ctx-1'});
  const conflictRep = makeValidFinalReport(prepC, {
    decision: 'PLANNING_CONFLICT_BLOCK',
    issues: [{
      id: 'ISS-PCB',
      dimension: 'HL-6',
      severity: 'BLOCKER',
      impactScope: 'upstream_planning',
      blocking: true,
      mustCloseInReReview: true,
      quote: '冷库木门正上方三米处有一道半尺宽的排风口，寒风顺着木格灌进屋内，灯芯轻轻摇晃。',
      evidence: '大纲设定墙高与排风道方向死锁',
      reverseDefense: '正文严格遵守冻结大纲，确系大纲层几何矛盾。',
    }],
  });
  const appliedC = applyR3Review(rootConflict, 2, writeReport(rootConflict, 'r-pcb.json', conflictRep));
  assert.equal(appliedC.ok, true);
  assert.equal(appliedC.status, 'planning_conflict_block');

  // 4. Verify v3.r2 legacy namespace was NEVER mutated by r3_review_kernel and legacy r2_review.mjs still works cleanly
  const planAfter = JSON.parse(fs.readFileSync(path.join(root, '02-写作计划.json'), 'utf8'));
  assert.deepEqual(planAfter.v3.r2, {schemaVersion: 1, chapterReviews: {}, arcReviews: {}});
  const r2Prep = spawnSync(
    process.execPath,
    [R2_CLI_PATH, root, 'prepare', '--scope', 'chapter', '--end', '1', '--writer-run-id', 'w-r2', '--writer-context-id', 'wc-r2'],
    {encoding: 'utf8'}
  );
  assert.equal(r2Prep.status, 0, `Legacy r2_review.mjs must remain 100% compatible: ${r2Prep.stdout} ${r2Prep.stderr}`);
});
