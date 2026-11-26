#!/usr/bin/env node
/**
 * P0-4: Composite Review Fingerprint & Fail-Closed Review Kernel (复合审读指纹与 Fail-Closed 内核).
 *
 * Implements frozen protocol `06-审核修复复审及版本失效协议.md` §2.1–2.3 and PRD `P0-4`:
 *  1. Five-tuple composite `reviewFingerprint` under `v3.r3` namespace (preserving legacy R2 `manuscriptHashes` 100%):
 *     sha256(canonicalJson({
 *       manuscriptSha256,
 *       planningSliceSha256,
 *       ledgerSliceSha256,
 *       hardConstraintsHash,
 *       protocolVersion: "r3-review-v3.0"
 *     }))
 *  2. Fail-Closed review report validator & applicator (`exit code 2`, 0 disk side effects on rejection):
 *     - Live + frozen five-tuple `reviewFingerprint` equality (`fingerprint_mismatch`)
 *     - Complete 6-dimension `dimensionAuditSlots` (`HL-1` ~ `HL-6`) with non-empty `checkedAnchor`
 *     - Complete `NEEDS_SEMANTIC_AUDIT` (`auditId`) resolution (`pass | issue_raised | insufficient_material`)
 *     - Verbatim `quote` presence inside frozen manuscript snapshot (blocks fabricated quotes)
 *     - Mandatory non-empty `reverseDefense` and valid `impactScope` on every `BLOCKER`/`MAJOR`
 *     - S1 four-level severity compatibility (`SUGGESTION` never blocks) & `OR6` `PLANNING_CONFLICT_BLOCK` integrity
 *  3. Zero empty `revision` increments:
 *     - `--dry-run` or `precheck v2` `hardErrors` NEVER freeze a snapshot and NEVER increment `revision`
 *     - Only passing deterministic precheck + freezing a valid review packet allocates a new `revision`
 *     - `effectiveReviewSubmissions` counts ONLY independent review reports that passed Fail-Closed validation
 */
import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {fileURLToPath} from 'node:url';
import {projectRoot, readPlan, atomicWritePlan, safeFile, sha256} from './v3_common.mjs';
import {hasR3Namespace, validR3Namespace} from './r3_state_common.mjs';
import {createSnapshot, verifySnapshot} from './r3_snapshots.mjs';
import {splitR3Markdown} from './r3_plan_sections.mjs';
import {S1_SEVERITIES} from './r3_p1_common.mjs';
import {precheckChapterV2} from './precheck_v2_common.mjs';

export const R3_REVIEW_PROTOCOL_VERSION = 'r3-review-v3.0';
export const R3_REVIEW_INPUT_SCHEMA = 'r3-v3-input-1';
export const R3_DISCOVERY_REPORT_SCHEMA = 'r3-v3-discovery-1';
export const R3_FINAL_REPORT_SCHEMA = 'r3-v3-review-1';

export const DIMENSION_SLOTS = Object.freeze(['HL-1', 'HL-2', 'HL-3', 'HL-4', 'HL-5', 'HL-6']);
export const ALLOWED_SLOT_STATUSES = Object.freeze(['pass', 'issue_raised']);
export const ALLOWED_NSA_STATUSES = Object.freeze(['pass', 'issue_raised', 'insufficient_material']);
export const ALLOWED_IMPACT_SCOPES = Object.freeze(['draft_only', 'upstream_planning', 'finalized_canon']);
export const ALLOWED_PROTOCOL_MODES = Object.freeze([
  'single_stage_A',
  'two_stage_B',
  'single_plus_triage_C',
]);
export const ALLOWED_FINAL_DECISIONS = Object.freeze([
  'pass_candidate',
  'revise',
  'PLANNING_CONFLICT_BLOCK',
]);

const HEX64_RE = /^[a-f0-9]{64}$/;
const hasOwn = (obj, k) => Object.prototype.hasOwnProperty.call(obj, k);
const isPlainObject = x => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
const isNonEmptyString = x => typeof x === 'string' && x.trim().length > 0;

/**
 * Deterministic recursive key-sorted canonical JSON serialization.
 */
export function canonicalJson(value) {
  const normalize = v => {
    if (v === null) return null;
    if (typeof v === 'boolean' || typeof v === 'string') return v;
    if (typeof v === 'number') {
      if (!Number.isFinite(v)) {
        throw new Error('R3_CANONICAL_JSON_NON_FINITE_NUMBER');
      }
      return v;
    }
    if (Array.isArray(v)) {
      return v.map(item => (item === undefined ? null : normalize(item)));
    }
    if (isPlainObject(v)) {
      const out = {};
      for (const k of Object.keys(v).sort()) {
        if (v[k] !== undefined) {
          out[k] = normalize(v[k]);
        }
      }
      return out;
    }
    throw new Error('R3_CANONICAL_JSON_UNSUPPORTED_TYPE');
  };
  return JSON.stringify(normalize(value));
}

function sha256Canonical(obj) {
  return sha256(Buffer.from(canonicalJson(obj), 'utf8'));
}

/**
 * Read an optional project file safely:
 *  - Returns {exists: false} only when truly ENOENT.
 *  - Throws failCode if path traverses outside root, is a symlink escape, non-file, or unreadable.
 */
function readOptionalSafeText(root, relPath, failCode) {
  if (typeof relPath !== 'string' || !relPath.trim() || path.isAbsolute(relPath)) {
    throw new Error(failCode);
  }
  const realRoot = fs.realpathSync(root);
  const candidate = path.resolve(realRoot, relPath);
  const rel = path.relative(realRoot, candidate);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(failCode);
  }
  let lst;
  try {
    lst = fs.lstatSync(candidate);
  } catch (err) {
    if (err && err.code === 'ENOENT') {
      return {exists: false, text: null, bytes: null};
    }
    throw new Error(failCode);
  }
  if (lst.isSymbolicLink() || !lst.isFile()) {
    throw new Error(failCode);
  }
  const safe = safeFile(root, relPath);
  if (!safe) {
    throw new Error(failCode);
  }
  const bytes = fs.readFileSync(safe);
  return {exists: true, text: bytes.toString('utf8'), bytes};
}

function chapterNumberToChinese(n) {
  if (!Number.isSafeInteger(n) || n < 1 || n > 9999) return null;
  const digits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const units = ['', '十', '百', '千'];
  const s = String(n);
  let out = '';
  let zeroPending = false;
  for (let i = 0; i < s.length; i++) {
    const d = Number(s[i]);
    const pos = s.length - 1 - i;
    if (d === 0) {
      zeroPending = true;
    } else {
      if (zeroPending && out) out += '零';
      zeroPending = false;
      if (!(d === 1 && pos === 1 && !out)) out += digits[d];
      out += units[pos];
    }
  }
  return out;
}

function buildChapterTagPattern(chapterNumber) {
  const cn = chapterNumberToChinese(chapterNumber);
  return cn ? `(?:${chapterNumber}|${cn})` : String(chapterNumber);
}

/**
 * Extract raw subsection for chapter N from an outline Markdown string, preserving exact bytes inside the slice.
 */
function extractChapterOutlineRaw(outlineText, chapterNumber) {
  if (typeof outlineText !== 'string' || !outlineText) return null;
  const lines = outlineText.match(/[^\n]*(?:\n|$)/g)?.filter(Boolean) ?? [];
  const numPat = buildChapterTagPattern(chapterNumber);
  const headingRe = new RegExp(`^ {0,3}(#{2,6})\\s+第\\s*${numPat}\\s*章(?:\\b|[\\s：:·—\\-]|$)`);
  for (let i = 0; i < lines.length; i++) {
    const clean = lines[i].replace(/\r?\n$/, '');
    const m = clean.match(headingRe);
    if (!m) continue;
    const level = m[1].length;
    let j = i + 1;
    while (j < lines.length) {
      const nextClean = lines[j].replace(/\r?\n$/, '');
      const nextH = nextClean.match(/^ {0,3}(#{1,6})\s+/);
      if (nextH && nextH[1].length <= level) break;
      j++;
    }
    return lines.slice(i, j).join('');
  }
  return null;
}

/**
 * Extract deterministic planning slice (chapter outline + core contracts + current volume anchor).
 */
function buildPlanningSlice(root, plan, chapterEntry, chapterNumber) {
  const chapterMeta = {
    chapterNumber: chapterEntry.chapterNumber,
    title: chapterEntry.title ?? null,
    filePath: chapterEntry.filePath ?? null,
    volume: chapterEntry.volume ?? chapterEntry.volumeId ?? null,
    arc: chapterEntry.arc ?? null,
    summary: chapterEntry.summary ?? null,
    outline: chapterEntry.outline ?? null,
    beats: chapterEntry.beats ?? null,
    goal: chapterEntry.goal ?? null,
    conflict: chapterEntry.conflict ?? null,
    hook: chapterEntry.hook ?? null,
  };

  const outlineFile = readOptionalSafeText(root, '01-大纲.md', 'R3_FP_PLANNING_FILE_UNSAFE');
  const charsFile = readOptionalSafeText(root, '00-人物档案.md', 'R3_FP_PLANNING_FILE_UNSAFE');
  const styleFile = readOptionalSafeText(root, '03-文风基准.md', 'R3_FP_PLANNING_FILE_UNSAFE');
  const dedicatedOutline = isNonEmptyString(chapterEntry.outlinePath)
    ? readOptionalSafeText(root, chapterEntry.outlinePath, 'R3_FP_PLANNING_FILE_UNSAFE')
    : {exists: false, text: null};

  let outlineCore = null;
  let currentVolumeId = Number.isSafeInteger(chapterEntry.volume)
    ? chapterEntry.volume
    : Number.isSafeInteger(chapterEntry.volumeId)
      ? chapterEntry.volumeId
      : null;
  let currentVolumeAnchor = null;
  let chapterOutlineSlice = null;
  let rawOutlineFallback = null;

  if (outlineFile.exists) {
    chapterOutlineSlice = extractChapterOutlineRaw(outlineFile.text, chapterNumber);
    try {
      const split = splitR3Markdown('01-大纲.md', outlineFile.text);
      outlineCore = split.core;
      let matchedVol = null;
      if (currentVolumeId !== null) {
        matchedVol = split.volumes.find(v => v.volId === currentVolumeId) ?? null;
      }
      if (!matchedVol) {
        const chTagRe = new RegExp(`第\\s*${buildChapterTagPattern(chapterNumber)}\\s*章`);
        matchedVol = split.volumes.find(v => chTagRe.test(v.text)) ?? null;
      }
      if (!matchedVol && split.volumes.length > 0) {
        matchedVol = split.volumes[split.volumes.length - 1];
      }
      if (matchedVol) {
        currentVolumeId = matchedVol.volId;
        currentVolumeAnchor = matchedVol.text;
      }
    } catch {
      // Non-R3-split outline file: bind full outline text so any 1-byte edit invalidates fingerprint
      rawOutlineFallback = outlineFile.text;
    }
  }

  let charCore = null;
  if (charsFile.exists) {
    try {
      charCore = splitR3Markdown('00-人物档案.md', charsFile.text).core;
    } catch {
      charCore = charsFile.text;
    }
  }

  let styleCore = null;
  if (styleFile.exists) {
    try {
      styleCore = splitR3Markdown('03-文风基准.md', styleFile.text).core;
    } catch {
      styleCore = styleFile.text;
    }
  }

  const r3 = isPlainObject(plan.v3?.r3) ? plan.v3.r3 : null;
  const volCkpt =
    currentVolumeId !== null && isPlainObject(r3?.volumeCheckpoints?.[String(currentVolumeId)])
      ? {
          status: r3.volumeCheckpoints[String(currentVolumeId)].status ?? null,
          snapshotSha256: r3.volumeCheckpoints[String(currentVolumeId)].snapshotSha256 ?? null,
        }
      : null;

  return {
    chapterMeta,
    corePlanRef: isPlainObject(r3?.corePlan)
      ? {
          status: r3.corePlan.status ?? null,
          snapshotSha256: r3.corePlan.snapshotSha256 ?? null,
        }
      : null,
    volumeCheckpointRef: volCkpt,
    outlineCore,
    charCore,
    styleCore,
    currentVolumeId,
    currentVolumeAnchor,
    chapterOutlineSlice,
    dedicatedOutline: dedicatedOutline.exists ? dedicatedOutline.text : null,
    rawOutlineFallback,
  };
}

/**
 * Extract deterministic ledger slice up to N-1 (active global facts + relationships + foreshadowing + previous handoff).
 */
function buildLedgerSlice(root, chapterNumber) {
  const upto = chapterNumber - 1;
  const ledgerFile = readOptionalSafeText(root, 'story-ledger.json', 'R3_FP_LEDGER_UNSAFE_OR_INVALID');
  if (!ledgerFile.exists) {
    return {
      present: false,
      uptoChapter: upto,
      activeFacts: [],
      foreshadowing: [],
      relationships: [],
      mechanisms: [],
      previousHandoff: null,
      r3Checks: [],
    };
  }
  let ledger;
  try {
    ledger = JSON.parse(ledgerFile.text.replace(/^\uFEFF/, ''));
  } catch {
    throw new Error('R3_FP_LEDGER_UNSAFE_OR_INVALID');
  }
  if (!isPlainObject(ledger) || ledger.schemaVersion !== 1 ||
      !Array.isArray(ledger.facts) ||
      !Array.isArray(ledger.foreshadowing) ||
      !Array.isArray(ledger.relationships) ||
      !Array.isArray(ledger.mechanisms) ||
      !Array.isArray(ledger.handoffs)) {
    throw new Error('R3_FP_LEDGER_UNSAFE_OR_INVALID');
  }

  const byChapterAndId = (a, b) =>
    (a.chapter - b.chapter) || String(a.id ?? '').localeCompare(String(b.id ?? ''), 'en');

  const visibleFacts = ledger.facts.filter(
    f => isPlainObject(f) && Number.isSafeInteger(f.chapter) && f.chapter <= upto
  );
  const visibleFactIds = new Set(visibleFacts.map(f => f.id));
  const activeFacts = visibleFacts
    .filter(f => f.kind !== 'provisional' && !(f.supersededBy && visibleFactIds.has(f.supersededBy)))
    .sort(byChapterAndId);

  const foreshadowing = ledger.foreshadowing
    .filter(f => isPlainObject(f) && Number.isSafeInteger(f.chapter) && f.chapter <= upto)
    .sort(byChapterAndId);

  const relationships = ledger.relationships
    .filter(r => isPlainObject(r) && Number.isSafeInteger(r.chapter) && r.chapter <= upto)
    .sort(byChapterAndId);

  const mechanisms = ledger.mechanisms
    .filter(m => isPlainObject(m) && Number.isSafeInteger(m.chapter) && m.chapter <= upto)
    .sort(byChapterAndId);

  const visibleHandoffs = ledger.handoffs
    .filter(h => isPlainObject(h) && Number.isSafeInteger(h.chapter) && h.chapter <= upto)
    .sort((a, b) => a.chapter - b.chapter);
  const previousHandoff = visibleHandoffs.length > 0 ? visibleHandoffs[visibleHandoffs.length - 1] : null;

  const r3Checks = Array.isArray(ledger.r3Checks)
    ? ledger.r3Checks
        .filter(c => isPlainObject(c) && Number.isSafeInteger(c.chapter) && c.chapter <= upto)
        .sort(byChapterAndId)
    : [];

  return {
    present: true,
    uptoChapter: upto,
    activeFacts,
    foreshadowing,
    relationships,
    mechanisms,
    previousHandoff,
    r3Checks,
  };
}

/**
 * Extract deterministic author hardConstraints slice (global + chapter-level).
 */
function buildHardConstraintsSlice(plan, chapterEntry) {
  if (plan.hardConstraints !== undefined && plan.hardConstraints !== null && !isPlainObject(plan.hardConstraints)) {
    throw new Error('R3_FP_HARD_CONSTRAINTS_INVALID');
  }
  if (chapterEntry.hardConstraints !== undefined && chapterEntry.hardConstraints !== null && !isPlainObject(chapterEntry.hardConstraints)) {
    throw new Error('R3_FP_HARD_CONSTRAINTS_INVALID');
  }
  return {
    global: plan.hardConstraints ?? null,
    chapter: chapterEntry.hardConstraints ?? null,
  };
}

/**
 * Pure read-only computation of five-tuple composite `reviewFingerprint` (PRD P0-4 / `06` §2.1).
 * Target latency: < 30ms per chapter.
 */
export function computeReviewFingerprint(projectDir, chapterNumber, {plan: preloadedPlan = null} = {}) {
  const t0 = performance.now();
  const root = projectRoot(projectDir);
  if (!Number.isSafeInteger(chapterNumber) || chapterNumber < 1) {
    throw new Error('R3_FP_INVALID_CHAPTER');
  }
  const plan = preloadedPlan ?? readPlan(root);
  if (!Array.isArray(plan?.chapters)) {
    throw new Error('R3_FP_PLAN_INVALID');
  }
  const chapterEntry = plan.chapters.find(c => c?.chapterNumber === chapterNumber);
  if (!chapterEntry || !isNonEmptyString(chapterEntry.filePath)) {
    throw new Error('R3_FP_CHAPTER_NOT_IN_PLAN');
  }

  const ms = readOptionalSafeText(root, chapterEntry.filePath, 'R3_FP_MANUSCRIPT_MISSING_OR_UNSAFE');
  if (!ms.exists) {
    throw new Error('R3_FP_MANUSCRIPT_MISSING_OR_UNSAFE');
  }

  const manuscriptSha256 = sha256(ms.bytes);
  const planningSlice = buildPlanningSlice(root, plan, chapterEntry, chapterNumber);
  const planningSliceSha256 = sha256Canonical(planningSlice);
  const ledgerSlice = buildLedgerSlice(root, chapterNumber);
  const ledgerSliceSha256 = sha256Canonical(ledgerSlice);
  const hardConstraintsSlice = buildHardConstraintsSlice(plan, chapterEntry);
  const hardConstraintsHash = sha256Canonical(hardConstraintsSlice);

  const components = {
    manuscriptSha256,
    planningSliceSha256,
    ledgerSliceSha256,
    hardConstraintsHash,
    protocolVersion: R3_REVIEW_PROTOCOL_VERSION,
  };
  const reviewFingerprint = sha256Canonical(components);
  const elapsedMs = Number((performance.now() - t0).toFixed(2));

  return {
    chapter: chapterNumber,
    chapterFilePath: chapterEntry.filePath,
    reviewFingerprint,
    components,
    manuscriptText: ms.text,
    elapsedMs,
  };
}

function getOrCreateReviewV3State(plan) {
  if (!hasR3Namespace(plan) || !validR3Namespace(plan.v3.r3)) {
    throw new Error('R3_NOT_ENABLED');
  }
  if (!isPlainObject(plan.v3.r3.reviewV3)) {
    plan.v3.r3.reviewV3 = {
      schemaVersion: 1,
      protocolVersion: R3_REVIEW_PROTOCOL_VERSION,
      chapterReviews: {},
    };
  }
  if (!isPlainObject(plan.v3.r3.reviewV3.chapterReviews)) {
    plan.v3.r3.reviewV3.chapterReviews = {};
  }
  return plan.v3.r3.reviewV3;
}

function ensureSafeSubdir(root, relDir, failCode = 'R3_PATH_UNSAFE') {
  const realRoot = fs.realpathSync(root);
  const target = path.resolve(realRoot, relDir);
  const rel = path.relative(realRoot, target);
  if (!rel || rel.startsWith('..') || path.isAbsolute(rel)) {
    throw new Error(failCode);
  }
  let cur = realRoot;
  for (const seg of rel.split(path.sep)) {
    if (!seg || seg === '.' || seg === '..') throw new Error(failCode);
    cur = path.join(cur, seg);
    if (fs.existsSync(cur)) {
      const st = fs.lstatSync(cur);
      if (!st.isDirectory() || st.isSymbolicLink()) throw new Error(failCode);
    } else {
      fs.mkdirSync(cur);
    }
  }
  const realTarget = fs.realpathSync(target);
  if (!realTarget.startsWith(realRoot + path.sep)) {
    throw new Error(failCode);
  }
  return realTarget;
}

/**
 * Prepare / freeze an R3 v3 review packet without empty `revision` increments (PRD P0-4 Step 3 / TC-P0-4-6).
 *
 * Guarantees:
 *  - `dryRun: true` -> 0 disk writes, 0 `revision` increments.
 *  - `precheck v2` `blocking: true` (`hardErrors`) -> 0 disk writes, 0 `revision` increments, fails closed (`exit code 2`).
 *  - Only after `precheck v2` passes with `blocking: false` does this allocate a new `revision`, freeze snapshot,
 *    write immutable input packet, and record `reviewFingerprint` under `v3.r3.reviewV3` (leaving `v3.r2` untouched).
 */
export function prepareR3Review(
  projectDir,
  chapterNumber,
  {dryRun = false, writerRunId = null, writerContextId = null} = {}
) {
  const root = projectRoot(projectDir);
  if (!Number.isSafeInteger(chapterNumber) || chapterNumber < 1) {
    return {
      ok: false,
      exitCode: 2,
      error: 'R3_INVALID_CHAPTER',
      revisionAllocated: false,
    };
  }
  const plan = readPlan(root);
  if (!hasR3Namespace(plan) || !validR3Namespace(plan.v3.r3)) {
    return {
      ok: false,
      exitCode: 2,
      error: 'R3_NOT_ENABLED',
      revisionAllocated: false,
    };
  }
  const existingRec = plan.v3.r3.reviewV3?.chapterReviews?.[String(chapterNumber)] ?? null;
  const currentRevision = Number.isSafeInteger(existingRec?.revision) ? existingRec.revision : 0;

  // Step 1: Always run pure read-only precheck v2 BEFORE freezing or allocating any revision
  const precheck = precheckChapterV2(root, chapterNumber, {dryRun: true});

  if (dryRun) {
    let fingerprint = null;
    if (!precheck.blocking) {
      try {
        fingerprint = computeReviewFingerprint(root, chapterNumber, {plan}).reviewFingerprint;
      } catch {
        fingerprint = null;
      }
    }
    return {
      ok: !precheck.blocking,
      exitCode: precheck.blocking ? 2 : 0,
      status: precheck.blocking ? 'precheck_blocked' : 'dry_run_ok',
      dryRun: true,
      chapter: chapterNumber,
      revisionAllocated: false,
      currentRevision,
      reviewFingerprint: fingerprint,
      precheck,
    };
  }

  if (precheck.blocking) {
    // Strictly NO snapshot, NO packet write, NO plan write, NO revision increment!
    return {
      ok: false,
      exitCode: 2,
      status: 'precheck_blocked',
      error: 'R3_PRECHECK_BLOCKED',
      chapter: chapterNumber,
      revisionAllocated: false,
      currentRevision,
      hardErrors: precheck.hardErrors,
      precheck,
    };
  }

  if (!isNonEmptyString(writerRunId) || !isNonEmptyString(writerContextId)) {
    return {
      ok: false,
      exitCode: 2,
      status: 'error',
      error: 'R3_WRITER_PROVENANCE_REQUIRED',
      chapter: chapterNumber,
      revisionAllocated: false,
      currentRevision,
    };
  }

  const fp = computeReviewFingerprint(root, chapterNumber, {plan});

  // Crash-resume / idempotency guard: if already under_review for exact same reviewFingerprint,
  // verify frozen packet + snapshot integrity before reusing without burning a revision
  if (existingRec?.status === 'under_review' &&
      existingRec.reviewFingerprint === fp.reviewFingerprint) {
    const existingInput = isNonEmptyString(existingRec.inputPath) ? safeFile(root, existingRec.inputPath) : null;
    if (!existingInput || sha256(fs.readFileSync(existingInput)) !== existingRec.inputSha256) {
      return {
        ok: false,
        exitCode: 2,
        status: 'error',
        error: 'R3_EXISTING_FREEZE_CORRUPT',
        chapter: chapterNumber,
        revisionAllocated: false,
        currentRevision,
      };
    }
    try {
      verifySnapshot(root, existingRec.snapshot?.path, existingRec.snapshot?.sha256);
    } catch {
      return {
        ok: false,
        exitCode: 2,
        status: 'error',
        error: 'R3_EXISTING_FREEZE_CORRUPT',
        chapter: chapterNumber,
        revisionAllocated: false,
        currentRevision,
      };
    }
    return {
      ok: true,
      exitCode: 0,
      status: 'under_review',
      reused: true,
      chapter: chapterNumber,
      revision: existingRec.revision,
      revisionAllocated: false,
      reviewFingerprint: existingRec.reviewFingerprint,
      fingerprintComponents: existingRec.fingerprintComponents,
      inputPath: existingRec.inputPath,
      snapshot: existingRec.snapshot,
      needsSemanticAudit: precheck.needsSemanticAudit,
      effectiveReviewSubmissions: existingRec.effectiveReviewSubmissions ?? 0,
    };
  }

  const nextRevision = currentRevision + 1;
  const pad3 = String(chapterNumber).padStart(3, '0');
  const chFileName = `chapter-${String(chapterNumber).padStart(4, '0')}.md`;
  const snapRel = `reviews/r3/review-v3/chapter-${chapterNumber}/v${nextRevision}`;
  const snap = createSnapshot(root, snapRel, {
    [chFileName]: fp.manuscriptText,
    'fingerprint.json': JSON.stringify(
      {
        schemaVersion: 1,
        chapter: chapterNumber,
        revision: nextRevision,
        reviewFingerprint: fp.reviewFingerprint,
        components: fp.components,
      },
      null,
      2
    ) + '\n',
    'precheck.json': JSON.stringify(precheck, null, 2) + '\n',
  });

  const inputDirAbs = ensureSafeSubdir(root, 'reviews/r3/review-v3', 'R3_REVIEW_DIR_UNSAFE');
  const inputRel = `reviews/r3/review-v3/input-ch${pad3}-v${nextRevision}.json`;
  const manuscriptHashes = {[String(chapterNumber)]: fp.components.manuscriptSha256};
  const packet = {
    schemaVersion: R3_REVIEW_INPUT_SCHEMA,
    protocolVersion: R3_REVIEW_PROTOCOL_VERSION,
    chapter: chapterNumber,
    revision: nextRevision,
    reviewFingerprint: fp.reviewFingerprint,
    fingerprintComponents: fp.components,
    manuscriptHashes,
    manuscriptPath: fp.chapterFilePath,
    snapshot: {path: snap.path, sha256: snap.sha256},
    writers: [{chapter: chapterNumber, runId: writerRunId.trim(), contextId: writerContextId.trim()}],
    needsSemanticAudit: precheck.needsSemanticAudit,
    preparedAt: new Date().toISOString(),
  };

  const inputBytes = Buffer.from(JSON.stringify(packet, null, 2) + '\n', 'utf8');
  const inputAbs = path.join(inputDirAbs, `input-ch${pad3}-v${nextRevision}.json`);
  fs.writeFileSync(inputAbs, inputBytes, {flag: 'wx'});

  const rv3 = getOrCreateReviewV3State(plan);
  rv3.chapterReviews[String(chapterNumber)] = {
    status: 'under_review',
    revision: nextRevision,
    effectiveReviewSubmissions: Number.isSafeInteger(existingRec?.effectiveReviewSubmissions)
      ? existingRec.effectiveReviewSubmissions
      : 0,
    reviewFingerprint: fp.reviewFingerprint,
    fingerprintComponents: fp.components,
    manuscriptHashes,
    snapshot: {path: snap.path, sha256: snap.sha256},
    inputPath: inputRel,
    inputSha256: sha256(inputBytes),
    reportPath: null,
    reportSha256: null,
    history: Array.isArray(existingRec?.history) ? existingRec.history : [],
  };

  atomicWritePlan(root, plan);

  return {
    ok: true,
    exitCode: 0,
    status: 'under_review',
    reused: false,
    chapter: chapterNumber,
    revision: nextRevision,
    revisionAllocated: true,
    reviewFingerprint: fp.reviewFingerprint,
    fingerprintComponents: fp.components,
    manuscriptHashes,
    inputPath: inputRel,
    snapshot: {path: snap.path, sha256: snap.sha256},
    needsSemanticAudit: precheck.needsSemanticAudit,
    effectiveReviewSubmissions: rv3.chapterReviews[String(chapterNumber)].effectiveReviewSubmissions,
  };
}

/**
 * Pure read-only Fail-Closed validation of an R3 v3 review report (`FinalCalibrationReport` or `Pass1DiscoveryReport`).
 *
 * Checks:
 *  1. Frozen snapshot integrity + live five-tuple `reviewFingerprint` equality (`fingerprint_mismatch`)
 *  2. Reviewer identity & anti-self-review against `packet.writers`
 *  3. Exact 6-dimension `dimensionAuditSlots` (`HL-1`~`HL-6`) with non-empty `checkedAnchor`
 *  4. Complete `NEEDS_SEMANTIC_AUDIT` (`auditId`) resolution with allowed status
 *  5. Verbatim `quote` matching inside frozen manuscript text (issues, candidates, preserveStrengths)
 *  6. Mandatory non-empty `reverseDefense` and valid `impactScope` on every `BLOCKER`/`MAJOR`
 *  7. S1 `SUGGESTION` non-blocking invariant & `OR6` `PLANNING_CONFLICT_BLOCK` consistency
 */
export function validateR3ReviewReport(projectDir, chapterNumber, reportObj, {allowDiscovery = true} = {}) {
  const errors = [];
  const addErr = (code, message, extra = {}) => {
    errors.push({code, message, ...extra});
  };

  let root;
  let plan;
  try {
    root = projectRoot(projectDir);
    plan = readPlan(root);
  } catch (err) {
    addErr('R3_PROJECT_OR_PLAN_INVALID', err?.message || '无法读取项目或 02-写作计划.json。');
    return {ok: false, exitCode: 2, errors};
  }

  if (!Number.isSafeInteger(chapterNumber) || chapterNumber < 1) {
    addErr('R3_INVALID_CHAPTER', '章号必须是正整数。');
    return {ok: false, exitCode: 2, errors};
  }
  if (!hasR3Namespace(plan) || !validR3Namespace(plan.v3.r3)) {
    addErr('R3_NOT_ENABLED', '当前项目未启用合法的 v3.r3 命名空间。');
    return {ok: false, exitCode: 2, errors};
  }

  const rec = plan.v3.r3.reviewV3?.chapterReviews?.[String(chapterNumber)];
  if (!isPlainObject(rec) || rec.status !== 'under_review' ||
      !Number.isSafeInteger(rec.revision) || rec.revision < 1 ||
      !isNonEmptyString(rec.inputPath) || !HEX64_RE.test(rec.inputSha256 ?? '') ||
      !HEX64_RE.test(rec.reviewFingerprint ?? '') ||
      !isPlainObject(rec.snapshot) || !isNonEmptyString(rec.snapshot.path) || !HEX64_RE.test(rec.snapshot.sha256 ?? '')) {
    addErr('R3_REVIEW_NOT_PREPARED', `第 ${chapterNumber} 章尚未处于合法的 R3 v3 under_review 冻结状态。`);
    return {ok: false, exitCode: 2, errors};
  }

  // Load and verify frozen input packet
  const inputFile = safeFile(root, rec.inputPath);
  if (!inputFile) {
    addErr('R3_INPUT_PACKET_MISSING', `冻结审稿输入包 ${rec.inputPath} 缺失或路径非法。`);
    return {ok: false, exitCode: 2, errors};
  }
  const inputBytes = fs.readFileSync(inputFile);
  if (sha256(inputBytes) !== rec.inputSha256) {
    addErr('R3_INPUT_PACKET_CHANGED', `冻结审稿输入包 ${rec.inputPath} 哈希与计划记录不匹配。`);
    return {ok: false, exitCode: 2, errors};
  }
  let packet;
  try {
    packet = JSON.parse(inputBytes.toString('utf8').replace(/^\uFEFF/, ''));
  } catch {
    addErr('R3_INPUT_PACKET_CORRUPT', `冻结审稿输入包 ${rec.inputPath} JSON 损坏。`);
    return {ok: false, exitCode: 2, errors};
  }
  if (!isPlainObject(packet) || packet.schemaVersion !== R3_REVIEW_INPUT_SCHEMA ||
      packet.chapter !== chapterNumber || packet.revision !== rec.revision ||
      packet.reviewFingerprint !== rec.reviewFingerprint ||
      !Array.isArray(packet.writers) || packet.writers.length === 0 ||
      !Array.isArray(packet.needsSemanticAudit)) {
    addErr('R3_INPUT_PACKET_INVALID', `冻结审稿输入包 ${rec.inputPath} 结构或版本与计划记录不匹配。`);
    return {ok: false, exitCode: 2, errors};
  }

  // Verify immutable frozen snapshot
  let frozenSnap;
  try {
    frozenSnap = verifySnapshot(root, rec.snapshot.path, rec.snapshot.sha256);
  } catch (err) {
    addErr('R3_SNAPSHOT_INVALID', `冻结审稿快照校验失败：${err?.message || 'SNAPSHOT_ERROR'}`);
    return {ok: false, exitCode: 2, errors};
  }
  const chFileName = `chapter-${String(chapterNumber).padStart(4, '0')}.md`;
  if (!hasOwn(frozenSnap.files, chFileName)) {
    addErr('R3_SNAPSHOT_MANUSCRIPT_MISSING', `冻结快照缺少正文文件 ${chFileName}。`);
    return {ok: false, exitCode: 2, errors};
  }
  const frozenManuscriptText = frozenSnap.files[chFileName];
  const frozenManuscriptSha = sha256(Buffer.from(frozenManuscriptText, 'utf8'));
  if (packet.manuscriptHashes?.[String(chapterNumber)] !== frozenManuscriptSha) {
    addErr('fingerprint_mismatch', '冻结快照正文哈希与审稿输入包 manuscriptHashes 不一致。');
    return {ok: false, exitCode: 2, errors};
  }

  // Recompute LIVE five-tuple reviewFingerprint (detects 1-byte change in manuscript / outline / ledger / hardConstraints!)
  let liveFp;
  try {
    liveFp = computeReviewFingerprint(root, chapterNumber, {plan});
  } catch (err) {
    addErr('fingerprint_mismatch', `实时复合审读指纹计算失败：${err?.message || 'FP_ERROR'}`);
    return {ok: false, exitCode: 2, errors};
  }

  if (liveFp.reviewFingerprint !== rec.reviewFingerprint) {
    const changedParts = [];
    for (const key of ['manuscriptSha256', 'planningSliceSha256', 'ledgerSliceSha256', 'hardConstraintsHash', 'protocolVersion']) {
      if (liveFp.components[key] !== rec.fingerprintComponents?.[key]) {
        changedParts.push(key);
      }
    }
    addErr(
      'fingerprint_mismatch',
      `当前项目状态与冻结审稿指纹不匹配（变更分量：${changedParts.join(', ') || 'unknown'}），旧报告不可用于本稿提交。`,
      {expectedFingerprint: rec.reviewFingerprint, liveFingerprint: liveFp.reviewFingerprint, changedParts}
    );
  }

  if (!isPlainObject(reportObj)) {
    addErr('R3_REPORT_NOT_OBJECT', '审稿报告必须是 JSON 对象。');
    return {ok: false, exitCode: 2, errors};
  }

  const isDiscovery = reportObj.schemaVersion === R3_DISCOVERY_REPORT_SCHEMA;
  const isFinal = reportObj.schemaVersion === R3_FINAL_REPORT_SCHEMA;
  if (!isFinal && !(allowDiscovery && isDiscovery)) {
    addErr(
      'R3_REPORT_SCHEMA_INVALID',
      `不支持的审稿报告 schemaVersion：${String(reportObj.schemaVersion)}（期望 ${R3_FINAL_REPORT_SCHEMA}${allowDiscovery ? ` 或 ${R3_DISCOVERY_REPORT_SCHEMA}` : ''}）。`
    );
    return {ok: false, exitCode: 2, errors};
  }

  // Check report.reviewFingerprint against both frozen record and live recomputed fingerprint
  if (!isNonEmptyString(reportObj.reviewFingerprint) ||
      !HEX64_RE.test(reportObj.reviewFingerprint) ||
      reportObj.reviewFingerprint !== rec.reviewFingerprint ||
      reportObj.reviewFingerprint !== liveFp.reviewFingerprint) {
    addErr(
      'fingerprint_mismatch',
      '审稿报告中的 reviewFingerprint 缺失或与当前冻结/实时五元组指纹不匹配。',
      {
        reportFingerprint: reportObj.reviewFingerprint ?? null,
        expectedFingerprint: rec.reviewFingerprint,
        liveFingerprint: liveFp.reviewFingerprint,
      }
    );
  }

  // Optional report.manuscriptHashes consistency (if supplied, must match frozen manuscript SHA)
  if (reportObj.manuscriptHashes !== undefined) {
    if (!isPlainObject(reportObj.manuscriptHashes)) {
      addErr('fingerprint_mismatch', '报告 manuscriptHashes 必须是对象。');
    } else {
      const mhKeys = Object.keys(reportObj.manuscriptHashes);
      const byNum = reportObj.manuscriptHashes[String(chapterNumber)];
      const byPath = reportObj.manuscriptHashes[packet.manuscriptPath];
      const matched =
        (mhKeys.length === 1 && (byNum === frozenManuscriptSha || byPath === frozenManuscriptSha)) ||
        (mhKeys.length === 2 && byNum === frozenManuscriptSha && byPath === frozenManuscriptSha);
      if (!matched) {
        addErr('fingerprint_mismatch', '报告 manuscriptHashes 与冻结正文 SHA-256 不一致。');
      }
    }
  }

  // Protocol mode validation
  if (!ALLOWED_PROTOCOL_MODES.includes(reportObj.protocolMode)) {
    addErr('R3_PROTOCOL_MODE_INVALID', `非法 protocolMode：${String(reportObj.protocolMode)}。`);
  } else if (isDiscovery && reportObj.protocolMode !== 'two_stage_B') {
    addErr('R3_PROTOCOL_MODE_INVALID', 'Pass1DiscoveryReport 仅适用于 protocolMode="two_stage_B"。');
  }

  // Independent reviewer validation + anti-self-review
  if (!isPlainObject(reportObj.reviewer) ||
      !isNonEmptyString(reportObj.reviewer.runId) ||
      !isNonEmptyString(reportObj.reviewer.contextId) ||
      !isNonEmptyString(reportObj.reviewer.role)) {
    addErr('R3_REVIEWER_MISSING', '审稿报告缺少合法的 reviewer（runId/contextId/role）。');
  } else if (packet.writers.some(
    w => w.runId === reportObj.reviewer.runId || w.contextId === reportObj.reviewer.contextId
  )) {
    addErr('R3_REVIEW_SELF_REVIEW', '审稿人 runId/contextId 与写手重合，禁止自审。');
  }

  // 1. Fail-Closed 6-dimension `dimensionAuditSlots` (HL-1 ~ HL-6)
  if (!Array.isArray(reportObj.dimensionAuditSlots)) {
    addErr('R3_DIMENSION_AUDIT_SLOTS_INCOMPLETE', '缺少 dimensionAuditSlots 数组。');
  } else {
    const seenDims = new Set();
    for (const [idx, slot] of reportObj.dimensionAuditSlots.entries()) {
      if (!isPlainObject(slot) || !DIMENSION_SLOTS.includes(slot.dimension)) {
        addErr('R3_DIMENSION_AUDIT_SLOT_INVALID', `dimensionAuditSlots[${idx}] 维度非法。`, {index: idx});
        continue;
      }
      if (seenDims.has(slot.dimension)) {
        addErr('R3_DIMENSION_AUDIT_SLOT_DUPLICATE', `dimensionAuditSlots 存在重复维度 ${slot.dimension}。`, {dimension: slot.dimension});
        continue;
      }
      seenDims.add(slot.dimension);
      if (!isNonEmptyString(slot.checkedAnchor)) {
        addErr('R3_DIMENSION_AUDIT_ANCHOR_EMPTY', `维度 ${slot.dimension} 的 checkedAnchor 不能为空。`, {dimension: slot.dimension});
      }
      if (!ALLOWED_SLOT_STATUSES.includes(slot.status)) {
        addErr('R3_DIMENSION_AUDIT_STATUS_INVALID', `维度 ${slot.dimension} 的 status 非法（期望 pass | issue_raised）。`, {dimension: slot.dimension});
      }
    }
    const missingDims = DIMENSION_SLOTS.filter(d => !seenDims.has(d));
    if (missingDims.length > 0) {
      addErr(
        'R3_DIMENSION_AUDIT_SLOTS_INCOMPLETE',
        `dimensionAuditSlots 缺失必填维度：${missingDims.join(', ')}。`,
        {missingDimensions: missingDims}
      );
    }
  }

  // 2. Fail-Closed `NEEDS_SEMANTIC_AUDIT` complete resolution
  const requiredAuditIds = packet.needsSemanticAudit.map(item => item.auditId);
  const requiredAuditSet = new Set(requiredAuditIds);
  if (!Array.isArray(reportObj.semanticAuditResolutions)) {
    addErr('R3_SEMANTIC_AUDIT_UNRESOLVED', '缺少 semanticAuditResolutions 数组。');
  } else {
    const resolvedIds = new Set();
    for (const [idx, resItem] of reportObj.semanticAuditResolutions.entries()) {
      if (!isPlainObject(resItem) || !isNonEmptyString(resItem.auditId)) {
        addErr('R3_SEMANTIC_AUDIT_ENTRY_INVALID', `semanticAuditResolutions[${idx}] 缺少 auditId。`, {index: idx});
        continue;
      }
      if (!requiredAuditSet.has(resItem.auditId)) {
        addErr('R3_SEMANTIC_AUDIT_UNKNOWN_ID', `semanticAuditResolutions 包含未知的 auditId：${resItem.auditId}。`, {auditId: resItem.auditId});
        continue;
      }
      if (resolvedIds.has(resItem.auditId)) {
        addErr('R3_SEMANTIC_AUDIT_DUPLICATE_ID', `semanticAuditResolutions 存在重复核销的 auditId：${resItem.auditId}。`, {auditId: resItem.auditId});
        continue;
      }
      resolvedIds.add(resItem.auditId);
      if (!ALLOWED_NSA_STATUSES.includes(resItem.status)) {
        addErr(
          'R3_SEMANTIC_AUDIT_STATUS_INVALID',
          `auditId=${resItem.auditId} 的核销状态非法（期望 pass | issue_raised | insufficient_material）。`,
          {auditId: resItem.auditId}
        );
      }
      if (!isNonEmptyString(resItem.note)) {
        addErr('R3_SEMANTIC_AUDIT_NOTE_EMPTY', `auditId=${resItem.auditId} 必须提供非空核销说明 note。`, {auditId: resItem.auditId});
      }
    }
    const unresolvedIds = requiredAuditIds.filter(id => !resolvedIds.has(id));
    if (unresolvedIds.length > 0) {
      addErr(
        'R3_SEMANTIC_AUDIT_UNRESOLVED',
        `以下 precheck v2 语义待核线索未核销：${unresolvedIds.join(', ')}。`,
        {unresolvedAuditIds: unresolvedIds}
      );
    }
  }

  // Helper: verify verbatim quote in frozen manuscript
  const assertVerbatimQuote = (quote, ownerLabel) => {
    if (!isNonEmptyString(quote)) {
      addErr('R3_QUOTE_MISSING', `${ownerLabel} 缺少非空原句引用 quote。`, {target: ownerLabel});
      return;
    }
    if (!frozenManuscriptText.includes(quote)) {
      addErr(
        'R3_QUOTE_NOT_IN_FROZEN_MANUSCRIPT',
        `${ownerLabel} 的 quote 在冻结正文中无法逐字匹配（拦截伪造引文）。`,
        {target: ownerLabel, quote}
      );
    }
  };

  // Validate optional preserveStrengths verbatim quotes
  if (reportObj.preserveStrengths !== undefined) {
    if (!Array.isArray(reportObj.preserveStrengths)) {
      addErr('R3_PRESERVE_STRENGTHS_INVALID', 'preserveStrengths 必须是数组。');
    } else {
      for (const [idx, s] of reportObj.preserveStrengths.entries()) {
        if (!isPlainObject(s) || !isNonEmptyString(s.reason)) {
          addErr('R3_PRESERVE_STRENGTHS_INVALID', `preserveStrengths[${idx}] 缺少 reason。`, {index: idx});
          continue;
        }
        assertVerbatimQuote(s.quote, `preserveStrengths[${idx}]`);
      }
    }
  }

  // 3. Schema-specific validation: Discovery vs Final
  if (isDiscovery) {
    if (!Array.isArray(reportObj.candidates)) {
      addErr('R3_CANDIDATES_INVALID', 'Pass1DiscoveryReport 必须包含 candidates 数组。');
    } else {
      const candIds = new Set();
      for (const [idx, cand] of reportObj.candidates.entries()) {
        const label = `candidates[${idx}]`;
        if (!isPlainObject(cand) || !isNonEmptyString(cand.candidateId) || candIds.has(cand.candidateId)) {
          addErr('R3_CANDIDATE_INVALID', `${label} 缺少唯一 candidateId。`, {index: idx});
          continue;
        }
        candIds.add(cand.candidateId);
        if (!DIMENSION_SLOTS.includes(cand.dimension)) {
          addErr('R3_CANDIDATE_DIMENSION_INVALID', `${label} 维度非法：${String(cand.dimension)}。`, {candidateId: cand.candidateId});
        }
        if (!isNonEmptyString(cand.objectiveContradiction)) {
          addErr('R3_CANDIDATE_EVIDENCE_EMPTY', `${label} 缺少 objectiveContradiction。`, {candidateId: cand.candidateId});
        }
        if (!ALLOWED_IMPACT_SCOPES.includes(cand.suspectedImpactScope)) {
          addErr('R3_INVALID_IMPACT_SCOPE', `${label} suspectedImpactScope 非法：${String(cand.suspectedImpactScope)}。`, {candidateId: cand.candidateId});
        }
        assertVerbatimQuote(cand.quote, `${label}(${cand.candidateId})`);
      }
    }
  } else if (isFinal) {
    if (!ALLOWED_FINAL_DECISIONS.includes(reportObj.decision)) {
      addErr('R3_DECISION_INVALID', `非法 decision：${String(reportObj.decision)}（期望 pass_candidate | revise | PLANNING_CONFLICT_BLOCK）。`);
    }
    if (!Array.isArray(reportObj.issues)) {
      addErr('R3_ISSUES_INVALID', 'FinalCalibrationReport 必须包含 issues 数组。');
    } else {
      const issueIds = new Set();
      let hasBlockingIssue = false;
      let hasPlanningOrCanonConflict = false;
      for (const [idx, issue] of reportObj.issues.entries()) {
        const label = `issues[${idx}]`;
        if (!isPlainObject(issue) || !isNonEmptyString(issue.id) || issueIds.has(issue.id)) {
          addErr('R3_ISSUE_INVALID', `${label} 缺少唯一 id。`, {index: idx});
          continue;
        }
        issueIds.add(issue.id);
        const idLabel = `${label}(${issue.id})`;
        if (!DIMENSION_SLOTS.includes(issue.dimension)) {
          addErr('R3_ISSUE_DIMENSION_INVALID', `${idLabel} 维度非法：${String(issue.dimension)}。`, {issueId: issue.id});
        }
        if (!S1_SEVERITIES.includes(issue.severity)) {
          addErr('R3_ISSUE_SEVERITY_INVALID', `${idLabel} severity 非法：${String(issue.severity)}。`, {issueId: issue.id});
        }
        if (!isNonEmptyString(issue.evidence) && !isNonEmptyString(issue.reason)) {
          addErr('R3_ISSUE_EVIDENCE_EMPTY', `${idLabel} 缺少非空 evidence/reason 说明。`, {issueId: issue.id});
        }
        assertVerbatimQuote(issue.quote, idLabel);

        // S1 non-blocking invariants: SUGGESTION and MINOR never block and never enter mustCloseInReReview (06 §3.1)
        if (issue.severity === 'SUGGESTION') {
          if (issue.blocking === true || issue.mustCloseInReReview === true) {
            addErr('R3_SUGGESTION_CANNOT_BLOCK', `${idLabel} 为 SUGGESTION，禁止设置 blocking=true 或 mustCloseInReReview=true。`, {issueId: issue.id});
          }
        } else if (issue.severity === 'MINOR') {
          if (issue.blocking === true || issue.mustCloseInReReview === true) {
            addErr('R3_MINOR_CANNOT_BLOCK', `${idLabel} 为 MINOR，禁止设置 blocking=true 或 mustCloseInReReview=true。`, {issueId: issue.id});
          }
        }

        // Mandatory reverseDefense, impactScope, and S1 blocking/mustCloseInReReview invariants for BLOCKER / MAJOR
        if (issue.severity === 'BLOCKER' || issue.severity === 'MAJOR') {
          const isValidImpactScope = ALLOWED_IMPACT_SCOPES.includes(issue.impactScope);
          const isArcDeferredMajor =
            issue.severity === 'MAJOR' &&
            issue.classification === 'B' &&
            issue.disposition === 'fix_in_arc' &&
            issue.impactScope === 'draft_only';

          if (issue.severity === 'BLOCKER') {
            if (issue.blocking !== true || issue.mustCloseInReReview !== true) {
              addErr(
                'R3_BLOCKER_CANNOT_BE_NONBLOCKING',
                `${idLabel} 为 BLOCKER，必须显式设置 blocking=true 且 mustCloseInReReview=true（不可豁免）。`,
                {issueId: issue.id}
              );
            }
          } else {
            // MAJOR: must always close in re-review; single-chapter blocking is required unless explicitly
            // modeled as B-class draft_only fix_in_arc deferral per frozen 06 §3.1 & r3_p1_common.mjs L31.
            const validBlocking = isArcDeferredMajor
              ? typeof issue.blocking === 'boolean'
              : issue.blocking === true;
            if (issue.mustCloseInReReview !== true || !validBlocking) {
              addErr(
                'R3_MAJOR_MUST_BLOCK_AND_CLOSE',
                `${idLabel} 为 MAJOR，默认必须显式设置 blocking=true 且 mustCloseInReReview=true（仅 B 类 draft_only + fix_in_arc 允许免单章阻断且仍须 mustCloseInReReview=true）。`,
                {issueId: issue.id}
              );
            }
          }

          if (!isNonEmptyString(issue.reverseDefense)) {
            addErr(
              'R3_MISSING_REVERSE_DEFENSE',
              `${idLabel}（${issue.severity}）缺少必填的非空 reverseDefense 字段。`,
              {issueId: issue.id, severity: issue.severity}
            );
          }
          if (!isValidImpactScope) {
            addErr(
              'R3_INVALID_IMPACT_SCOPE',
              `${idLabel}（${issue.severity}）缺少合法的 impactScope（期望 draft_only | upstream_planning | finalized_canon）。`,
              {issueId: issue.id, severity: issue.severity, impactScope: issue.impactScope ?? null}
            );
          } else if (issue.impactScope === 'upstream_planning' || issue.impactScope === 'finalized_canon') {
            hasPlanningOrCanonConflict = true;
          }
          if (!isArcDeferredMajor || issue.blocking === true) {
            hasBlockingIssue = true;
          }
        } else if (issue.impactScope !== undefined && !ALLOWED_IMPACT_SCOPES.includes(issue.impactScope)) {
          addErr(
            'R3_INVALID_IMPACT_SCOPE',
            `${idLabel} impactScope 非法：${String(issue.impactScope)}。`,
            {issueId: issue.id}
          );
        }
      }

      // OR6 & bidirectional decision consistency checks (06 §3.2)
      if (hasPlanningOrCanonConflict && reportObj.decision !== 'PLANNING_CONFLICT_BLOCK') {
        addErr(
          'R3_PLANNING_CONFLICT_MUST_BLOCK',
          '存在 impactScope 为 upstream_planning 或 finalized_canon 的 BLOCKER/MAJOR 项，decision 必须为 PLANNING_CONFLICT_BLOCK（严禁洗白为 pass_candidate 或混入 revise）。'
        );
      }
      if (reportObj.decision === 'PLANNING_CONFLICT_BLOCK' && !hasPlanningOrCanonConflict) {
        addErr(
          'R3_PLANNING_CONFLICT_BLOCK_WITHOUT_CONFLICT_ISSUE',
          'decision 为 PLANNING_CONFLICT_BLOCK 时，必须至少包含一条 impactScope 为 upstream_planning 或 finalized_canon 的合法 BLOCKER/MAJOR 项。'
        );
      }
      if (hasBlockingIssue && reportObj.decision === 'pass_candidate') {
        addErr(
          'R3_PASS_CANDIDATE_WITH_BLOCKING_ISSUES',
          '存在未解决的 BLOCKER/MAJOR 阻断项，decision 不得为 pass_candidate。'
        );
      }
    }
  }

  return {
    ok: errors.length === 0,
    exitCode: errors.length === 0 ? 0 : 2,
    schemaVersion: reportObj.schemaVersion,
    chapter: chapterNumber,
    revision: rec.revision,
    reviewFingerprint: rec.reviewFingerprint,
    errors,
  };
}

/**
 * Fail-Closed report applicator: validates strictly BEFORE writing a single byte to disk.
 * Any failure -> exitCode 2, 0 disk side effects, 0 plan changes.
 */
export function applyR3Review(projectDir, chapterNumber, reportRelPath) {
  const root = projectRoot(projectDir);
  const srcFile = safeFile(root, reportRelPath);
  if (!srcFile) {
    return {
      ok: false,
      exitCode: 2,
      status: 'rejected',
      errors: [{code: 'R3_REPORT_FILE_MISSING_OR_UNSAFE', message: `审稿报告文件 ${String(reportRelPath)} 缺失或路径非法。`}],
    };
  }

  const rawBytes = fs.readFileSync(srcFile);
  let reportObj;
  try {
    reportObj = JSON.parse(rawBytes.toString('utf8').replace(/^\uFEFF/, ''));
  } catch {
    return {
      ok: false,
      exitCode: 2,
      status: 'rejected',
      errors: [{code: 'R3_REPORT_JSON_CORRUPT', message: `审稿报告 ${reportRelPath} JSON 损坏。`}],
    };
  }

  // apply-review accepts ONLY FinalCalibrationReport (Pass1DiscoveryReport is validated via validate-report)
  const validation = validateR3ReviewReport(root, chapterNumber, reportObj, {allowDiscovery: false});
  if (!validation.ok) {
    return {
      ok: false,
      exitCode: 2,
      status: 'rejected',
      chapter: chapterNumber,
      errors: validation.errors,
    };
  }

  const plan = readPlan(root);
  const rec = plan.v3.r3.reviewV3.chapterReviews[String(chapterNumber)];
  const pad3 = String(chapterNumber).padStart(3, '0');
  const destRel = `reviews/r3/review-v3/report-ch${pad3}-v${rec.revision}.json`;
  let destDirAbs;
  try {
    destDirAbs = ensureSafeSubdir(root, 'reviews/r3/review-v3', 'R3_REVIEW_DIR_UNSAFE');
  } catch (err) {
    return {
      ok: false,
      exitCode: 2,
      status: 'rejected',
      errors: [{code: err?.message || 'R3_REVIEW_DIR_UNSAFE', message: '目标审稿目录路径不安全（拒绝符号链接逃逸）。'}],
    };
  }
  const destAbs = path.join(destDirAbs, `report-ch${pad3}-v${rec.revision}.json`);
  if (path.resolve(srcFile) === path.resolve(destAbs)) {
    return {
      ok: false,
      exitCode: 2,
      status: 'rejected',
      errors: [{code: 'R3_REPORT_INPUT_MUST_DIFFER', message: '输入报告路径不得与目标落盘路径相同。'}],
    };
  }

  try {
    fs.writeFileSync(destAbs, rawBytes, {flag: 'wx'});
  } catch (err) {
    return {
      ok: false,
      exitCode: 2,
      status: 'rejected',
      errors: [{
        code: err?.code === 'EEXIST' ? 'R3_REPORT_ALREADY_EXISTS' : 'R3_REPORT_WRITE_FAILED',
        message: `无法落盘审稿报告 ${destRel}（${err?.code || 'WRITE_ERROR'}）。`,
      }],
    };
  }

  const reportSha256 = sha256(rawBytes);
  const nextStatus =
    reportObj.decision === 'pass_candidate'
      ? 'passed'
      : reportObj.decision === 'PLANNING_CONFLICT_BLOCK'
        ? 'planning_conflict_block'
        : 'revise';
  const nextSubmissions = (Number.isSafeInteger(rec.effectiveReviewSubmissions) ? rec.effectiveReviewSubmissions : 0) + 1;

  rec.status = nextStatus;
  rec.reportPath = destRel;
  rec.reportSha256 = reportSha256;
  rec.effectiveReviewSubmissions = nextSubmissions;
  rec.history = Array.isArray(rec.history) ? rec.history : [];
  rec.history.push({
    revision: rec.revision,
    reviewFingerprint: rec.reviewFingerprint,
    inputPath: rec.inputPath,
    inputSha256: rec.inputSha256,
    reportPath: destRel,
    reportSha256,
    decision: reportObj.decision,
    protocolMode: reportObj.protocolMode,
    appliedAt: new Date().toISOString(),
  });

  atomicWritePlan(root, plan);

  return {
    ok: true,
    exitCode: 0,
    status: nextStatus,
    chapter: chapterNumber,
    revision: rec.revision,
    effectiveReviewSubmissions: nextSubmissions,
    reviewFingerprint: rec.reviewFingerprint,
    reportPath: destRel,
    reportSha256,
    decision: reportObj.decision,
  };
}

function runCli(argv) {
  const args = argv.slice(2);
  const flag = k => {
    const idx = args.indexOf(k);
    return idx >= 0 ? args[idx + 1] : null;
  };
  const hasFlag = k => args.includes(k);

  const [folder, action] = args;
  if (!folder || !['fingerprint', 'prepare', 'validate-report', 'apply-review'].includes(action)) {
    console.log(JSON.stringify({
      ok: false,
      error: 'R3_REVIEW_KERNEL_USAGE',
      usage: 'node scripts/r3_review_kernel.mjs <projectDir> <fingerprint|prepare|validate-report|apply-review> --chapter <N> [--dry-run] [--writer-run-id <id> --writer-context-id <id>] [--report <path>]',
    }, null, 2));
    process.exitCode = 2;
    return;
  }

  const chRaw = flag('--chapter');
  const chapterNumber = Number(chRaw);
  if (!/^[1-9]\d*$/.test(chRaw ?? '') || !Number.isSafeInteger(chapterNumber)) {
    console.log(JSON.stringify({ok: false, error: 'R3_INVALID_CHAPTER'}, null, 2));
    process.exitCode = 2;
    return;
  }

  try {
    if (action === 'fingerprint') {
      const fp = computeReviewFingerprint(folder, chapterNumber);
      const {manuscriptText, ...publicFp} = fp;
      console.log(JSON.stringify({ok: true, ...publicFp}, null, 2));
      process.exitCode = 0;
      return;
    }
    if (action === 'prepare') {
      const res = prepareR3Review(folder, chapterNumber, {
        dryRun: hasFlag('--dry-run'),
        writerRunId: flag('--writer-run-id'),
        writerContextId: flag('--writer-context-id'),
      });
      console.log(JSON.stringify(res, null, 2));
      process.exitCode = res.exitCode;
      return;
    }
    if (action === 'validate-report') {
      const reportRel = flag('--report');
      const root = projectRoot(folder);
      const src = safeFile(root, reportRel);
      if (!src) {
        console.log(JSON.stringify({
          ok: false,
          exitCode: 2,
          errors: [{code: 'R3_REPORT_FILE_MISSING_OR_UNSAFE', message: '报告文件缺失或路径非法。'}],
        }, null, 2));
        process.exitCode = 2;
        return;
      }
      let obj;
      try {
        obj = JSON.parse(fs.readFileSync(src, 'utf8').replace(/^\uFEFF/, ''));
      } catch {
        console.log(JSON.stringify({
          ok: false,
          exitCode: 2,
          errors: [{code: 'R3_REPORT_JSON_CORRUPT', message: '报告 JSON 损坏。'}],
        }, null, 2));
        process.exitCode = 2;
        return;
      }
      const res = validateR3ReviewReport(root, chapterNumber, obj, {allowDiscovery: true});
      console.log(JSON.stringify(res, null, 2));
      process.exitCode = res.exitCode;
      return;
    }
    if (action === 'apply-review') {
      const reportRel = flag('--report');
      const res = applyR3Review(folder, chapterNumber, reportRel);
      console.log(JSON.stringify(res, null, 2));
      process.exitCode = res.exitCode;
      return;
    }
  } catch (err) {
    console.log(JSON.stringify({ok: false, error: err?.message || 'R3_REVIEW_KERNEL_ERROR'}, null, 2));
    process.exitCode = 2;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli(process.argv);
}
