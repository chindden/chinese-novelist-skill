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
  validateR3ReviewReport,
} from '../r3_review_kernel.mjs';
import {
  CONTEXT_WINDOW_RADIUS_CHARS,
  loadPrototypeTemplate,
  compileSharedReviewBasePack,
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
    manuscriptHashes: basePack.manuscriptHashes,
    manuscriptPath: basePack.manuscriptPath,
    manuscriptText: basePack.manuscriptText,
    planningCoreSlice: basePack.planningCoreSlice,
    hardConstraints: basePack.hardConstraints,
    ledgerSlice: basePack.ledgerSlice,
    needsSemanticAudit: basePack.needsSemanticAudit,
  };
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
 * B1: Enforce reviewer independence (distinct runId AND distinct contextId) between two review stages.
 */
function checkStage2ReviewerIndependence(stage1Report, stage2Report, stage1Label, stage2Label) {
  const r1 = stage1Report?.reviewer;
  const r2 = stage2Report?.reviewer;
  if (!isPlainObject(r1) || !isPlainObject(r2)) return [];
  const errs = [];
  if (r1.runId === r2.runId || r1.contextId === r2.contextId) {
    errs.push({
      code: 'R3_STAGE2_CONTEXT_NOT_INDEPENDENT',
      message: `${stage2Label} 必须使用独立审稿上下文，不得与 ${stage1Label} 复用相同 runId 或 contextId。`,
      stage1Reviewer: {runId: r1.runId, contextId: r1.contextId},
      stage2Reviewer: {runId: r2.runId, contextId: r2.contextId},
    });
  }
  return errs;
}

/**
 * B4: Verify Scheme B Pass 2 preserves Pass 1's 6-dim `dimensionAuditSlots` and `semanticAuditResolutions` verbatim.
 * Pass 2 may attach supplemental commentary in a separate field (e.g., `calibrationAuditNotes`), never silently mutating Pass 1 evidence.
 */
function checkSchemeBPass1EvidencePreserved(pass1Report, finalReport) {
  const errs = [];
  const p1Slots = new Map((pass1Report?.dimensionAuditSlots || []).map(s => [s.dimension, s]));
  const p2Slots = new Map((finalReport?.dimensionAuditSlots || []).map(s => [s.dimension, s]));
  for (const [dim, s1] of p1Slots.entries()) {
    const s2 = p2Slots.get(dim);
    if (!s2 || s2.checkedAnchor !== s1.checkedAnchor || s2.status !== s1.status) {
      errs.push({
        code: 'R3_SCHEME_B_PASS1_SLOTS_ALTERED',
        dimension: dim,
        message: `方案 B Pass 2 篡改或未完整保留 Pass 1 维度 ${dim} 的取证记录（checkedAnchor/status 必须与 Pass 1 一致）。`,
      });
    }
  }

  const p1Nsa = new Map((pass1Report?.semanticAuditResolutions || []).map(r => [r.auditId, r]));
  const p2Nsa = new Map((finalReport?.semanticAuditResolutions || []).map(r => [r.auditId, r]));
  for (const [aid, n1] of p1Nsa.entries()) {
    const n2 = p2Nsa.get(aid);
    if (!n2 || n2.status !== n1.status || n2.note !== n1.note) {
      errs.push({
        code: 'R3_SCHEME_B_PASS1_NSA_ALTERED',
        auditId: aid,
        message: `方案 B Pass 2 篡改了 Pass 1 对 ${aid} 的原始核销记录（status/note 必须原样保留；如需补充请写入独立字段）。`,
      });
    }
  }
  return errs;
}

/**
 * B5: Verify Scheme C Stage 2 retains every Stage 1 MINOR/SUGGESTION issue verbatim, or provides an explicit auditable disposition.
 */
function checkSchemeCNonBlockingRetention(stage1Report, finalReport) {
  const carried = (stage1Report?.issues || []).filter(
    i => isPlainObject(i) && (i.severity === 'MINOR' || i.severity === 'SUGGESTION')
  );
  if (carried.length === 0) return [];

  const finalById = new Map((finalReport?.issues || []).filter(isPlainObject).map(i => [i.id, i]));
  const dispositions = Array.isArray(finalReport?.carriedIssueDispositions)
    ? finalReport.carriedIssueDispositions
    : [];
  const dispById = new Map(dispositions.filter(isPlainObject).map(d => [d.id, d]));

  const errs = [];
  for (const orig of carried) {
    const retained = finalById.get(orig.id);
    if (retained && retained.severity === orig.severity && retained.quote === orig.quote) {
      continue;
    }
    const disp = dispById.get(orig.id);
    if (disp && ALLOWED_CARRIED_DISPOSITIONS.includes(disp.disposition) && isNonEmptyString(disp.note)) {
      if (disp.disposition === 'kept' && (!retained || retained.severity !== orig.severity || retained.quote !== orig.quote)) {
        errs.push({
          code: 'R3_SCHEME_C_DROPPED_STAGE1_NONBLOCKING',
          issueId: orig.id,
          message: `方案 C Stage 2 对 ${orig.id} 声明 disposition="kept"，但未在最终 issues 中原样保留该条目（id/severity/quote 须一致）。`,
        });
      }
      continue;
    }
    errs.push({
      code: 'R3_SCHEME_C_DROPPED_STAGE1_NONBLOCKING',
      issueId: orig.id,
      severity: orig.severity,
      message: `方案 C Stage 2 静默丢弃了 Stage 1 的非阻断条目 ${orig.id}（${orig.severity}），必须原样保留或在 carriedIssueDispositions 中给出明确处置。`,
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
  {basePack = null, radius = CONTEXT_WINDOW_RADIUS_CHARS, compileWriterCard = false} = {}
) {
  if (typeof adapter?.runPass1Discovery !== 'function' || typeof adapter?.runPass2Calibration !== 'function') {
    throw new Error('R3_SCHEME_B_ADAPTER_REQUIRED');
  }
  const shared = basePack ?? compileSharedReviewBasePack(projectDir, chapterNumber);
  if (!shared.ok) {
    return {ok: false, exitCode: 2, scheme: 'B', stage: 'compile_base_pack', error: shared.error, shared};
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

  // Pass 2 input build: strictly locked +-300-char radius & unambiguous paragraphIndex-anchored quotes (B3)
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
      errors: [{code, message: rawMsg}],
    };
  }

  const finalReport = await adapter.runPass2Calibration(pass2Input);

  const finalValidation = validateR3ReviewReport(shared.projectRoot, chapterNumber, finalReport, {allowDiscovery: false});
  const finalModeErr = assertExpectedProtocolMode(finalReport, 'two_stage_B');
  const independenceErrors = checkStage2ReviewerIndependence(pass1Report, finalReport, 'Pass 1', 'Pass 2');
  const evidenceErrors = checkSchemeBPass1EvidencePreserved(pass1Report, finalReport);
  const finalErrors = [
    ...finalValidation.errors,
    ...(finalModeErr ? [finalModeErr] : []),
    ...independenceErrors,
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
  {basePack = null, radius = CONTEXT_WINDOW_RADIUS_CHARS, compileWriterCard = false} = {}
) {
  if (typeof adapter?.runStage1HighRecall !== 'function' || typeof adapter?.runStage2Triage !== 'function') {
    throw new Error('R3_SCHEME_C_ADAPTER_REQUIRED');
  }
  const shared = basePack ?? compileSharedReviewBasePack(projectDir, chapterNumber);
  if (!shared.ok) {
    return {ok: false, exitCode: 2, scheme: 'C', stage: 'compile_base_pack', error: shared.error, shared};
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

  const triggerCheck = shouldTriggerSchemeCStage2(stage1Report);
  if (!triggerCheck.trigger) {
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
      stage1Input,
      stage1Report,
      stage1Validation,
      stage2Input: null,
      finalValidation: stage1Validation,
      routing,
      finalReport: stage1Report,
    };
  }

  // Stage 2 input build: strictly locked +-300-char radius & unambiguous quote localization (B3)
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
      errors: [{code, message: rawMsg}],
    };
  }

  const finalReport = await adapter.runStage2Triage(stage2Input);

  const finalValidation = validateR3ReviewReport(shared.projectRoot, chapterNumber, finalReport, {allowDiscovery: false});
  const finalModeErr = assertExpectedProtocolMode(finalReport, 'single_plus_triage_C');
  const independenceErrors = checkStage2ReviewerIndependence(stage1Report, finalReport, 'Stage 1', 'Stage 2');
  const retentionErrors = checkSchemeCNonBlockingRetention(stage1Report, finalReport);
  const finalErrors = [
    ...finalValidation.errors,
    ...(finalModeErr ? [finalModeErr] : []),
    ...independenceErrors,
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
