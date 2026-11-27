#!/usr/bin/env node
/**
 * P0-5: Fair Side-by-Side A / B / C Review Prototype Orchestrator.
 *
 * ISOLATED PROTOTYPE MODULE — does NOT replace production review templates or R2 workflows,
 * and does NOT presuppose any winner among Scheme A, Scheme B, or Scheme C.
 *
 * All three schemes share the EXACT SAME foundation:
 *   1. `precheck v2` (`P0-3`) + `NEEDS_SEMANTIC_AUDIT` clues
 *   2. Five-tuple `reviewFingerprint` + Fail-Closed validation (`P0-4` `validateR3ReviewReport`)
 *   3. Mandatory 6-dimension `dimensionAuditSlots` (`HL-1`–`HL-6`)
 *   4. `impactScope` hard interception & `OR6` `PLANNING_CONFLICT_BLOCK` router (`impact_scope_router.mjs`)
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
 *
 * Guarantees:
 *  - Pass 1 is Fail-Closed validated against `Pass1DiscoveryReport` BEFORE Pass 2 is invoked.
 *  - Pass 2 receives ONLY candidates + ±300-char verbatim excerpts + core planning slice (NO full chapter).
 *  - Pass 2 output is Fail-Closed validated against `FinalCalibrationReport` (`P0-4`) and routed via `OR6`.
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
    // Fail-Closed BEFORE Pass 2 is ever called!
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

  // Pass 2: Strictly isolated lightweight calibration (NO full chapter manuscript!)
  const pass2Input = buildSchemeBPass2Input(shared, pass1Report, {radius});
  const finalReport = await adapter.runPass2Calibration(pass2Input);

  const finalValidation = validateR3ReviewReport(shared.projectRoot, chapterNumber, finalReport, {allowDiscovery: false});
  const finalModeErr = assertExpectedProtocolMode(finalReport, 'two_stage_B');
  const finalErrors = [...finalValidation.errors, ...(finalModeErr ? [finalModeErr] : [])];
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
 *
 * Guarantees:
 *  - Stage 1 output is Fail-Closed validated against `FinalCalibrationReport`.
 *  - Short-circuits Stage 2 (0 extra calls) when Stage 1 is `pass_candidate`, 0 BLOCKER/MAJOR,
 *    0 `planningConflictAdvisories`, and ALL `NEEDS_SEMANTIC_AUDIT` resolutions are `'pass'`.
 *  - Otherwise triggers lightweight Stage 2 triage (flagged items + ±300-char windows, NO full chapter)
 *    and Fail-Closed validates Stage 2 output before `OR6` routing.
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
    // Short-circuit: clean pass -> skip Stage 2 completely (0 extra latency!)
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

  // Stage 2: Conditional independent lightweight triage (NO full chapter!)
  const stage2Input = buildSchemeCStage2Input(shared, stage1Report, {radius});
  const finalReport = await adapter.runStage2Triage(stage2Input);

  const finalValidation = validateR3ReviewReport(shared.projectRoot, chapterNumber, finalReport, {allowDiscovery: false});
  const finalModeErr = assertExpectedProtocolMode(finalReport, 'single_plus_triage_C');
  const finalErrors = [...finalValidation.errors, ...(finalModeErr ? [finalModeErr] : [])];
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
