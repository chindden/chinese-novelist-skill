#!/usr/bin/env node
/**
 * P0-5: Shared Review Pack Compiler & Context-Window Slicer for A/B/C Prototypes.
 *
 * ISOLATED PROTOTYPE MODULE — NOT a production template or production router.
 * Ensures Scheme A, Scheme B, and Scheme C receive the EXACT SAME shared foundation:
 *   - `precheck v2` (`P0-3`)
 *   - five-tuple `reviewFingerprint` + immutable snapshot freeze (`P0-4`)
 *   - EXACT P0-4 `buildPlanningSlice()` planning context (B6: 100% parity with fingerprint)
 *   - N-1 ledger slice & `NEEDS_SEMANTIC_AUDIT` (`NSA-NNN`) clues
 *
 * Also constructs strictly isolated lightweight Stage-2 / Pass-2 input packs:
 *   - Context window radius strictly locked to +-300 chars (`CONTEXT_WINDOW_RADIUS_CHARS = 300`, B3)
 *   - `paragraphIndex`-anchored quote localization (Fail-Closed on ambiguous duplicate quotes, B3)
 *   - Scheme B Pass 2: ONLY candidate list + +-300-char verbatim excerpts + P0-4 planning slice (NO full chapter!)
 *   - Scheme C Stage 2: ONLY flagged BLOCKER/MAJOR + planningConflictAdvisories + non-pass NSA + +-300-char excerpts
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {projectRoot, readPlan, safeFile, sha256} from '../v3_common.mjs';
import {verifySnapshot} from '../r3_snapshots.mjs';
import {
  buildPlanningSlice,
  canonicalJson,
  computeReviewFingerprint,
  prepareR3Review,
  R3_REVIEW_PROTOCOL_VERSION,
} from '../r3_review_kernel.mjs';

const PROTOTYPE_TEMPLATES_DIR = fileURLToPath(new URL('../../references/v3/prototypes/', import.meta.url));
const isPlainObject = x => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
const isNonEmptyString = x => typeof x === 'string' && x.trim().length > 0;

export const CONTEXT_WINDOW_RADIUS_CHARS = 300;

/**
 * Deep clone JSON-compatible review structures so downstream adapters never share mutable references
 * with frozen evidence snapshots or shared base packs.
 */
export function deepClone(value) {
  return structuredClone(value);
}

/**
 * Recursively freeze objects and arrays to protect immutable evidence snapshots and base packs.
 */
export function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) {
    return value;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item, seen);
    }
  } else {
    for (const key of Object.keys(value)) {
      deepFreeze(value[key], seen);
    }
  }
  return Object.freeze(value);
}

const HEX64_RE = /^[a-f0-9]{64}$/;

/**
 * Verify that an assembled `planningCoreSlice` hashes to the exact canonical SHA-256 bound in `reviewFingerprint`.
 * Closes any TOCTOU window between `computeReviewFingerprint()` and `buildPlanningSlice()`.
 */
export function verifyPlanningSliceMatchesFingerprint(planningCoreSlice, expectedSha256) {
  if (!isPlainObject(planningCoreSlice)) {
    return {
      ok: false,
      expectedSha256: typeof expectedSha256 === 'string' ? expectedSha256 : null,
      actualSha256: null,
    };
  }
  const actualSha256 = sha256(Buffer.from(canonicalJson(planningCoreSlice), 'utf8'));
  return {
    ok: typeof expectedSha256 === 'string' && HEX64_RE.test(expectedSha256) && actualSha256 === expectedSha256,
    expectedSha256: typeof expectedSha256 === 'string' ? expectedSha256 : null,
    actualSha256,
  };
}

/**
 * Strictly verify (Fail-Closed) that a shared basePack has valid five-tuple `fingerprintComponents`,
 * that `planningCoreSlice` hashes to `fingerprintComponents.planningSliceSha256`, AND that recomputing
 * the canonical five-tuple fingerprint reproduces `basePack.reviewFingerprint` verbatim.
 */
export function verifyBasePackFingerprintBinding(basePack) {
  const fc = basePack?.fingerprintComponents;
  const reviewFp = basePack?.reviewFingerprint;
  if (
    !isPlainObject(fc) ||
    typeof reviewFp !== 'string' ||
    !HEX64_RE.test(reviewFp) ||
    typeof fc.manuscriptSha256 !== 'string' ||
    !HEX64_RE.test(fc.manuscriptSha256) ||
    typeof fc.planningSliceSha256 !== 'string' ||
    !HEX64_RE.test(fc.planningSliceSha256) ||
    typeof fc.ledgerSliceSha256 !== 'string' ||
    !HEX64_RE.test(fc.ledgerSliceSha256) ||
    typeof fc.hardConstraintsHash !== 'string' ||
    !HEX64_RE.test(fc.hardConstraintsHash) ||
    !isNonEmptyString(fc.protocolVersion)
  ) {
    return {
      ok: false,
      code: 'R3_BASE_PACK_FINGERPRINT_COMPONENTS_INVALID',
      message: '共享底座缺少合法的五元组 fingerprintComponents 或 reviewFingerprint，已按 Fail-Closed 拒绝执行。',
    };
  }

  const sliceCheck = verifyPlanningSliceMatchesFingerprint(basePack.planningCoreSlice, fc.planningSliceSha256);
  if (!sliceCheck.ok) {
    return {
      ok: false,
      code: 'R3_PLANNING_SLICE_HASH_MISMATCH',
      message: `共享底座 planningCoreSlice 哈希与五元组 planningSliceSha256 不一致（expected=${sliceCheck.expectedSha256}, actual=${sliceCheck.actualSha256}）。`,
      expectedPlanningSliceSha256: sliceCheck.expectedSha256,
      actualPlanningSliceSha256: sliceCheck.actualSha256,
    };
  }

  const recomputedReviewFingerprint = sha256(
    Buffer.from(
      canonicalJson({
        manuscriptSha256: fc.manuscriptSha256,
        planningSliceSha256: sliceCheck.actualSha256,
        ledgerSliceSha256: fc.ledgerSliceSha256,
        hardConstraintsHash: fc.hardConstraintsHash,
        protocolVersion: fc.protocolVersion,
      }),
      'utf8'
    )
  );
  if (recomputedReviewFingerprint !== reviewFp) {
    return {
      ok: false,
      code: 'R3_BASE_PACK_FINGERPRINT_BINDING_MISMATCH',
      message: `共享底座五元组重算指纹与 reviewFingerprint 不一致（expected=${reviewFp}, recomputed=${recomputedReviewFingerprint}），疑似组件哈希与总指纹脱节。`,
      expectedReviewFingerprint: reviewFp,
      recomputedReviewFingerprint,
    };
  }

  return {
    ok: true,
    planningCoreSliceSha256: sliceCheck.actualSha256,
    recomputedReviewFingerprint,
  };
}

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
 * Locate 1-indexed body paragraph spans matching `precheck_v2_common.mjs` `extractBodyParagraphs()`.
 * Returns exact `[startOffset, endOffset)` character positions inside `rawText`.
 */
export function locateBodyParagraphSpans(rawText) {
  if (typeof rawText !== 'string') return [];
  let offset = 0;
  if (rawText.startsWith('\uFEFF')) {
    offset = 1;
  }
  const withoutBom = rawText.slice(offset);
  const headMatch = withoutBom.match(/^[ \t]*#[ \t]+[^\r\n]*(?:\r?\n)+/);
  if (headMatch) {
    offset += headMatch[0].length;
  }
  const body = rawText.slice(offset);
  const hasBlankLineSep = /\r?\n[ \t]*\r?\n/.test(body.trim());
  const sepRe = hasBlankLineSep ? /\r?\n[ \t]*\r?\n+/g : /\r?\n+/g;

  const spans = [];
  let cursor = 0;
  const pushPart = (partStart, partEnd) => {
    const rawPart = body.slice(partStart, partEnd);
    const trimmed = rawPart.trim();
    if (!trimmed || /^[-*_]{3,}$/.test(trimmed)) return;
    const leadWs = rawPart.length - rawPart.trimStart().length;
    const startOffset = offset + partStart + leadWs;
    const endOffset = startOffset + trimmed.length;
    spans.push({
      paragraphIndex: spans.length + 1,
      startOffset,
      endOffset,
      text: trimmed,
    });
  };

  let m;
  while ((m = sepRe.exec(body)) !== null) {
    pushPart(cursor, m.index);
    cursor = m.index + m[0].length;
  }
  pushPart(cursor, body.length);
  return spans;
}

function findAllOccurrences(haystack, needle) {
  const positions = [];
  let pos = 0;
  while (pos <= haystack.length - needle.length) {
    const hit = haystack.indexOf(needle, pos);
    if (hit < 0) break;
    positions.push(hit);
    pos = hit + 1;
  }
  return positions;
}

/**
 * Extract verbatim +-300 character context window around `quote` inside `manuscriptText` (B3).
 *
 * Strict baseline rules:
 *  - `radius` MUST strictly equal `CONTEXT_WINDOW_RADIUS_CHARS` (300); any override fails closed.
 *  - When `paragraphIndex` (1-indexed) is provided, locates `quote` strictly inside that paragraph.
 *  - When `paragraphIndex` is omitted, requires `quote` to occur uniquely once across the chapter;
 *    duplicate occurrences without unambiguous `paragraphIndex` fail closed (`R3_AMBIGUOUS_DUPLICATE_QUOTE`).
 */
export function buildLocalContextExcerpt(manuscriptText, quote, optionsOrRadius = {}) {
  if (typeof manuscriptText !== 'string' || !isNonEmptyString(quote)) {
    throw new Error('R3_CONTEXT_EXCERPT_INVALID_INPUT');
  }
  const opts = typeof optionsOrRadius === 'number'
    ? {radius: optionsOrRadius}
    : (isPlainObject(optionsOrRadius) ? optionsOrRadius : {});
  const radius = opts.radius ?? CONTEXT_WINDOW_RADIUS_CHARS;
  const paragraphIndex = opts.paragraphIndex ?? null;

  if (radius !== CONTEXT_WINDOW_RADIUS_CHARS) {
    throw new Error(`R3_CONTEXT_WINDOW_RADIUS_LOCKED: expected=${CONTEXT_WINDOW_RADIUS_CHARS} actual=${String(radius)}`);
  }

  let matchOffset = -1;
  let resolvedParagraphIndex = null;

  if (paragraphIndex !== null && paragraphIndex !== undefined) {
    if (!Number.isSafeInteger(paragraphIndex) || paragraphIndex < 1) {
      throw new Error('R3_QUOTE_PARAGRAPH_INVALID');
    }
    const spans = locateBodyParagraphSpans(manuscriptText);
    const span = spans[paragraphIndex - 1];
    if (!span) {
      throw new Error(`R3_QUOTE_PARAGRAPH_OUT_OF_RANGE:${paragraphIndex}`);
    }
    const paraHits = findAllOccurrences(span.text, quote);
    if (paraHits.length === 0) {
      throw new Error(`R3_QUOTE_PARAGRAPH_MISMATCH:${paragraphIndex}`);
    }
    if (paraHits.length > 1) {
      throw new Error(`R3_AMBIGUOUS_DUPLICATE_QUOTE:paragraph=${paragraphIndex}`);
    }
    matchOffset = span.startOffset + paraHits[0];
    resolvedParagraphIndex = paragraphIndex;
  } else {
    const allHits = findAllOccurrences(manuscriptText, quote);
    if (allHits.length === 0) {
      throw new Error('R3_QUOTE_NOT_IN_FROZEN_MANUSCRIPT');
    }
    if (allHits.length > 1) {
      throw new Error(`R3_AMBIGUOUS_DUPLICATE_QUOTE:count=${allHits.length}`);
    }
    matchOffset = allHits[0];
    const spans = locateBodyParagraphSpans(manuscriptText);
    const containing = spans.find(s => matchOffset >= s.startOffset && matchOffset < s.endOffset);
    resolvedParagraphIndex = containing ? containing.paragraphIndex : null;
  }

  const start = Math.max(0, matchOffset - radius);
  const end = Math.min(manuscriptText.length, matchOffset + quote.length + radius);
  return {
    quote,
    paragraphIndex: resolvedParagraphIndex,
    matchOffset,
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
 * Reuses P0-4 `buildPlanningSlice()` directly so model context matches `planningSliceSha256` 100% (B6).
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

  const chapterEntry = (plan.chapters || []).find(c => c?.chapterNumber === chapterNumber);
  if (!chapterEntry) {
    return {ok: false, exitCode: 2, error: 'R3_FP_CHAPTER_NOT_IN_PLAN'};
  }
  // B6 + TOCTOU guard: Direct reuse of P0-4 pure read-only buildPlanningSlice() AND verify canonical SHA-256 matches fingerprint!
  const planningCoreSlice = buildPlanningSlice(root, plan, chapterEntry, chapterNumber);
  const liveSliceCheck = verifyPlanningSliceMatchesFingerprint(
    planningCoreSlice,
    liveFp.components.planningSliceSha256
  );
  const recSliceCheck = verifyPlanningSliceMatchesFingerprint(
    planningCoreSlice,
    rec.fingerprintComponents?.planningSliceSha256
  );
  if (!liveSliceCheck.ok || !recSliceCheck.ok) {
    return {
      ok: false,
      exitCode: 2,
      error: 'R3_PLANNING_SLICE_HASH_MISMATCH',
      expectedPlanningSliceSha256: rec.fingerprintComponents?.planningSliceSha256 ?? liveFp.components.planningSliceSha256,
      actualPlanningSliceSha256: liveSliceCheck.actualSha256,
    };
  }
  const bindingCheck = verifyBasePackFingerprintBinding({
    reviewFingerprint: rec.reviewFingerprint,
    fingerprintComponents: rec.fingerprintComponents,
    planningCoreSlice,
  });
  if (!bindingCheck.ok) {
    return {
      ok: false,
      exitCode: 2,
      error: bindingCheck.code,
      message: bindingCheck.message,
    };
  }

  return deepFreeze({
    ok: true,
    exitCode: 0,
    protocolVersion: R3_REVIEW_PROTOCOL_VERSION,
    projectRoot: root,
    chapter: chapterNumber,
    revision: rec.revision,
    reviewFingerprint: rec.reviewFingerprint,
    fingerprintComponents: deepClone(rec.fingerprintComponents),
    planningCoreSliceSha256: liveSliceCheck.actualSha256,
    manuscriptHashes: deepClone(rec.manuscriptHashes),
    manuscriptPath: packet.manuscriptPath,
    manuscriptText,
    needsSemanticAudit: deepClone(packet.needsSemanticAudit),
    planningCoreSlice: deepClone(planningCoreSlice),
    hardConstraints: deepClone({
      global: plan.hardConstraints ?? null,
      chapter: chapterEntry.hardConstraints ?? null,
    }),
    ledgerSlice: extractLedgerSummaryUpto(root, chapterNumber),
    snapshot: deepClone(rec.snapshot),
    inputPath: rec.inputPath,
  });
}

/**
 * Construct Scheme B Pass 2 lightweight input package.
 *
 * STRICT CONTEXT ISOLATION CONTRACT (PRD TC-P0-5-2 & B3 & B4 & B6):
 *  - MUST NOT include full chapter `manuscriptText`.
 *  - Radius strictly locked to 300 chars; locates quotes using `paragraphIndex` (Fail-Closed on ambiguity).
 *  - All nested evidence & planning fields are deep-cloned so Pass 2 adapter mutations CANNOT pollute
 *    Pass 1 evidence snapshots or the shared base pack.
 */
export function buildSchemeBPass2Input(basePack, pass1Report, {radius = CONTEXT_WINDOW_RADIUS_CHARS} = {}) {
  if (!basePack?.ok || typeof basePack.manuscriptText !== 'string') {
    throw new Error('R3_SCHEME_B_INVALID_BASE_PACK');
  }
  if (!isPlainObject(pass1Report) || !Array.isArray(pass1Report.candidates)) {
    throw new Error('R3_SCHEME_B_INVALID_PASS1_REPORT');
  }
  if (radius !== CONTEXT_WINDOW_RADIUS_CHARS) {
    throw new Error(`R3_CONTEXT_WINDOW_RADIUS_LOCKED: expected=${CONTEXT_WINDOW_RADIUS_CHARS} actual=${String(radius)}`);
  }

  const candidatesWithContext = pass1Report.candidates.map(cand => {
    const contextWindow = buildLocalContextExcerpt(basePack.manuscriptText, cand.quote, {
      radius,
      paragraphIndex: cand.paragraphIndex ?? null,
    });
    return {
      candidateId: cand.candidateId,
      dimension: cand.dimension,
      paragraphIndex: contextWindow.paragraphIndex,
      quote: cand.quote,
      objectiveContradiction: cand.objectiveContradiction,
      suspectedImpactScope: cand.suspectedImpactScope,
      contextWindow,
    };
  });

  const template = loadPrototypeTemplate('B_PASS2');

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
    manuscriptHashes: deepClone(basePack.manuscriptHashes),
    planningCoreSlice: deepClone(basePack.planningCoreSlice),
    hardConstraints: deepClone(basePack.hardConstraints),
    dimensionAuditSlots: deepClone(pass1Report.dimensionAuditSlots),
    semanticAuditResolutions: deepClone(pass1Report.semanticAuditResolutions),
    preserveStrengths: deepClone(pass1Report.preserveStrengths ?? []),
    candidatesWithContext: deepClone(candidatesWithContext),
  };
}

/**
 * Deterministic short-circuit evaluator for Scheme C Stage 2 (PRD §3.2 & TC-P0-5-3).
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
 * Construct Scheme C Stage 2 lightweight triage input (ONLY flagged issues, advisories, non-pass NSA,
 * and `nonBlockingIssuesCarried`, with radius strictly locked to 300 chars and exact P0-4 `planningCoreSlice`).
 * All nested objects/arrays are deep-cloned so Stage 2 adapter mutations CANNOT pollute Stage 1 snapshots or basePack.
 */
export function buildSchemeCStage2Input(basePack, stage1Report, {radius = CONTEXT_WINDOW_RADIUS_CHARS} = {}) {
  if (!basePack?.ok || typeof basePack.manuscriptText !== 'string') {
    throw new Error('R3_SCHEME_C_INVALID_BASE_PACK');
  }
  if (radius !== CONTEXT_WINDOW_RADIUS_CHARS) {
    throw new Error(`R3_CONTEXT_WINDOW_RADIUS_LOCKED: expected=${CONTEXT_WINDOW_RADIUS_CHARS} actual=${String(radius)}`);
  }
  const issues = Array.isArray(stage1Report?.issues) ? stage1Report.issues : [];
  const flaggedIssuesWithContext = issues
    .filter(i => i?.severity === 'BLOCKER' || i?.severity === 'MAJOR')
    .map(i => ({
      ...deepClone(i),
      contextWindow: buildLocalContextExcerpt(basePack.manuscriptText, i.quote, {
        radius,
        paragraphIndex: i.paragraphIndex ?? null,
      }),
    }));

  const nsaById = new Map((basePack.needsSemanticAudit || []).map(a => [a.auditId, a]));
  const nonPassNsaWithContext = (stage1Report?.semanticAuditResolutions || [])
    .filter(r => r?.status !== 'pass')
    .map(r => {
      const clue = nsaById.get(r.auditId);
      let contextWindow = null;
      if (clue?.anchorQuote && basePack.manuscriptText.includes(clue.anchorQuote)) {
        contextWindow = buildLocalContextExcerpt(basePack.manuscriptText, clue.anchorQuote, {
          radius,
          paragraphIndex: clue.paragraphIndex ?? null,
        });
      }
      return {...deepClone(r), clue: clue ? deepClone(clue) : null, contextWindow};
    });

  const template = loadPrototypeTemplate('C_STAGE2');
  const nonBlockingIssuesCarried = issues
    .filter(i => i?.severity === 'MINOR' || i?.severity === 'SUGGESTION')
    .map(i => deepClone(i));

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
    manuscriptHashes: deepClone(basePack.manuscriptHashes),
    planningCoreSlice: deepClone(basePack.planningCoreSlice),
    hardConstraints: deepClone(basePack.hardConstraints),
    stage1Decision: stage1Report.decision,
    dimensionAuditSlots: deepClone(stage1Report.dimensionAuditSlots),
    semanticAuditResolutions: deepClone(stage1Report.semanticAuditResolutions),
    nonBlockingIssuesCarried,
    flaggedIssuesWithContext,
    planningConflictAdvisories: deepClone(stage1Report.planningConflictAdvisories ?? []),
    nonPassNsaWithContext,
    preserveStrengths: deepClone(stage1Report.preserveStrengths ?? []),
  };
}
