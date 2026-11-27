#!/usr/bin/env node
/**
 * P0-5: Shared Review Pack Compiler & Context-Window Slicer for A/B/C Prototypes.
 *
 * ISOLATED PROTOTYPE MODULE — NOT a production template or production router.
 * Ensures Scheme A, Scheme B, and Scheme C receive the EXACT SAME shared foundation:
 *   - `precheck v2` (`P0-3`)
 *   - five-tuple `reviewFingerprint` + immutable snapshot freeze (`P0-4`)
 *   - core planning slice + N-1 ledger slice
 *   - `NEEDS_SEMANTIC_AUDIT` (`NSA-NNN`) clues
 *
 * Also constructs strictly isolated lightweight Stage-2 / Pass-2 input packs:
 *   - Scheme B Pass 2: ONLY candidate list + ±300-char verbatim excerpts + core planning slice (NO full chapter!)
 *   - Scheme C Stage 2: ONLY flagged BLOCKER/MAJOR + planningConflictAdvisories + non-pass NSA + ±300-char excerpts
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {projectRoot, readPlan, safeFile, sha256} from '../v3_common.mjs';
import {verifySnapshot} from '../r3_snapshots.mjs';
import {splitR3Markdown} from '../r3_plan_sections.mjs';
import {
  computeReviewFingerprint,
  prepareR3Review,
  R3_REVIEW_PROTOCOL_VERSION,
} from '../r3_review_kernel.mjs';

const PROTOTYPE_TEMPLATES_DIR = fileURLToPath(new URL('../../references/v3/prototypes/', import.meta.url));
const isPlainObject = x => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
const isNonEmptyString = x => typeof x === 'string' && x.trim().length > 0;

export const CONTEXT_WINDOW_RADIUS_CHARS = 300;

export const PROTOTYPE_TEMPLATE_FILES = Object.freeze({
  A: 'scheme-a-single-stage.md',
  B_PASS1: 'scheme-b-pass1-discovery.md',
  B_PASS2: 'scheme-b-pass2-calibration.md',
  C_STAGE1: 'scheme-c-stage1-high-recall.md',
  C_STAGE2: 'scheme-c-stage2-triage.md',
});

/**
 * Load an isolated prototype prompt template strictly from `references/v3/prototypes/`.
 */
export function loadPrototypeTemplate(key) {
  const filename = PROTOTYPE_TEMPLATE_FILES[key];
  if (!filename) {
    throw new Error(`R3_PROTOTYPE_TEMPLATE_UNKNOWN:${String(key)}`);
  }
  const abs = path.join(PROTOTYPE_TEMPLATES_DIR, filename);
  return {
    key,
    relativePath: `references/v3/prototypes/${filename}`,
    content: fs.readFileSync(abs, 'utf8'),
  };
}

/**
 * Extract verbatim ±radius character context window around `quote` inside `manuscriptText`.
 * Never returns the full manuscript if `manuscriptText` is larger than `quote.length + 2 * radius`.
 */
export function buildLocalContextExcerpt(manuscriptText, quote, radius = CONTEXT_WINDOW_RADIUS_CHARS) {
  if (typeof manuscriptText !== 'string' || !isNonEmptyString(quote)) {
    throw new Error('R3_CONTEXT_EXCERPT_INVALID_INPUT');
  }
  if (!Number.isSafeInteger(radius) || radius < 0 || radius > 1000) {
    throw new Error('R3_CONTEXT_EXCERPT_INVALID_RADIUS');
  }
  const idx = manuscriptText.indexOf(quote);
  if (idx < 0) {
    throw new Error('R3_QUOTE_NOT_IN_FROZEN_MANUSCRIPT');
  }
  const start = Math.max(0, idx - radius);
  const end = Math.min(manuscriptText.length, idx + quote.length + radius);
  return {
    quote,
    matchOffset: idx,
    windowStart: start,
    windowEnd: end,
    truncatedBefore: start > 0,
    truncatedAfter: end < manuscriptText.length,
    excerpt: manuscriptText.slice(start, end),
  };
}

function readOptionalFileUtf8(root, relPath) {
  const f = safeFile(root, relPath);
  if (!f) return null;
  return fs.readFileSync(f, 'utf8');
}

function extractCorePlanningSummary(root, plan, chapterNumber) {
  const chEntry = (plan.chapters || []).find(c => c?.chapterNumber === chapterNumber) ?? null;
  const outlineRaw = readOptionalFileUtf8(root, '01-大纲.md');
  const charsRaw = readOptionalFileUtf8(root, '00-人物档案.md');
  const styleRaw = readOptionalFileUtf8(root, '03-文风基准.md');

  let outlineCore = outlineRaw;
  let currentVolumeText = null;
  if (outlineRaw) {
    try {
      const split = splitR3Markdown('01-大纲.md', outlineRaw);
      outlineCore = split.core;
      const volId = Number.isSafeInteger(chEntry?.volume) ? chEntry.volume : 1;
      const vol = split.volumes.find(v => v.volId === volId) ?? split.volumes[split.volumes.length - 1] ?? null;
      currentVolumeText = vol ? vol.text : null;
    } catch {
      outlineCore = outlineRaw;
    }
  }

  let charCore = charsRaw;
  if (charsRaw) {
    try {
      charCore = splitR3Markdown('00-人物档案.md', charsRaw).core;
    } catch {
      charCore = charsRaw;
    }
  }

  let styleCore = styleRaw;
  if (styleRaw) {
    try {
      styleCore = splitR3Markdown('03-文风基准.md', styleRaw).core;
    } catch {
      styleCore = styleRaw;
    }
  }

  return {
    chapterNumber,
    chapterTitle: chEntry?.title ?? null,
    chapterOutline: chEntry?.outline ?? chEntry?.summary ?? null,
    outlineCore,
    currentVolumeText,
    charCore,
    styleCore,
    hardConstraints: {
      global: plan.hardConstraints ?? null,
      chapter: chEntry?.hardConstraints ?? null,
    },
  };
}

function extractLedgerSummaryUpto(root, chapterNumber) {
  const upto = chapterNumber - 1;
  const raw = readOptionalFileUtf8(root, 'story-ledger.json');
  if (!raw) {
    return {uptoChapter: upto, activeFacts: [], openForeshadowing: [], previousHandoff: null};
  }
  const ledger = JSON.parse(raw.replace(/^\uFEFF/, ''));
  const visibleFacts = (ledger.facts || []).filter(f => Number.isSafeInteger(f?.chapter) && f.chapter <= upto);
  const visibleIds = new Set(visibleFacts.map(f => f.id));
  const activeFacts = visibleFacts.filter(f => f.kind !== 'provisional' && !(f.supersededBy && visibleIds.has(f.supersededBy)));
  const openForeshadowing = (ledger.foreshadowing || []).filter(
    f => Number.isSafeInteger(f?.chapter) && f.chapter <= upto && f.status === 'open'
  );
  const handoffs = (ledger.handoffs || [])
    .filter(h => Number.isSafeInteger(h?.chapter) && h.chapter <= upto)
    .sort((a, b) => a.chapter - b.chapter);
  return {
    uptoChapter: upto,
    activeFacts,
    openForeshadowing,
    previousHandoff: handoffs.length > 0 ? handoffs[handoffs.length - 1] : null,
  };
}

/**
 * Compile the shared base review pack used identically by Schemes A, B, and C.
 * Guarantees zero attribution confounding across the three candidate architectures.
 */
export function compileSharedReviewBasePack(
  projectDir,
  chapterNumber,
  {prepareIfNeeded = true, writerRunId = 'prototype-writer', writerContextId = 'prototype-writer-ctx'} = {}
) {
  const root = projectRoot(projectDir);
  let plan = readPlan(root);
  let rec = plan.v3?.r3?.reviewV3?.chapterReviews?.[String(chapterNumber)] ?? null;

  if (prepareIfNeeded && (!rec || rec.status !== 'under_review')) {
    const prep = prepareR3Review(root, chapterNumber, {
      dryRun: false,
      writerRunId,
      writerContextId,
    });
    if (!prep.ok) {
      return {
        ok: false,
        exitCode: 2,
        error: prep.error || 'R3_SHARED_PACK_PREPARE_FAILED',
        prepareResult: prep,
      };
    }
    plan = readPlan(root);
    rec = plan.v3.r3.reviewV3.chapterReviews[String(chapterNumber)];
  }

  if (!isPlainObject(rec) || rec.status !== 'under_review') {
    return {
      ok: false,
      exitCode: 2,
      error: 'R3_SHARED_PACK_NOT_FROZEN',
    };
  }

  const inputFile = safeFile(root, rec.inputPath);
  if (!inputFile) {
    return {ok: false, exitCode: 2, error: 'R3_INPUT_PACKET_MISSING'};
  }
  const inputBytes = fs.readFileSync(inputFile);
  if (sha256(inputBytes) !== rec.inputSha256) {
    return {ok: false, exitCode: 2, error: 'R3_INPUT_PACKET_CHANGED'};
  }
  const packet = JSON.parse(inputBytes.toString('utf8').replace(/^\uFEFF/, ''));
  const frozenSnap = verifySnapshot(root, rec.snapshot.path, rec.snapshot.sha256);
  const chFileName = `chapter-${String(chapterNumber).padStart(4, '0')}.md`;
  const manuscriptText = frozenSnap.files[chFileName];
  const liveFp = computeReviewFingerprint(root, chapterNumber, {plan});
  if (liveFp.reviewFingerprint !== rec.reviewFingerprint) {
    return {
      ok: false,
      exitCode: 2,
      error: 'fingerprint_mismatch',
    };
  }

  return {
    ok: true,
    exitCode: 0,
    protocolVersion: R3_REVIEW_PROTOCOL_VERSION,
    projectRoot: root,
    chapter: chapterNumber,
    revision: rec.revision,
    reviewFingerprint: rec.reviewFingerprint,
    fingerprintComponents: rec.fingerprintComponents,
    manuscriptHashes: rec.manuscriptHashes,
    manuscriptPath: packet.manuscriptPath,
    manuscriptText,
    needsSemanticAudit: packet.needsSemanticAudit,
    planningCoreSlice: extractCorePlanningSummary(root, plan, chapterNumber),
    ledgerSlice: extractLedgerSummaryUpto(root, chapterNumber),
    snapshot: rec.snapshot,
    inputPath: rec.inputPath,
  };
}

/**
 * Construct Scheme B Pass 2 lightweight input package.
 *
 * STRICT CONTEXT ISOLATION CONTRACT (PRD TC-P0-5-2):
 *  - MUST NOT include full chapter `manuscriptText`.
 *  - Includes ONLY: Pass 1 candidate list + ±300-char verbatim context window per candidate + core planning slice
 *    + inherited `dimensionAuditSlots`, `semanticAuditResolutions`, `preserveStrengths`, and fingerprint bindings.
 */
export function buildSchemeBPass2Input(basePack, pass1Report, {radius = CONTEXT_WINDOW_RADIUS_CHARS} = {}) {
  if (!basePack?.ok || typeof basePack.manuscriptText !== 'string') {
    throw new Error('R3_SCHEME_B_INVALID_BASE_PACK');
  }
  if (!isPlainObject(pass1Report) || !Array.isArray(pass1Report.candidates)) {
    throw new Error('R3_SCHEME_B_INVALID_PASS1_REPORT');
  }

  const candidatesWithContext = pass1Report.candidates.map(cand => ({
    candidateId: cand.candidateId,
    dimension: cand.dimension,
    paragraphIndex: cand.paragraphIndex ?? null,
    quote: cand.quote,
    objectiveContradiction: cand.objectiveContradiction,
    suspectedImpactScope: cand.suspectedImpactScope,
    contextWindow: buildLocalContextExcerpt(basePack.manuscriptText, cand.quote, radius),
  }));

  const template = loadPrototypeTemplate('B_PASS2');

  // Deliberately omit `manuscriptText` and full ledger so Pass 2 stays lightweight and context-isolated!
  return {
    scheme: 'B',
    stage: 'pass2_calibration',
    protocolMode: 'two_stage_B',
    templatePath: template.relativePath,
    fullManuscriptInjected: false,
    contextWindowRadiusChars: radius,
    chapter: basePack.chapter,
    revision: basePack.revision,
    reviewFingerprint: basePack.reviewFingerprint,
    manuscriptHashes: basePack.manuscriptHashes,
    planningCoreSlice: basePack.planningCoreSlice,
    dimensionAuditSlots: pass1Report.dimensionAuditSlots,
    semanticAuditResolutions: pass1Report.semanticAuditResolutions,
    preserveStrengths: pass1Report.preserveStrengths ?? [],
    candidatesWithContext,
  };
}

/**
 * Deterministic short-circuit evaluator for Scheme C Stage 2 (PRD §3.2 & TC-P0-5-3).
 *
 * Short-circuits (skip Stage 2 -> 0 extra calls) IFF:
 *  - Stage 1 decision === 'pass_candidate'
 *  - Stage 1 has 0 BLOCKER/MAJOR issues
 *  - Stage 1 has 0 planningConflictAdvisories
 *  - ALL Stage 1 semanticAuditResolutions have status === 'pass'
 */
export function shouldTriggerSchemeCStage2(stage1Report) {
  const reasons = [];
  if (!isPlainObject(stage1Report)) {
    return {trigger: true, reasons: ['INVALID_STAGE1_REPORT']};
  }
  if (stage1Report.decision !== 'pass_candidate') {
    reasons.push(`DECISION_${String(stage1Report.decision)}`);
  }
  const issues = Array.isArray(stage1Report.issues) ? stage1Report.issues : [];
  const blockingCandidates = issues.filter(i => i?.severity === 'BLOCKER' || i?.severity === 'MAJOR');
  if (blockingCandidates.length > 0) {
    reasons.push(`BLOCKING_ISSUES_${blockingCandidates.length}`);
  }
  const advisories = Array.isArray(stage1Report.planningConflictAdvisories)
    ? stage1Report.planningConflictAdvisories
    : [];
  if (advisories.length > 0) {
    reasons.push(`PLANNING_ADVISORIES_${advisories.length}`);
  }
  const nsaRes = Array.isArray(stage1Report.semanticAuditResolutions)
    ? stage1Report.semanticAuditResolutions
    : [];
  const nonPassNsa = nsaRes.filter(r => r?.status !== 'pass');
  if (nonPassNsa.length > 0) {
    reasons.push(`NON_PASS_NSA_${nonPassNsa.length}`);
  }
  return {
    trigger: reasons.length > 0,
    reasons: reasons.length > 0 ? reasons : ['SHORT_CIRCUIT_CLEAN_PASS'],
  };
}

/**
 * Construct Scheme C Stage 2 lightweight triage input (ONLY flagged issues, advisories, and non-pass NSA items).
 */
export function buildSchemeCStage2Input(basePack, stage1Report, {radius = CONTEXT_WINDOW_RADIUS_CHARS} = {}) {
  if (!basePack?.ok || typeof basePack.manuscriptText !== 'string') {
    throw new Error('R3_SCHEME_C_INVALID_BASE_PACK');
  }
  const issues = Array.isArray(stage1Report?.issues) ? stage1Report.issues : [];
  const flaggedIssuesWithContext = issues
    .filter(i => i?.severity === 'BLOCKER' || i?.severity === 'MAJOR')
    .map(i => ({
      ...i,
      contextWindow: buildLocalContextExcerpt(basePack.manuscriptText, i.quote, radius),
    }));

  const nsaById = new Map((basePack.needsSemanticAudit || []).map(a => [a.auditId, a]));
  const nonPassNsaWithContext = (stage1Report?.semanticAuditResolutions || [])
    .filter(r => r?.status !== 'pass')
    .map(r => {
      const clue = nsaById.get(r.auditId);
      let contextWindow = null;
      if (clue?.anchorQuote && basePack.manuscriptText.includes(clue.anchorQuote)) {
        contextWindow = buildLocalContextExcerpt(basePack.manuscriptText, clue.anchorQuote, radius);
      }
      return {...r, clue: clue ?? null, contextWindow};
    });

  const template = loadPrototypeTemplate('C_STAGE2');

  return {
    scheme: 'C',
    stage: 'stage2_triage',
    protocolMode: 'single_plus_triage_C',
    templatePath: template.relativePath,
    fullManuscriptInjected: false,
    contextWindowRadiusChars: radius,
    chapter: basePack.chapter,
    revision: basePack.revision,
    reviewFingerprint: basePack.reviewFingerprint,
    manuscriptHashes: basePack.manuscriptHashes,
    planningCoreSlice: basePack.planningCoreSlice,
    stage1Decision: stage1Report.decision,
    dimensionAuditSlots: stage1Report.dimensionAuditSlots,
    semanticAuditResolutions: stage1Report.semanticAuditResolutions,
    nonBlockingIssuesCarried: issues.filter(i => i?.severity === 'MINOR' || i?.severity === 'SUGGESTION'),
    flaggedIssuesWithContext,
    planningConflictAdvisories: stage1Report.planningConflictAdvisories ?? [],
    nonPassNsaWithContext,
    preserveStrengths: stage1Report.preserveStrengths ?? [],
  };
}
