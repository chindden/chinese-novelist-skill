#!/usr/bin/env node
/**
 * P0-5: Fair Side-by-Side A / B / C Review Prototype Orchestrator.
 *
 * ISOLATED PROTOTYPE MODULE — does NOT replace production review templates or R2 workflows,
 * and does NOT presuppose any winner among Scheme A, Scheme B, or Scheme C.
 *
 * All three schemes share the EXACT SAME foundation:
 *   1. `precheck v2` (`P0-3`) + `NEEDS_SEMANTIC_AUDIT` clues
 *   2. Five-tuple `reviewFingerprint` + P0-4 `buildPlanningSlice()` + Fail-Closed validation (`P0-4`)
 *   3. Mandatory 6-dimension `dimensionAuditSlots` (`HL-1`–`HL-6`)
 *   4. `impactScope` hard interception & `OR6` `PLANNING_CONFLICT_BLOCK` router (`impact_scope_router.mjs`)
 *   5. Strict two-stage reviewer independence (B1), locked +-300-char paragraph-anchored windows (B3),
 *      Pass 1 -> Pass 2 evidence preservation (B4), and Stage 1 -> Stage 2 non-blocking retention (B5).
 */
import {
  R3_DISCOVERY_REPORT_SCHEMA,
  R3_FINAL_REPORT_SCHEMA,
  canonicalJson,
  validateR3ReviewReport,
} from '../r3_review_kernel.mjs';
import {
  CONTEXT_WINDOW_RADIUS_CHARS,
  deepClone,
  deepFreeze,
  loadPrototypeTemplate,
  compileSharedReviewBasePack,
  verifyPlanningSliceMatchesFingerprint,
  buildSchemeBPass2Input,
  shouldTriggerSchemeCStage2,
  buildSchemeCStage2Input,
} from './review_pack_compiler.mjs';
import {routeFinalReviewReport} from './impact_scope_router.mjs';

const isPlainObject = x => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
const isNonEmptyString = x => typeof x === 'string' && x.trim().length > 0;
const ALLOWED_CARRIED_DISPOSITIONS = Object.freeze(['kept', 'superseded', 'dismissed']);

function buildFullStageInput(scheme, stage, protocolMode, templateKey, basePack) {
  const template = loadPrototypeTemplate(templateKey);
  return {
    scheme,
    stage,
    protocolMode,
    templatePath: template.relativePath,
    fullManuscriptInjected: true,
    chapter: basePack.chapter,
    revision: basePack.revision,
    reviewFingerprint: basePack.reviewFingerprint,
    manuscriptHashes: deepClone(basePack.manuscriptHashes),
    manuscriptPath: basePack.manuscriptPath,
    manuscriptText: basePack.manuscriptText,
    planningCoreSlice: deepClone(basePack.planningCoreSlice),
    hardConstraints: deepClone(basePack.hardConstraints),
    ledgerSlice: deepClone(basePack.ledgerSlice),
    needsSemanticAudit: deepClone(basePack.needsSemanticAudit),
  };
}

function checkSharedBasePackIntegrity(shared) {
  const expectedSha = shared?.fingerprintComponents?.planningSliceSha256;
  if (!expectedSha) return null;
  const check = verifyPlanningSliceMatchesFingerprint(shared.planningCoreSlice, expectedSha);
  if (!check.ok) {
    return {
      code: 'R3_PLANNING_SLICE_HASH_MISMATCH',
      message: `共享底座 planningCoreSlice 哈希与五元组 planningSliceSha256 不一致（expected=${check.expectedSha256}, actual=${check.actualSha256}）。`,
      expectedPlanningSliceSha256: check.expectedSha256,
      actualPlanningSliceSha256: check.actualSha256,
    };
  }
  return null;
}

function assertExpectedProtocolMode(report, expectedMode) {
  if (report?.protocolMode !== expectedMode) {
    return {
      code: 'R3_PROTOTYPE_PROTOCOL_MODE_MISMATCH',
      message: `方案协议模式不匹配：期望 ${expectedMode}，实际为 ${String(report?.protocolMode)}。`,
    };
  }
  return null;
}

/**
 * B1: Enforce two-stage reviewer identity independence AND honestly record proof level:
 *  - When host runtime supplies `runtimeStageContexts: {stage1: {runId, contextId}, stage2: {runId, contextId}}`:
 *    cross-checks that both report identities match the host-injected independent runtime contexts
 *    (`proofLevel: 'runtime_metadata_cross_checked'`), failing closed on spoofing/mismatch.
 *  - When no host runtime metadata is supplied (offline prototype/mock runs):
 *    still fails closed if `runId` or `contextId` are reused, and explicitly marks
 *    `proofLevel: 'protocol_metadata_only_unverified_runtime'` so protocol metadata is never
 *    misrepresented as verified physical multi-agent session isolation.
 */
function checkStage2ReviewerIndependence(
  stage1Reviewer,
  stage2Reviewer,
  stage1Label,
  stage2Label,
  runtimeStageContexts = null
) {
  const r1 = stage1Reviewer;
  const r2 = stage2Reviewer;
  if (!isPlainObject(r1) || !isPlainObject(r2)) {
    return {
      errors: [],
      verification: {
        independent: false,
        proofLevel: 'invalid_reviewer_metadata',
        runtimeInjected: false,
        note: '缺少有效的 reviewer 元数据，无法验证上下文独立性。',
      },
    };
  }

  const errs = [];
  if (r1.runId === r2.runId || r1.contextId === r2.contextId) {
    errs.push({
      code: 'R3_STAGE2_CONTEXT_NOT_INDEPENDENT',
      message: `${stage2Label} 必须使用独立审稿上下文，不得与 ${stage1Label} 复用相同 runId 或 contextId。`,
      stage1Reviewer: {runId: r1.runId, contextId: r1.contextId},
      stage2Reviewer: {runId: r2.runId, contextId: r2.contextId},
    });
  }

  if (runtimeStageContexts !== null && runtimeStageContexts !== undefined) {
    const rt1 = runtimeStageContexts?.stage1;
    const rt2 = runtimeStageContexts?.stage2;
    const rtValid =
      isPlainObject(rt1) &&
      isPlainObject(rt2) &&
      isNonEmptyString(rt1.runId) &&
      isNonEmptyString(rt1.contextId) &&
      isNonEmptyString(rt2.runId) &&
      isNonEmptyString(rt2.contextId);
    if (!rtValid || rt1.runId === rt2.runId || rt1.contextId === rt2.contextId) {
      errs.push({
        code: 'R3_STAGE2_CONTEXT_NOT_INDEPENDENT',
        message: `宿主运行时注入的 ${stage1Label}/${stage2Label} 上下文元数据缺失或未隔离。`,
      });
    } else {
      if (r1.runId !== rt1.runId || r1.contextId !== rt1.contextId) {
        errs.push({
          code: 'R3_STAGE_REVIEWER_RUNTIME_MISMATCH',
          stage: stage1Label,
          message: `${stage1Label} 报告中的 reviewer 身份与宿主运行时注入的上下文不一致，禁止模型自行伪造身份。`,
          expected: {runId: rt1.runId, contextId: rt1.contextId},
          actual: {runId: r1.runId, contextId: r1.contextId},
        });
      }
      if (r2.runId !== rt2.runId || r2.contextId !== rt2.contextId) {
        errs.push({
          code: 'R3_STAGE_REVIEWER_RUNTIME_MISMATCH',
          stage: stage2Label,
          message: `${stage2Label} 报告中的 reviewer 身份与宿主运行时注入的上下文不一致，禁止模型自行伪造身份。`,
          expected: {runId: rt2.runId, contextId: rt2.contextId},
          actual: {runId: r2.runId, contextId: r2.contextId},
        });
      }
    }
    return {
      errors: errs,
      verification: {
        independent: errs.length === 0,
        proofLevel: errs.length === 0 ? 'runtime_metadata_cross_checked' : 'runtime_cross_check_failed',
        runtimeInjected: true,
        note:
          errs.length === 0
            ? '已交叉核验两阶段报告身份与宿主运行时注入的独立上下文元数据一致。'
            : '两阶段报告身份与宿主运行时上下文核验未通过。',
      },
    };
  }

  return {
    errors: errs,
    verification: {
      independent: errs.length === 0,
      proofLevel: errs.length === 0 ? 'protocol_metadata_only_unverified_runtime' : 'protocol_metadata_conflict',
      runtimeInjected: false,
      note:
        errs.length === 0
          ? '协议元数据不同，真实 Agent/会话上下文独立性未验证（未提供宿主可信运行时上下文元数据）。'
          : '两阶段报告复用了相同的 runId 或 contextId。',
    },
  };
}

/**
 * B4: Verify Scheme B Pass 2 preserves Pass 1's 6-dim `dimensionAuditSlots` and `semanticAuditResolutions`
 * VERBATIM against the immutable `pass1EvidenceSnapshot` using full canonical deep equality.
 * Pass 2 may attach supplemental commentary in a separate top-level field (e.g., `calibrationAuditNotes`),
 * never mutating any field (top-level or nested) of Pass 1's evidence objects.
 */
function checkSchemeBPass1EvidencePreserved(pass1Snapshot, finalReport) {
  const errs = [];
  const p1SlotsArr = Array.isArray(pass1Snapshot?.dimensionAuditSlots) ? pass1Snapshot.dimensionAuditSlots : [];
  const p2SlotsArr = Array.isArray(finalReport?.dimensionAuditSlots) ? finalReport.dimensionAuditSlots : [];

  if (p2SlotsArr.length !== p1SlotsArr.length) {
    errs.push({
      code: 'R3_SCHEME_B_PASS1_SLOTS_ALTERED',
      message: `方案 B Pass 2 改变了 Pass 1 取证槽数量（期望 ${p1SlotsArr.length}，实际 ${p2SlotsArr.length}）。`,
    });
  }
  const p1Slots = new Map(p1SlotsArr.map(s => [s.dimension, s]));
  const p2Slots = new Map(p2SlotsArr.filter(isPlainObject).map(s => [s.dimension, s]));
  for (const [dim, s1] of p1Slots.entries()) {
    const s2 = p2Slots.get(dim);
    if (!s2 || canonicalJson(s2) !== canonicalJson(s1)) {
      errs.push({
        code: 'R3_SCHEME_B_PASS1_SLOTS_ALTERED',
        dimension: dim,
        message: `方案 B Pass 2 篡改或未完整 verbatim 保留 Pass 1 维度 ${dim} 的取证记录。`,
      });
    }
  }

  const p1NsaArr = Array.isArray(pass1Snapshot?.semanticAuditResolutions) ? pass1Snapshot.semanticAuditResolutions : [];
  const p2NsaArr = Array.isArray(finalReport?.semanticAuditResolutions) ? finalReport.semanticAuditResolutions : [];
  if (p2NsaArr.length !== p1NsaArr.length) {
    errs.push({
      code: 'R3_SCHEME_B_PASS1_NSA_ALTERED',
      message: `方案 B Pass 2 改变了 Pass 1 NSA 核销记录数量（期望 ${p1NsaArr.length}，实际 ${p2NsaArr.length}）。`,
    });
  }
  const p1Nsa = new Map(p1NsaArr.map(r => [r.auditId, r]));
  const p2Nsa = new Map(p2NsaArr.filter(isPlainObject).map(r => [r.auditId, r]));
  for (const [aid, n1] of p1Nsa.entries()) {
    const n2 = p2Nsa.get(aid);
    if (!n2 || canonicalJson(n2) !== canonicalJson(n1)) {
      errs.push({
        code: 'R3_SCHEME_B_PASS1_NSA_ALTERED',
        auditId: aid,
        message: `方案 B Pass 2 篡改了 Pass 1 对 ${aid} 的原始核销记录（须完整 verbatim 保留；补充说明请写入独立字段）。`,
      });
    }
  }
  return errs;
}

/**
 * B5: Verify Scheme C Stage 2 retains every Stage 1 MINOR/SUGGESTION issue VERBATIM against the immutable
 * `stage1EvidenceSnapshot` (full canonical deep equality), or provides an explicit auditable disposition.
 */
function checkSchemeCNonBlockingRetention(stage1Snapshot, finalReport) {
  const carried = Array.isArray(stage1Snapshot?.nonBlockingIssuesCarried)
    ? stage1Snapshot.nonBlockingIssuesCarried
    : [];
  if (carried.length === 0) return [];

  const finalById = new Map((finalReport?.issues || []).filter(isPlainObject).map(i => [i.id, i]));
  const dispositions = Array.isArray(finalReport?.carriedIssueDispositions)
    ? finalReport.carriedIssueDispositions
    : [];
  const dispById = new Map(dispositions.filter(isPlainObject).map(d => [d.id, d]));

  const errs = [];
  for (const orig of carried) {
    const retained = finalById.get(orig.id);
    const retainedVerbatim = Boolean(retained) && canonicalJson(retained) === canonicalJson(orig);
    if (retainedVerbatim) {
      continue;
    }
    const disp = dispById.get(orig.id);
    if (disp && ALLOWED_CARRIED_DISPOSITIONS.includes(disp.disposition) && isNonEmptyString(disp.note)) {
      if (disp.disposition === 'kept') {
        errs.push({
          code: 'R3_SCHEME_C_DROPPED_STAGE1_NONBLOCKING',
          issueId: orig.id,
          message: `方案 C Stage 2 对 ${orig.id} 声明 disposition="kept"，但未在最终 issues 中完整 verbatim 保留该原始条目。`,
        });
      }
      continue;
    }
    errs.push({
      code: 'R3_SCHEME_C_DROPPED_STAGE1_NONBLOCKING',
      issueId: orig.id,
      severity: orig.severity,
      message: `方案 C Stage 2 静默丢弃或篡改了 Stage 1 的非阻断条目 ${orig.id}（${orig.severity}），必须完整 verbatim 保留或在 carriedIssueDispositions 中给出明确处置。`,
    });
  }
  return errs;
}

/**
 * Scheme A (Control): Enhanced Single-Stage Complete Review -> FinalCalibrationReport.
 */
export async function runSchemeA(
  projectDir,
  chapterNumber,
  adapter,
  {basePack = null, compileWriterCard = false} = {}
) {
  if (typeof adapter?.runSingleStage !== 'function') {
    throw new Error('R3_SCHEME_A_ADAPTER_REQUIRED');
  }
  const shared = basePack ?? compileSharedReviewBasePack(projectDir, chapterNumber);
  if (!shared.ok) {
    return {ok: false, exitCode: 2, scheme: 'A', stage: 'compile_base_pack', error: shared.error, shared};
  }
  const packErr = checkSharedBasePackIntegrity(shared);
  if (packErr) {
    return {
      ok: false,
      exitCode: 2,
      scheme: 'A',
      protocolMode: 'single_stage_A',
      stage: 'base_pack_integrity',
      calls: {stage1: 0, stage2: 0, total: 0},
      reviewFingerprint: shared.reviewFingerprint,
      errors: [packErr],
    };
  }

  const stage1Input = buildFullStageInput('A', 'single_stage', 'single_stage_A', 'A', shared);
  const finalReport = await adapter.runSingleStage(stage1Input);
  const validation = validateR3ReviewReport(shared.projectRoot, chapterNumber, finalReport, {allowDiscovery: false});
  const modeErr = assertExpectedProtocolMode(finalReport, 'single_stage_A');
  const errors = [...validation.errors, ...(modeErr ? [modeErr] : [])];

  if (errors.length > 0) {
    return {
      ok: false,
      exitCode: 2,
      scheme: 'A',
      protocolMode: 'single_stage_A',
      stage: 'single_stage_validation',
      calls: {stage1: 1, stage2: 0, total: 1},
      reviewFingerprint: shared.reviewFingerprint,
      errors,
    };
  }

  const routing = routeFinalReviewReport(finalReport, {compileWriterCard, chapterNumber});
  if (!routing.ok) {
    return {
      ok: false,
      exitCode: 2,
      scheme: 'A',
      protocolMode: 'single_stage_A',
      stage: 'impact_scope_routing',
      calls: {stage1: 1, stage2: 0, total: 1},
      reviewFingerprint: shared.reviewFingerprint,
      errors: [{code: routing.error, message: routing.message}],
      routing,
    };
  }

  return {
    ok: true,
    exitCode: 0,
    scheme: 'A',
    protocolMode: 'single_stage_A',
    calls: {stage1: 1, stage2: 0, total: 1},
    reviewFingerprint: shared.reviewFingerprint,
    stage1Input,
    finalValidation: validation,
    routing,
    finalReport,
  };
}

/**
 * Scheme B (Two-Stage): Pass 1 Open High-Recall Discovery -> Pass 2 Independent Lightweight Calibration.
 */
export async function runSchemeB(
  projectDir,
  chapterNumber,
  adapter,
  {basePack = null, radius = CONTEXT_WINDOW_RADIUS_CHARS, compileWriterCard = false, runtimeStageContexts = null} = {}
) {
  if (typeof adapter?.runPass1Discovery !== 'function' || typeof adapter?.runPass2Calibration !== 'function') {
    throw new Error('R3_SCHEME_B_ADAPTER_REQUIRED');
  }
  const shared = basePack ?? compileSharedReviewBasePack(projectDir, chapterNumber);
  if (!shared.ok) {
    return {ok: false, exitCode: 2, scheme: 'B', stage: 'compile_base_pack', error: shared.error, shared};
  }
  const packErr = checkSharedBasePackIntegrity(shared);
  if (packErr) {
    return {
      ok: false,
      exitCode: 2,
      scheme: 'B',
      protocolMode: 'two_stage_B',
      stage: 'base_pack_integrity',
      calls: {pass1: 0, pass2: 0, total: 0},
      reviewFingerprint: shared.reviewFingerprint,
      errors: [packErr],
    };
  }

  // Pass 1: High-recall open discovery (no OR1-OR7 suppression)
  const pass1Input = buildFullStageInput('B', 'pass1_discovery', 'two_stage_B', 'B_PASS1', shared);
  const pass1Report = await adapter.runPass1Discovery(pass1Input);

  const pass1Validation = validateR3ReviewReport(shared.projectRoot, chapterNumber, pass1Report, {allowDiscovery: true});
  const pass1ExtraErrors = [];
  if (pass1Report?.schemaVersion !== R3_DISCOVERY_REPORT_SCHEMA) {
    pass1ExtraErrors.push({
      code: 'R3_SCHEME_B_PASS1_SCHEMA_REQUIRED',
      message: `方案 B Pass 1 必须产出 ${R3_DISCOVERY_REPORT_SCHEMA}。`,
    });
  }
  const pass1ModeErr = assertExpectedProtocolMode(pass1Report, 'two_stage_B');
  if (pass1ModeErr) pass1ExtraErrors.push(pass1ModeErr);

  const pass1Errors = [...pass1Validation.errors, ...pass1ExtraErrors];
  if (pass1Errors.length > 0) {
    return {
      ok: false,
      exitCode: 2,
      scheme: 'B',
      protocolMode: 'two_stage_B',
      stage: 'pass1_discovery_validation',
      calls: {pass1: 1, pass2: 0, total: 1},
      reviewFingerprint: shared.reviewFingerprint,
      errors: pass1Errors,
    };
  }

  // Freeze an independent deep-cloned evidence baseline BEFORE constructing Pass 2 input or calling Pass 2.
  const pass1EvidenceSnapshot = deepFreeze(
    deepClone({
      reviewer: pass1Report.reviewer,
      dimensionAuditSlots: pass1Report.dimensionAuditSlots,
      semanticAuditResolutions: pass1Report.semanticAuditResolutions,
      preserveStrengths: pass1Report.preserveStrengths ?? [],
    })
  );

  // Pass 2 input build: strictly locked +-300-char radius & deep-cloned inputs detached from baseline snapshot (B3 & B4)
  let pass2Input;
  try {
    pass2Input = buildSchemeBPass2Input(shared, pass1Report, {radius});
  } catch (err) {
    const rawMsg = err?.message || 'R3_SCHEME_B_PASS2_INPUT_ERROR';
    const code = rawMsg.split(':')[0];
    return {
      ok: false,
      exitCode: 2,
      scheme: 'B',
      protocolMode: 'two_stage_B',
      stage: 'pass2_input_build',
      calls: {pass1: 1, pass2: 0, total: 1},
      reviewFingerprint: shared.reviewFingerprint,
      pass1EvidenceSnapshot,
      errors: [{code, message: rawMsg}],
    };
  }

  const finalReport = await adapter.runPass2Calibration(pass2Input);

  const finalValidation = validateR3ReviewReport(shared.projectRoot, chapterNumber, finalReport, {allowDiscovery: false});
  const finalModeErr = assertExpectedProtocolMode(finalReport, 'two_stage_B');
  const independence = checkStage2ReviewerIndependence(
    pass1EvidenceSnapshot.reviewer,
    finalReport?.reviewer,
    'Pass 1',
    'Pass 2',
    runtimeStageContexts
  );
  const evidenceErrors = checkSchemeBPass1EvidencePreserved(pass1EvidenceSnapshot, finalReport);
  const finalErrors = [
    ...finalValidation.errors,
    ...(finalModeErr ? [finalModeErr] : []),
    ...independence.errors,
    ...evidenceErrors,
  ];
  if (finalErrors.length > 0) {
    return {
      ok: false,
      exitCode: 2,
      scheme: 'B',
      protocolMode: 'two_stage_B',
      stage: 'pass2_calibration_validation',
      calls: {pass1: 1, pass2: 1, total: 2},
      reviewFingerprint: shared.reviewFingerprint,
      pass1EvidenceSnapshot,
      contextIndependenceVerification: independence.verification,
      pass2Input,
      errors: finalErrors,
    };
  }

  const routing = routeFinalReviewReport(finalReport, {compileWriterCard, chapterNumber});
  if (!routing.ok) {
    return {
      ok: false,
      exitCode: 2,
      scheme: 'B',
      protocolMode: 'two_stage_B',
      stage: 'impact_scope_routing',
      calls: {pass1: 1, pass2: 1, total: 2},
      reviewFingerprint: shared.reviewFingerprint,
      pass1EvidenceSnapshot,
      contextIndependenceVerification: independence.verification,
      pass2Input,
      errors: [{code: routing.error, message: routing.message}],
      routing,
    };
  }

  return {
    ok: true,
    exitCode: 0,
    scheme: 'B',
    protocolMode: 'two_stage_B',
    calls: {pass1: 1, pass2: 1, total: 2},
    reviewFingerprint: shared.reviewFingerprint,
    pass1EvidenceSnapshot,
    contextIndependenceVerification: independence.verification,
    pass1Input,
    pass1Report,
    pass1Validation,
    pass2Input,
    finalValidation,
    routing,
    finalReport,
  };
}

/**
 * Scheme C (Hybrid): High-Recall Single-Stage Complete Review + Conditional Independent Lightweight Triage.
 */
export async function runSchemeC(
  projectDir,
  chapterNumber,
  adapter,
  {basePack = null, radius = CONTEXT_WINDOW_RADIUS_CHARS, compileWriterCard = false, runtimeStageContexts = null} = {}
) {
  if (typeof adapter?.runStage1HighRecall !== 'function' || typeof adapter?.runStage2Triage !== 'function') {
    throw new Error('R3_SCHEME_C_ADAPTER_REQUIRED');
  }
  const shared = basePack ?? compileSharedReviewBasePack(projectDir, chapterNumber);
  if (!shared.ok) {
    return {ok: false, exitCode: 2, scheme: 'C', stage: 'compile_base_pack', error: shared.error, shared};
  }
  const packErr = checkSharedBasePackIntegrity(shared);
  if (packErr) {
    return {
      ok: false,
      exitCode: 2,
      scheme: 'C',
      protocolMode: 'single_plus_triage_C',
      stage: 'base_pack_integrity',
      shortCircuited: false,
      calls: {stage1: 0, stage2: 0, total: 0},
      reviewFingerprint: shared.reviewFingerprint,
      errors: [packErr],
    };
  }

  // Stage 1: High-recall single-stage complete review
  const stage1Input = buildFullStageInput('C', 'stage1_high_recall', 'single_plus_triage_C', 'C_STAGE1', shared);
  const stage1Report = await adapter.runStage1HighRecall(stage1Input);

  const stage1Validation = validateR3ReviewReport(shared.projectRoot, chapterNumber, stage1Report, {allowDiscovery: false});
  const stage1ExtraErrors = [];
  if (stage1Report?.schemaVersion !== R3_FINAL_REPORT_SCHEMA) {
    stage1ExtraErrors.push({
      code: 'R3_SCHEME_C_STAGE1_SCHEMA_REQUIRED',
      message: `方案 C Stage 1 必须产出 ${R3_FINAL_REPORT_SCHEMA}。`,
    });
  }
  const stage1ModeErr = assertExpectedProtocolMode(stage1Report, 'single_plus_triage_C');
  if (stage1ModeErr) stage1ExtraErrors.push(stage1ModeErr);

  const stage1Errors = [...stage1Validation.errors, ...stage1ExtraErrors];
  if (stage1Errors.length > 0) {
    return {
      ok: false,
      exitCode: 2,
      scheme: 'C',
      protocolMode: 'single_plus_triage_C',
      stage: 'stage1_validation',
      shortCircuited: false,
      calls: {stage1: 1, stage2: 0, total: 1},
      reviewFingerprint: shared.reviewFingerprint,
      errors: stage1Errors,
    };
  }

  // Freeze an independent deep-cloned evidence baseline BEFORE short-circuit or Stage 2 invocation.
  const stage1EvidenceSnapshot = deepFreeze(
    deepClone({
      reviewer: stage1Report.reviewer,
      nonBlockingIssuesCarried: (stage1Report.issues || []).filter(
        i => isPlainObject(i) && (i.severity === 'MINOR' || i.severity === 'SUGGESTION')
      ),
    })
  );

  const triggerCheck = shouldTriggerSchemeCStage2(stage1Report);
  if (!triggerCheck.trigger) {
    const shortCircuitVerification = {
      independent: null,
      proofLevel: 'not_applicable_short_circuited',
      runtimeInjected: Boolean(runtimeStageContexts),
      note: 'Stage 2 已短路未触发。',
    };
    const routing = routeFinalReviewReport(stage1Report, {compileWriterCard, chapterNumber});
    if (!routing.ok) {
      return {
        ok: false,
        exitCode: 2,
        scheme: 'C',
        protocolMode: 'single_plus_triage_C',
        stage: 'impact_scope_routing',
        shortCircuited: true,
        stage2TriggerReasons: triggerCheck.reasons,
        calls: {stage1: 1, stage2: 0, total: 1},
        reviewFingerprint: shared.reviewFingerprint,
        stage1EvidenceSnapshot,
        contextIndependenceVerification: shortCircuitVerification,
        errors: [{code: routing.error, message: routing.message}],
        routing,
      };
    }
    return {
      ok: true,
      exitCode: 0,
      scheme: 'C',
      protocolMode: 'single_plus_triage_C',
      shortCircuited: true,
      stage2TriggerReasons: triggerCheck.reasons,
      calls: {stage1: 1, stage2: 0, total: 1},
      reviewFingerprint: shared.reviewFingerprint,
      stage1EvidenceSnapshot,
      contextIndependenceVerification: shortCircuitVerification,
      stage1Input,
      stage1Report,
      stage1Validation,
      stage2Input: null,
      finalValidation: stage1Validation,
      routing,
      finalReport: stage1Report,
    };
  }

  // Stage 2 input build: strictly locked +-300-char radius & deep-cloned inputs detached from baseline snapshot (B3 & B5)
  let stage2Input;
  try {
    stage2Input = buildSchemeCStage2Input(shared, stage1Report, {radius});
  } catch (err) {
    const rawMsg = err?.message || 'R3_SCHEME_C_STAGE2_INPUT_ERROR';
    const code = rawMsg.split(':')[0];
    return {
      ok: false,
      exitCode: 2,
      scheme: 'C',
      protocolMode: 'single_plus_triage_C',
      stage: 'stage2_input_build',
      shortCircuited: false,
      stage2TriggerReasons: triggerCheck.reasons,
      calls: {stage1: 1, stage2: 0, total: 1},
      reviewFingerprint: shared.reviewFingerprint,
      stage1EvidenceSnapshot,
      errors: [{code, message: rawMsg}],
    };
  }

  const finalReport = await adapter.runStage2Triage(stage2Input);

  const finalValidation = validateR3ReviewReport(shared.projectRoot, chapterNumber, finalReport, {allowDiscovery: false});
  const finalModeErr = assertExpectedProtocolMode(finalReport, 'single_plus_triage_C');
  const independence = checkStage2ReviewerIndependence(
    stage1EvidenceSnapshot.reviewer,
    finalReport?.reviewer,
    'Stage 1',
    'Stage 2',
    runtimeStageContexts
  );
  const retentionErrors = checkSchemeCNonBlockingRetention(stage1EvidenceSnapshot, finalReport);
  const finalErrors = [
    ...finalValidation.errors,
    ...(finalModeErr ? [finalModeErr] : []),
    ...independence.errors,
    ...retentionErrors,
  ];
  if (finalErrors.length > 0) {
    return {
      ok: false,
      exitCode: 2,
      scheme: 'C',
      protocolMode: 'single_plus_triage_C',
      stage: 'stage2_triage_validation',
      shortCircuited: false,
      stage2TriggerReasons: triggerCheck.reasons,
      calls: {stage1: 1, stage2: 1, total: 2},
      reviewFingerprint: shared.reviewFingerprint,
      stage1EvidenceSnapshot,
      contextIndependenceVerification: independence.verification,
      stage2Input,
      errors: finalErrors,
    };
  }

  const routing = routeFinalReviewReport(finalReport, {compileWriterCard, chapterNumber});
  if (!routing.ok) {
    return {
      ok: false,
      exitCode: 2,
      scheme: 'C',
      protocolMode: 'single_plus_triage_C',
      stage: 'impact_scope_routing',
      shortCircuited: false,
      stage2TriggerReasons: triggerCheck.reasons,
      calls: {stage1: 1, stage2: 1, total: 2},
      reviewFingerprint: shared.reviewFingerprint,
      stage1EvidenceSnapshot,
      contextIndependenceVerification: independence.verification,
      stage2Input,
      errors: [{code: routing.error, message: routing.message}],
      routing,
    };
  }

  return {
    ok: true,
    exitCode: 0,
    scheme: 'C',
    protocolMode: 'single_plus_triage_C',
    shortCircuited: false,
    stage2TriggerReasons: triggerCheck.reasons,
    calls: {stage1: 1, stage2: 1, total: 2},
    reviewFingerprint: shared.reviewFingerprint,
    stage1EvidenceSnapshot,
    contextIndependenceVerification: independence.verification,
    stage1Input,
    stage1Report,
    stage1Validation,
    stage2Input,
    finalValidation,
    routing,
    finalReport,
  };
}

/**
 * Run all three schemes (A / B / C) against the EXACT SAME frozen `SharedReviewBasePack` for unbiased P0-6 comparison.
 */
export async function runAllThreeSchemesComparison(
  projectDir,
  chapterNumber,
  {adapterA, adapterB, adapterC},
  {radius = CONTEXT_WINDOW_RADIUS_CHARS, compileWriterCard = false} = {}
) {
  const shared = compileSharedReviewBasePack(projectDir, chapterNumber);
  if (!shared.ok) {
    return {ok: false, exitCode: 2, error: shared.error, shared};
  }
  const [resA, resB, resC] = await Promise.all([
    runSchemeA(projectDir, chapterNumber, adapterA, {basePack: shared, compileWriterCard}),
    runSchemeB(projectDir, chapterNumber, adapterB, {basePack: shared, radius, compileWriterCard}),
    runSchemeC(projectDir, chapterNumber, adapterC, {basePack: shared, radius, compileWriterCard}),
  ]);
  return {
    ok: resA.ok && resB.ok && resC.ok,
    exitCode: resA.ok && resB.ok && resC.ok ? 0 : 2,
    chapter: chapterNumber,
    revision: shared.revision,
    reviewFingerprint: shared.reviewFingerprint,
    sharedNeedsSemanticAuditCount: shared.needsSemanticAudit.length,
    results: {A: resA, B: resB, C: resC},
  };
}
