#!/usr/bin/env node
/**
 * P0-6: Deterministic G1-G6 Statistical Verification, Anti-Leakage & A/B/C Go/No-Go Adjudication Engine.
 *
 * Implements frozen acceptance protocol `08-工程效率与文学质量双重验收方案.md` (v1.2.3) §2.1 & §3
 * and `P0-Implementation-PRD.md` task `P0-6`:
 *   - Case-level deterministic derivation for G1, G2-A, G2-B, G3, and G6:
 *     Every executed run MUST evaluate exact declared case manifests (`caseId`, `truthClass`, `tier`),
 *     and the engine itself derives `tp`, `fp`, `fn`, `tn`, `clearTierFp`, and `blockerMisses` from
 *     case-level truth x predictions (ZERO self-reported aggregate TP or BLOCKER misses!).
 *   - Strict separation of `G2-A Regression/Calibration` vs `G2-B Independent Holdout` (ZERO mixing;
 *     Precision requires bounded positive cases and never silently drops null-precision runs).
 *   - Cross-set zero-leakage & retired blacklist (`NH-1..5`, `V22-H1..4`, `OLD-HOLD-1..4`, `DOC-1..6`,
 *     `Arm 0..2 Ch 1..3`, etc.) PLUS Holdout internal provenance & uniqueness (`sourceChapterId` +
 *     64-hex `contentSha256` required and unique within G2-B / G6).
 *   - Exact frozen `K_rep` equality (rejects over-budget extra runs) and exact G4 `N_case === 24`
 *     with per-case `caseId`/`sourceChapterId` traceability, 4-class truth coverage, and strictly
 *     undefined degenerate Kappa (never 1.0).
 *   - Canonical 15-genre controlled taxonomy (aligned with `references/webnovel/upstream/references/csv/genre-canonical.md`),
 *     rejecting unclassified chapters, requiring every included G6 genre to have >= 2 chapters, and
 *     enforcing Fail-Closed budget ceiling (>6 genres or >16 chapters requires explicit `g6BudgetExpansionApproved`).
 *   - Complete `{A, B, C}` + case-level canonical dataset equivalence before issuing `GO_CANDIDATE_SELECTED`.
 *   - Locked B = 2,000 chapter-cluster nonparametric Bootstrap 95% CI, Scheme B hard elimination (>1.0 pp
 *     recall lag or ANY 1 BLOCKER miss), and frozen multi-winner tie-break priority.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {canonicalJson} from '../r3_review_kernel.mjs';

export const P0_6_STATS_SCHEMA = 'r3-p0-6-g1-g6-stats-1';
export const BOOTSTRAP_ITERATIONS = 2000;
export const DEFAULT_BOOTSTRAP_SEED = 20261126;

export const ORDERED_SEVERITIES = Object.freeze(['BLOCKER', 'MAJOR', 'MINOR', 'SUGGESTION']);
export const REQUIRED_ADJUDICATION_SCHEMES = Object.freeze(['A', 'B', 'C']);

/**
 * Controlled 15-genre canonical taxonomy aligned verbatim with
 * `references/webnovel/upstream/references/csv/genre-canonical.md`.
 */
export const CANONICAL_GENRES = Object.freeze([
  '都市',
  '玄幻',
  '仙侠',
  '奇幻',
  '科幻',
  '历史',
  '悬疑',
  '游戏',
  '古言',
  '现言',
  '幻言',
  '年代',
  '种田',
  '快穿',
  '衍生',
]);

const CANONICAL_GENRE_SET = new Set(CANONICAL_GENRES);
const HEX64_RE = /^[a-f0-9]{64}$/i;
const POSITIVE_TRUTH_CLASSES = Object.freeze(['BLOCKER', 'MAJOR']);
const ALLOWED_G2_G6_TRUTH_CLASSES = Object.freeze(['BLOCKER', 'MAJOR', 'NON_BLOCKING']);
const ALLOWED_NON_BLOCKING_TIERS = Object.freeze(['CLEAR', 'BORDERLINE']);

export const FROZEN_THRESHOLDS = Object.freeze({
  G1: Object.freeze({
    minTrack2Chapters: 9,
    minTrack2Positives: 40,
    requiredTrack2Repeats: 3,
    minRegressionChapters: 7,
    requiredRegressionRepeats: 1,
    minTrack2Recall: 0.95,
    minRegressionDetectionRate: 1.0,
    maxBlockerMisses: 0,
  }),
  G2A: Object.freeze({
    minChapters: 9,
    minNegatives: 33,
    requiredRepeats: 3,
    maxClearTierFpPerRun: 0,
    maxMeanFpr: 0.13,
    maxSingleRunFpr: 0.15,
    minPrecision: 0.88,
  }),
  G2B: Object.freeze({
    minChapters: 20,
    minNegatives: 60,
    maxCasesPerChapter: 3,
    minGenres: 3,
    requiredRepeats: 3,
    maxClearTierFpPerRun: 0,
    maxMeanFpr: 0.13,
    maxSingleRunFpr: 0.15,
    minPrecision: 0.88,
  }),
  G3: Object.freeze({
    minChapters: 10,
    minCases: 15,
    maxCasesPerChapter: 2,
    requiredRepeats: 3,
    minNonBlockingRate: 1.0,
    minNoIssueRate: 0.90,
  }),
  G4: Object.freeze({
    minSourceChapters: 8,
    requiredCases: 24,
    requiredRepeats: 2,
    minQuadraticKappa: 0.85,
    maxSuggestionLoopLeaks: 0,
  }),
  G5: Object.freeze({
    minDeadlockChapters: 3,
    minLegalTropeCases: 1,
    requiredRepeats: 1,
    minDeadlockBlockRate: 1.0,
    maxLegalTropeBlockRate: 0.0,
  }),
  G6: Object.freeze({
    minGenres: 4,
    maxBudgetGenres: 6,
    minChaptersPerGenre: 2,
    minChapters: 12,
    maxBudgetChapters: 16,
    minPositives: 30,
    minNegatives: 40,
    requiredRepeats: 1,
    maxBlockerMisses: 0,
    minCombinedRecallPoint: 0.90,
    minCombinedRecallCiLower: 0.75,
    maxFpr: 0.13,
    maxClearTierFp: 0,
    clusterWeightDisclosureCaseCap: 5,
  }),
  SCHEME_B_ELIMINATION: Object.freeze({
    maxRecallLagVsAC: 0.01, // 1.0 percentage point
    maxBlockerMisses: 0,
  }),
});

/**
 * Retired / historical calibration chapters strictly forbidden from G2-B and G6 Independent Holdouts
 * (verbatim from P0-0 Baseline Audit §五 & P0-Implementation-PRD.md §P0-6).
 */
export const RETIRED_BLACKLIST_PATTERNS = Object.freeze([
  /^NH[-_]?[1-5](?:$|[-_].*)/i,
  /^V22[-_]?H[1-4](?:$|[-_].*)/i,
  /^H[1-4][-_]?CH\d+/i,
  /^(?:OLD[-_]?)?HOLD[-_]?[1-4](?:$|[-_].*)/i,
  /^DOC[-_]?[1-6](?:$|[-_].*)/i,
  /^ARM[0-2][-_]?CH[1-3](?:$|[-_].*)/i,
  /^G1[-_]?CH0?[1-3](?:$|[-_].*)/i,
  /^STEP3[-_]?CH0?[1-3](?:$|[-_].*)/i,
  /^LIVE[-_]?EVAL(?:$|[-_].*)/i,
]);

export const RETIRED_BLACKLIST_TITLES = Object.freeze([
  '器痕录',
  '残器长生',
  '降本增笑',
  '潮汐证词',
  '盐引旧账',
]);

const isPlainObject = x => Boolean(x) && typeof x === 'object' && !Array.isArray(x);
const isNonEmptyString = x => typeof x === 'string' && x.trim().length > 0;
const isNonNegInt = x => Number.isSafeInteger(x) && x >= 0;
const round6 = x => (typeof x === 'number' && Number.isFinite(x) ? Number(x.toFixed(6)) : null);

export function normalizeId(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/\s+/g, '-').toUpperCase();
}

/**
 * Normalize and validate a genre tag against the repository's 15-genre controlled taxonomy.
 */
export function normalizeCanonicalGenre(raw) {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().replace(/\s+/g, '');
  if (!cleaned || !CANONICAL_GENRE_SET.has(cleaned)) return null;
  return cleaned;
}

/**
 * Deterministic Mulberry32 PRNG for reproducible Bootstrap resampling.
 */
export function createMulberry32(seed = DEFAULT_BOOTSTRAP_SEED) {
  let a = seed >>> 0;
  return function nextFloat() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function linearPercentile(sortedValues, p) {
  if (sortedValues.length === 0) return null;
  if (sortedValues.length === 1) return sortedValues[0];
  const idx = p * (sortedValues.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const frac = idx - lo;
  return sortedValues[lo] + frac * (sortedValues[hi] - sortedValues[lo]);
}

/**
 * Check whether an identifier or source novel matches the retired historical blacklist.
 */
export function matchRetiredBlacklist({chapterId = '', sourceChapterId = '', sourceNovel = ''} = {}) {
  const candidates = [chapterId, sourceChapterId].filter(isNonEmptyString);
  for (const c of candidates) {
    const norm = normalizeId(c);
    for (const re of RETIRED_BLACKLIST_PATTERNS) {
      if (re.test(norm)) {
        return {blocked: true, matchedValue: c, reason: `MATCHED_BLACKLIST_PATTERN:${re.source}`};
      }
    }
    for (const title of RETIRED_BLACKLIST_TITLES) {
      if (c.includes(title)) {
        return {blocked: true, matchedValue: c, reason: `MATCHED_BLACKLIST_TITLE:${title}`};
      }
    }
  }
  if (isNonEmptyString(sourceNovel)) {
    for (const title of RETIRED_BLACKLIST_TITLES) {
      if (sourceNovel.includes(title)) {
        return {blocked: true, matchedValue: sourceNovel, reason: `MATCHED_BLACKLIST_NOVEL:${title}`};
      }
    }
  }
  return {blocked: false};
}

/**
 * Hard anti-leakage assertion between historical/calibration chapters and an independent holdout set (G2-B or G6).
 */
export function assertZeroLeakage(referenceChapters, holdoutChapters, {holdoutName = 'G2-B'} = {}) {
  const refIds = new Set();
  const refHashes = new Set();
  for (const ch of referenceChapters || []) {
    if (isNonEmptyString(ch?.chapterId)) refIds.add(normalizeId(ch.chapterId));
    if (isNonEmptyString(ch?.sourceChapterId)) refIds.add(normalizeId(ch.sourceChapterId));
    if (isNonEmptyString(ch?.contentSha256)) refHashes.add(ch.contentSha256.trim().toLowerCase());
  }

  const violations = [];
  for (const ch of holdoutChapters || []) {
    const chId = ch?.chapterId ?? '';
    const srcId = ch?.sourceChapterId ?? '';
    const normId = normalizeId(chId);
    const normSrc = normalizeId(srcId);
    const hash = isNonEmptyString(ch?.contentSha256) ? ch.contentSha256.trim().toLowerCase() : null;

    if (normId && refIds.has(normId)) {
      violations.push({
        code: 'R3_P0_6_CHAPTER_OVERLAP',
        holdoutName,
        chapterId: chId,
        message: `${holdoutName} 与历史集存在章节 ID 重叠：${chId}`,
      });
    } else if (normSrc && refIds.has(normSrc)) {
      violations.push({
        code: 'R3_P0_6_SOURCE_CHAPTER_OVERLAP',
        holdoutName,
        chapterId: chId,
        sourceChapterId: srcId,
        message: `${holdoutName} 与历史集存在来源章 ID 重叠：${srcId}`,
      });
    }
    if (hash && refHashes.has(hash)) {
      violations.push({
        code: 'R3_P0_6_CONTENT_HASH_OVERLAP',
        holdoutName,
        chapterId: chId,
        contentSha256: hash,
        message: `${holdoutName} 章节 ${chId} 的正文 SHA-256 与历史集完全相同，判定为样本泄漏。`,
      });
    }

    const bl = matchRetiredBlacklist({
      chapterId: chId,
      sourceChapterId: srcId,
      sourceNovel: ch?.sourceNovel ?? '',
    });
    if (bl.blocked) {
      violations.push({
        code: 'R3_P0_6_RETIRED_BLACKLIST_HIT',
        holdoutName,
        chapterId: chId,
        matchedValue: bl.matchedValue,
        reason: bl.reason,
        message: `${holdoutName} 命中已揭盲/退役黑名单（${bl.matchedValue} / ${bl.reason}），严禁混入独立 Holdout。`,
      });
    }
  }

  return {
    ok: violations.length === 0,
    exitCode: violations.length === 0 ? 0 : 2,
    error: violations.length === 0 ? null : 'R3_P0_6_DATA_LEAKAGE_DETECTED',
    violations,
  };
}

/**
 * Independent Holdout internal provenance & uniqueness verification.
 * Every non-empty G2-B / G6 holdout chapter MUST carry a valid non-empty `sourceChapterId` AND valid
 * 64-hex `contentSha256`, and NEITHER may repeat under renamed `chapterId`s inside the holdout.
 */
export function assertHoldoutInternalProvenanceAndUniqueness(chapters, {holdoutName = 'G2-B'} = {}) {
  const seenSources = new Map();
  const seenHashes = new Map();
  const violations = [];

  for (const ch of chapters || []) {
    const chId = ch?.chapterId ?? '<missing>';
    const rawSrc = ch?.sourceChapterId;
    const rawHash = ch?.contentSha256;

    if (!isNonEmptyString(rawSrc) || !isNonEmptyString(rawHash) || !HEX64_RE.test(rawHash.trim())) {
      violations.push({
        code: 'R3_P0_6_HOLDOUT_PROVENANCE_UNVERIFIED',
        holdoutName,
        chapterId: chId,
        message: `${holdoutName} 章节 ${chId} 缺少可验证的 sourceChapterId 或合法 64 位 SHA-256 contentSha256，按 Fail-Closed 拒收。`,
      });
      continue;
    }

    const normSrc = normalizeId(rawSrc);
    const normHash = rawHash.trim().toLowerCase();

    if (seenSources.has(normSrc)) {
      violations.push({
        code: 'R3_P0_6_HOLDOUT_DUPLICATE_SOURCE_CHAPTER',
        holdoutName,
        chapterId: chId,
        duplicateOf: seenSources.get(normSrc),
        sourceChapterId: rawSrc,
        message: `${holdoutName} 内部存在重复 sourceChapterId（${rawSrc}：${chId} 与 ${seenSources.get(normSrc)}），严禁改名虚增独立章节数 N_ch。`,
      });
    } else {
      seenSources.set(normSrc, chId);
    }

    if (seenHashes.has(normHash)) {
      violations.push({
        code: 'R3_P0_6_HOLDOUT_DUPLICATE_CONTENT_HASH',
        holdoutName,
        chapterId: chId,
        duplicateOf: seenHashes.get(normHash),
        contentSha256: normHash,
        message: `${holdoutName} 内部存在重复正文 contentSha256（${chId} 与 ${seenHashes.get(normHash)}），严禁改名虚增独立章节数 N_ch。`,
      });
    } else {
      seenHashes.set(normHash, chId);
    }
  }

  return {
    ok: violations.length === 0,
    exitCode: violations.length === 0 ? 0 : 2,
    error: violations.length === 0 ? null : violations[0].code,
    violations,
  };
}

/**
 * Chapter-level cluster nonparametric Bootstrap 95% CI (locked B = 2,000).
 */
export function chapterClusterBootstrapCI(
  clusters,
  {iterations = BOOTSTRAP_ITERATIONS, seed = DEFAULT_BOOTSTRAP_SEED} = {}
) {
  if (!Number.isSafeInteger(iterations) || iterations !== BOOTSTRAP_ITERATIONS) {
    throw new Error(`R3_P0_6_BOOTSTRAP_ITERATIONS_LOCKED: expected=${BOOTSTRAP_ITERATIONS} actual=${String(iterations)}`);
  }
  const valid = (clusters || []).filter(
    c =>
      isPlainObject(c) &&
      typeof c.numerator === 'number' &&
      typeof c.denominator === 'number' &&
      c.denominator > 0 &&
      c.numerator >= 0 &&
      c.numerator <= c.denominator
  );

  if (valid.length === 0) {
    return {
      point: null,
      macroMean: null,
      ci95: [null, null],
      nClusters: 0,
      totalNumerator: 0,
      totalDenominator: 0,
      iterations,
      seed,
      doesNotCompensateForSmallNCh: true,
    };
  }

  let totalNum = 0;
  let totalDen = 0;
  let macroSum = 0;
  for (const c of valid) {
    totalNum += c.numerator;
    totalDen += c.denominator;
    macroSum += c.numerator / c.denominator;
  }
  const point = totalNum / totalDen;
  const macroMean = macroSum / valid.length;

  const rand = createMulberry32(seed);
  const M = valid.length;
  const samples = new Array(iterations);
  for (let b = 0; b < iterations; b++) {
    let bNum = 0;
    let bDen = 0;
    for (let i = 0; i < M; i++) {
      const pick = valid[Math.floor(rand() * M)];
      bNum += pick.numerator;
      bDen += pick.denominator;
    }
    samples[b] = bNum / bDen;
  }
  samples.sort((a, b) => a - b);

  return {
    point: round6(point),
    macroMean: round6(macroMean),
    ci95: [round6(linearPercentile(samples, 0.025)), round6(linearPercentile(samples, 0.975))],
    nClusters: M,
    totalNumerator: totalNum,
    totalDenominator: totalDen,
    iterations,
    seed,
    doesNotCompensateForSmallNCh: true,
  };
}

/**
 * Compute exact 4x4 confusion matrix, Quadratic Weighted Kappa (primary), and Unweighted Cohen's Kappa (auxiliary)
 * for ordered S1 severity labels: ['BLOCKER', 'MAJOR', 'MINOR', 'SUGGESTION'].
 */
export function computeOrderedKappa(pairs, {labels = ORDERED_SEVERITIES} = {}) {
  const k = labels.length;
  const idxMap = new Map(labels.map((l, idx) => [l, idx]));
  const matrix = Array.from({length: k}, () => new Array(k).fill(0));

  for (const pair of pairs || []) {
    const gt = pair?.truth ?? pair?.gt;
    const pr = pair?.predicted ?? pair?.pred;
    if (!idxMap.has(gt) || !idxMap.has(pr)) {
      throw new Error(`R3_P0_6_INVALID_SEVERITY_LABEL: truth=${String(gt)} predicted=${String(pr)}`);
    }
    matrix[idxMap.get(gt)][idxMap.get(pr)]++;
  }

  const N = (pairs || []).length;
  if (N === 0) {
    return {
      n: 0,
      labels: [...labels],
      confusionMatrix: matrix,
      agreementRate: null,
      quadraticWeightedKappa: null,
      unweightedKappa: null,
      kappaStatus: 'EMPTY_SAMPLE',
      degenerateMarginals: false,
    };
  }

  const rowSums = matrix.map(row => row.reduce((a, b) => a + b, 0));
  const colSums = Array.from({length: k}, (_, j) => matrix.reduce((acc, row) => acc + row[j], 0));

  let diag = 0;
  let peUnweighted = 0;
  for (let i = 0; i < k; i++) {
    diag += matrix[i][i];
    peUnweighted += (rowSums[i] * colSums[i]) / (N * N);
  }
  const poUnweighted = diag / N;

  const denomMax = (k - 1) * (k - 1);
  let weightedObs = 0;
  let weightedExp = 0;
  for (let i = 0; i < k; i++) {
    for (let j = 0; j < k; j++) {
      const w = ((i - j) * (i - j)) / denomMax;
      weightedObs += w * (matrix[i][j] / N);
      const expectedProb = (rowSums[i] * colSums[j]) / (N * N);
      weightedExp += w * expectedProb;
    }
  }

  const degenerateWeighted = weightedExp === 0;
  const degenerateUnweighted = 1 - peUnweighted === 0;
  const degenerateMarginals = degenerateWeighted || degenerateUnweighted;

  const quadraticWeightedKappa = degenerateWeighted ? null : 1 - weightedObs / weightedExp;
  const unweightedKappa = degenerateUnweighted ? null : (poUnweighted - peUnweighted) / (1 - peUnweighted);

  const labeledMatrix = {};
  for (let i = 0; i < k; i++) {
    labeledMatrix[labels[i]] = {};
    for (let j = 0; j < k; j++) {
      labeledMatrix[labels[i]][labels[j]] = matrix[i][j];
    }
  }

  return {
    n: N,
    labels: [...labels],
    confusionMatrix: matrix,
    labeledConfusionMatrix: labeledMatrix,
    agreementRate: round6(poUnweighted),
    quadraticWeightedKappa: round6(quadraticWeightedKappa),
    unweightedKappa: round6(unweightedKappa),
    kappaStatus: degenerateMarginals ? 'UNDEFINED_DEGENERATE_MARGINALS' : 'DEFINED',
    degenerateMarginals,
  };
}

/**
 * Strict series summary: if ANY element in `values` is null/non-finite, marks `hasUndefined: true` and returns null mean
 * instead of silently dropping undefined runs!
 */
function summarizeSeriesStrict(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return {count: 0, hasUndefined: false, mean: null, min: null, max: null, range: null, variance: null};
  }
  const hasUndefined = values.some(v => typeof v !== 'number' || !Number.isFinite(v));
  if (hasUndefined) {
    return {count: values.length, hasUndefined: true, mean: null, min: null, max: null, range: null, variance: null};
  }
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const variance =
    values.length > 1
      ? values.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / (values.length - 1)
      : 0;
  return {
    count: values.length,
    hasUndefined: false,
    mean: round6(mean),
    min: round6(min),
    max: round6(max),
    range: round6(max - min),
    variance: round6(variance),
  };
}

function assertUniqueChapters(chapters, gateName) {
  const byId = new Map();
  const duplicates = [];
  for (const ch of chapters || []) {
    const id = normalizeId(ch?.chapterId);
    if (!id) {
      return {
        ok: false,
        code: 'R3_P0_6_INVALID_CHAPTER_ID',
        message: `${gateName} 存在缺失或空的 chapterId。`,
      };
    }
    if (byId.has(id)) {
      duplicates.push(ch.chapterId);
    }
    byId.set(id, ch);
  }
  if (duplicates.length > 0) {
    return {
      ok: false,
      code: 'R3_P0_6_DUPLICATE_CHAPTER_ID',
      duplicates,
      message: `${gateName} 存在重复 chapterId（严禁通过重复章节虚增独立章节数 N_ch）：${duplicates.join(', ')}`,
    };
  }
  return {ok: true, byId};
}

/**
 * Validate and index case-level manifests across chapters for G1, G2-A, G2-B, G3, and G6.
 * Rejects missing case manifests when runs are present, duplicate caseIds, invalid truthClass/tier,
 * and declared count vs case-array mismatches.
 */
function buildCaseManifestIndex(chapters, mode, gateName) {
  const caseById = new Map(); // normCaseId -> {caseId, chapterId, normChapterId, truthClass, tier}
  const casesByChapter = new Map(); // normChapterId -> array of case entries
  let totalPositives = 0;
  let totalNegatives = 0;
  let totalBlockerTruths = 0;
  let totalCleanParagraphs = 0;

  for (const ch of chapters || []) {
    const normCh = normalizeId(ch.chapterId);
    if (!Array.isArray(ch.cases) || ch.cases.length === 0) {
      return {
        ok: false,
        code: 'R3_P0_6_CASE_MANIFEST_REQUIRED',
        message: `${gateName} 章节 ${ch.chapterId} 缺少逐案例真值清册 cases[]，无法独立核验案例等价性与 BLOCKER/TP/FP 指标。`,
      };
    }
    let chPos = 0;
    let chNeg = 0;
    let chClean = 0;
    const chList = [];

    for (const item of ch.cases) {
      if (!isNonEmptyString(item?.caseId)) {
        return {
          ok: false,
          code: 'R3_P0_6_CASE_MANIFEST_INVALID',
          message: `${gateName} 章节 ${ch.chapterId} 存在缺少 caseId 的案例。`,
        };
      }
      const normCase = normalizeId(item.caseId);
      if (caseById.has(normCase)) {
        return {
          ok: false,
          code: 'R3_P0_6_DUPLICATE_CASE_ID',
          caseId: item.caseId,
          message: `${gateName} 存在重复案例主键 caseId：${item.caseId}。`,
        };
      }

      if (mode === 'g1') {
        if (!POSITIVE_TRUTH_CLASSES.includes(item.truthClass)) {
          return {
            ok: false,
            code: 'R3_P0_6_CASE_MANIFEST_INVALID',
            message: `${gateName} 案例 ${item.caseId} 的 truthClass 非法（须为 BLOCKER 或 MAJOR）：${String(item.truthClass)}。`,
          };
        }
        chPos++;
        if (item.truthClass === 'BLOCKER') totalBlockerTruths++;
      } else if (mode === 'g2' || mode === 'g6') {
        if (!ALLOWED_G2_G6_TRUTH_CLASSES.includes(item.truthClass)) {
          return {
            ok: false,
            code: 'R3_P0_6_CASE_MANIFEST_INVALID',
            message: `${gateName} 案例 ${item.caseId} 的 truthClass 非法（须为 BLOCKER / MAJOR / NON_BLOCKING）：${String(item.truthClass)}。`,
          };
        }
        if (item.truthClass === 'NON_BLOCKING') {
          if (!ALLOWED_NON_BLOCKING_TIERS.includes(item.tier)) {
            return {
              ok: false,
              code: 'R3_P0_6_CASE_MANIFEST_INVALID',
              message: `${gateName} 非阻断案例 ${item.caseId} 必须标注 tier（CLEAR 或 BORDERLINE）。`,
            };
          }
          chNeg++;
        } else {
          chPos++;
          if (item.truthClass === 'BLOCKER') totalBlockerTruths++;
        }
      } else if (mode === 'g3') {
        if (item.truthClass !== 'CLEAN_PARAGRAPH') {
          return {
            ok: false,
            code: 'R3_P0_6_CASE_MANIFEST_INVALID',
            message: `${gateName} 清白段落案例 ${item.caseId} 的 truthClass 须为 CLEAN_PARAGRAPH。`,
          };
        }
        chClean++;
      }

      const entry = {
        caseId: item.caseId,
        normCaseId: normCase,
        chapterId: ch.chapterId,
        normChapterId: normCh,
        truthClass: item.truthClass,
        tier: item.tier ?? null,
      };
      caseById.set(normCase, entry);
      chList.push(entry);
    }

    if (mode === 'g1' && ch.positives !== undefined && ch.positives !== chPos) {
      return {
        ok: false,
        code: 'R3_P0_6_OBSERVATION_MANIFEST_MISMATCH',
        message: `${gateName} 章节 ${ch.chapterId} 声明 positives=${ch.positives} 与 cases[] 中正例数 ${chPos} 不一致。`,
      };
    }
    if ((mode === 'g2' || mode === 'g6') && ch.positives !== undefined && ch.positives !== chPos) {
      return {
        ok: false,
        code: 'R3_P0_6_OBSERVATION_MANIFEST_MISMATCH',
        message: `${gateName} 章节 ${ch.chapterId} 声明 positives=${ch.positives} 与 cases[] 中正例数 ${chPos} 不一致。`,
      };
    }
    if ((mode === 'g2' || mode === 'g6') && ch.negatives !== undefined && ch.negatives !== chNeg) {
      return {
        ok: false,
        code: 'R3_P0_6_OBSERVATION_MANIFEST_MISMATCH',
        message: `${gateName} 章节 ${ch.chapterId} 声明 negatives=${ch.negatives} 与 cases[] 中负例数 ${chNeg} 不一致。`,
      };
    }
    if (mode === 'g3' && ch.paragraphs !== undefined && ch.paragraphs !== chClean) {
      return {
        ok: false,
        code: 'R3_P0_6_OBSERVATION_MANIFEST_MISMATCH',
        message: `${gateName} 章节 ${ch.chapterId} 声明 paragraphs=${ch.paragraphs} 与 cases[] 中段落数 ${chClean} 不一致。`,
      };
    }

    totalPositives += chPos;
    totalNegatives += chNeg;
    totalCleanParagraphs += chClean;
    casesByChapter.set(normCh, {
      chapterId: ch.chapterId,
      cases: chList,
      positives: chPos,
      negatives: chNeg,
      paragraphs: chClean,
    });
  }

  return {
    ok: true,
    caseById,
    casesByChapter,
    totalPositives,
    totalNegatives,
    totalBlockerTruths,
    totalCleanParagraphs,
  };
}

/**
 * Derive exact per-chapter & per-run confusion counts strictly from case-level predictions joined against
 * the validated case manifest. ZERO self-reported aggregate integers (TP/FP/FN/TN/clearTierFp/blockerMisses)
 * are trusted!
 */
function deriveRunsFromCasePredictions(runs, manifestIndex, mode, gateName) {
  const derivedRuns = [];

  for (let rIdx = 0; rIdx < (runs || []).length; rIdx++) {
    const run = runs[rIdx];
    const preds = run?.predictions;
    if (!Array.isArray(preds)) {
      return {
        ok: false,
        code: 'R3_P0_6_CASE_PREDICTIONS_REQUIRED',
        message: `${gateName} 第 ${rIdx + 1} 轮缺少逐案例 predictions[] 数组（禁止仅提交自报汇总整数）。`,
      };
    }

    const predByCase = new Map();
    for (const p of preds) {
      if (!isNonEmptyString(p?.caseId) || typeof p?.predictedBlocking !== 'boolean') {
        return {
          ok: false,
          code: 'R3_P0_6_INVALID_CASE_PREDICTION',
          message: `${gateName} 第 ${rIdx + 1} 轮存在非法预测项（须含非空 caseId 与布尔型 predictedBlocking）。`,
        };
      }
      const normCase = normalizeId(p.caseId);
      if (!manifestIndex.caseById.has(normCase)) {
        return {
          ok: false,
          code: 'R3_P0_6_UNDECLARED_PREDICTION_CASE',
          runIndex: rIdx + 1,
          caseId: p.caseId,
          message: `${gateName} 第 ${rIdx + 1} 轮预测包含未在清册中声明的 caseId：${p.caseId}。`,
        };
      }
      if (predByCase.has(normCase)) {
        return {
          ok: false,
          code: 'R3_P0_6_DUPLICATE_PREDICTION_CASE',
          runIndex: rIdx + 1,
          caseId: p.caseId,
          message: `${gateName} 第 ${rIdx + 1} 轮重复预测 caseId：${p.caseId}。`,
        };
      }
      if (mode === 'g3') {
        if (typeof p.noIssue !== 'boolean') {
          return {
            ok: false,
            code: 'R3_P0_6_INVALID_CASE_PREDICTION',
            message: `${gateName} 第 ${rIdx + 1} 轮清白段落案例 ${p.caseId} 须含布尔型 noIssue。`,
          };
        }
        if (p.predictedBlocking && p.noIssue) {
          return {
            ok: false,
            code: 'R3_P0_6_INVALID_OBSERVATION_COUNTS',
            message: `${gateName} 第 ${rIdx + 1} 轮案例 ${p.caseId} 同时标记 predictedBlocking=true 与 noIssue=true，逻辑矛盾。`,
          };
        }
      }
      predByCase.set(normCase, p);
    }

    if (predByCase.size !== manifestIndex.caseById.size) {
      const missingCases = [...manifestIndex.caseById.keys()].filter(cid => !predByCase.has(cid));
      return {
        ok: false,
        code: 'R3_P0_6_RUN_CASE_COVERAGE_MISMATCH',
        runIndex: rIdx + 1,
        observedCases: predByCase.size,
        declaredCases: manifestIndex.caseById.size,
        missingCases: missingCases.slice(0, 10),
        message: `${gateName} 第 ${rIdx + 1} 轮仅覆盖 ${predByCase.size}/${manifestIndex.caseById.size} 个声明案例（缺失：${missingCases.slice(0, 5).join(', ')}）。`,
      };
    }

    const chapterCounts = [];
    for (const [, chEntry] of manifestIndex.casesByChapter.entries()) {
      let tp = 0;
      let fn = 0;
      let fp = 0;
      let tn = 0;
      let clearTierFp = 0;
      let blockerMisses = 0;
      let blockingFp = 0;
      let nonBlockingTn = 0;
      let noIssue = 0;

      for (const c of chEntry.cases) {
        const pred = predByCase.get(c.normCaseId);
        if (mode === 'g3') {
          if (pred.predictedBlocking) {
            blockingFp++;
          } else {
            nonBlockingTn++;
            if (pred.noIssue) noIssue++;
          }
        } else if (c.truthClass === 'NON_BLOCKING') {
          if (pred.predictedBlocking) {
            fp++;
            if (c.tier === 'CLEAR') clearTierFp++;
          } else {
            tn++;
          }
        } else {
          // Positive truth (BLOCKER or MAJOR)
          if (pred.predictedBlocking) {
            tp++;
          } else {
            fn++;
            if (c.truthClass === 'BLOCKER') blockerMisses++;
          }
        }
      }

      chapterCounts.push({
        chapterId: chEntry.chapterId,
        tp,
        fn,
        fp,
        tn,
        clearTierFp,
        blockerMisses,
        blockingFp,
        nonBlockingTn,
        noIssue,
      });
    }
    derivedRuns.push({chapters: chapterCounts});
  }

  return {ok: true, runs: derivedRuns};
}

function aggregateRunsByChapter(runs, extractFields) {
  const byChapter = new Map();
  for (const run of runs || []) {
    for (const ch of run.chapters || []) {
      const key = normalizeId(ch.chapterId);
      if (!key) continue;
      if (!byChapter.has(key)) {
        byChapter.set(key, {chapterId: ch.chapterId, numerator: 0, denominator: 0});
      }
      const acc = byChapter.get(key);
      const {numerator, denominator} = extractFields(ch);
      acc.numerator += numerator;
      acc.denominator += denominator;
    }
  }
  return [...byChapter.values()];
}

function summarizeConfusionAcrossRuns(runs) {
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  let clearTierFp = 0;
  let blockerMisses = 0;
  const perRun = [];
  for (let idx = 0; idx < (runs || []).length; idx++) {
    const run = runs[idx];
    let rTp = 0;
    let rFp = 0;
    let rFn = 0;
    let rTn = 0;
    let rClearFp = 0;
    let rBlkMiss = 0;
    for (const ch of run.chapters || []) {
      rTp += ch.tp || 0;
      rFp += ch.fp || 0;
      rFn += ch.fn || 0;
      rTn += ch.tn || 0;
      rClearFp += ch.clearTierFp || 0;
      rBlkMiss += ch.blockerMisses || 0;
    }
    tp += rTp;
    fp += rFp;
    fn += rFn;
    tn += rTn;
    clearTierFp += rClearFp;
    blockerMisses += rBlkMiss;
    const fpr = rFp + rTn > 0 ? rFp / (rFp + rTn) : null;
    const recall = rTp + rFn > 0 ? rTp / (rTp + rFn) : null;
    const precision = rTp + rFp > 0 ? rTp / (rTp + rFp) : null;
    perRun.push({
      runIndex: idx + 1,
      tp: rTp,
      fp: rFp,
      fn: rFn,
      tn: rTn,
      clearTierFp: rClearFp,
      blockerMisses: rBlkMiss,
      fpr: round6(fpr),
      recall: round6(recall),
      precision: round6(precision),
    });
  }
  return {
    rawTotalsAcrossRuns: {tp, fp, fn, tn, clearTierFp, blockerMisses},
    perRun,
  };
}

function countDeclaredChapterField(chapters, field, caseFilter = null) {
  return (chapters || []).reduce((acc, ch) => {
    if (Array.isArray(ch?.cases)) {
      return acc + (caseFilter ? ch.cases.filter(caseFilter).length : ch.cases.length);
    }
    return acc + (isNonNegInt(ch?.[field]) ? ch[field] : 0);
  }, 0);
}

/**
 * Evaluate G1: Track 2 High-Recall Defense (Regression/Calibration, exact K=3) + 7-Chapter Regression (exact K=1).
 * Derives TP, FN, and BLOCKER misses directly from case-level predictions.
 */
export function evaluateG1(g1Data, {seed = DEFAULT_BOOTSTRAP_SEED, iterations = BOOTSTRAP_ITERATIONS} = {}) {
  const th = FROZEN_THRESHOLDS.G1;
  const track2Chapters = g1Data?.track2?.chapters || [];
  const track2RunsRaw = g1Data?.track2?.runs || [];
  const regChapters = g1Data?.regression7?.chapters || [];
  const regRunsRaw = g1Data?.regression7?.runs || [];

  const uT2 = assertUniqueChapters(track2Chapters, 'G1.track2');
  if (!uT2.ok) return {gate: 'G1', status: 'INVALID_DESIGN', exitCode: 2, error: uT2.code, message: uT2.message, pass: false};
  const uReg = assertUniqueChapters(regChapters, 'G1.regression7');
  if (!uReg.ok) return {gate: 'G1', status: 'INVALID_DESIGN', exitCode: 2, error: uReg.code, message: uReg.message, pass: false};

  const kRepTrack2 = track2RunsRaw.length;
  const kRepReg = regRunsRaw.length;

  // Blocking 3: Exact frozen K_rep enforcement (reject over-budget runs!)
  if (kRepTrack2 > th.requiredTrack2Repeats) {
    return {
      gate: 'G1',
      status: 'INVALID_DESIGN',
      exitCode: 2,
      error: 'R3_P0_6_REPEAT_COUNT_EXCEEDS_FROZEN_DESIGN',
      message: `G1.track2 重复轮次 K=${kRepTrack2} 超出冻结设计值 K=${th.requiredTrack2Repeats}。`,
      pass: false,
    };
  }
  if (kRepReg > th.requiredRegressionRepeats) {
    return {
      gate: 'G1',
      status: 'INVALID_DESIGN',
      exitCode: 2,
      error: 'R3_P0_6_REPEAT_COUNT_EXCEEDS_FROZEN_DESIGN',
      message: `G1.regression7 重复轮次 K=${kRepReg} 超出冻结设计值 K=${th.requiredRegressionRepeats}。`,
      pass: false,
    };
  }

  const nChTrack2 = track2Chapters.length;
  const nPosTrack2 = countDeclaredChapterField(track2Chapters, 'positives', c => POSITIVE_TRUTH_CLASSES.includes(c?.truthClass));
  const nChReg = regChapters.length;

  // Validate case manifests & predictions whenever runs are present
  let derivedT2Runs = [];
  let derivedRegRuns = [];
  if (kRepTrack2 > 0) {
    const idxT2 = buildCaseManifestIndex(track2Chapters, 'g1', 'G1.track2');
    if (!idxT2.ok) return {gate: 'G1', status: 'INVALID_DESIGN', exitCode: 2, error: idxT2.code, message: idxT2.message, pass: false};
    const dT2 = deriveRunsFromCasePredictions(track2RunsRaw, idxT2, 'g1', 'G1.track2');
    if (!dT2.ok) return {gate: 'G1', status: 'INVALID_DESIGN', exitCode: 2, error: dT2.code, message: dT2.message, pass: false};
    derivedT2Runs = dT2.runs;
  }
  if (kRepReg > 0) {
    const idxReg = buildCaseManifestIndex(regChapters, 'g1', 'G1.regression7');
    if (!idxReg.ok) return {gate: 'G1', status: 'INVALID_DESIGN', exitCode: 2, error: idxReg.code, message: idxReg.message, pass: false};
    const dReg = deriveRunsFromCasePredictions(regRunsRaw, idxReg, 'g1', 'G1.regression7');
    if (!dReg.ok) return {gate: 'G1', status: 'INVALID_DESIGN', exitCode: 2, error: dReg.code, message: dReg.message, pass: false};
    derivedRegRuns = dReg.runs;
  }

  const gaps = [];
  if (nChTrack2 < th.minTrack2Chapters) gaps.push(`Track2 N_ch=${nChTrack2} < ${th.minTrack2Chapters}`);
  if (nPosTrack2 < th.minTrack2Positives) gaps.push(`Track2 N_pos=${nPosTrack2} < ${th.minTrack2Positives}`);
  if (kRepTrack2 < th.requiredTrack2Repeats) gaps.push(`Track2 K_rep=${kRepTrack2} < ${th.requiredTrack2Repeats}`);
  if (nChReg < th.minRegressionChapters) gaps.push(`Regression7 N_ch=${nChReg} < ${th.minRegressionChapters}`);
  if (kRepReg < th.requiredRegressionRepeats) gaps.push(`Regression7 K_rep=${kRepReg} < ${th.requiredRegressionRepeats}`);

  if (gaps.length > 0) {
    return {
      gate: 'G1',
      track: 'regression_calibration',
      isIndependentGeneralization: false,
      status: 'UNDERPOWERED',
      sampleTriplet: {
        track2: {nCh: nChTrack2, nPos: nPosTrack2, kRep: kRepTrack2},
        regression7: {nCh: nChReg, kRep: kRepReg},
      },
      gaps,
      pass: false,
    };
  }

  const t2Summary = summarizeConfusionAcrossRuns(derivedT2Runs);
  const t2RecallSeries = summarizeSeriesStrict(t2Summary.perRun.map(r => r.recall));
  const t2Clusters = aggregateRunsByChapter(derivedT2Runs, c => ({
    numerator: c.tp,
    denominator: c.tp + c.fn,
  }));
  const t2RecallBootstrap = chapterClusterBootstrapCI(t2Clusters, {iterations, seed});

  if (t2RecallBootstrap.nClusters < th.minTrack2Chapters) {
    return {
      gate: 'G1',
      track: 'regression_calibration',
      isIndependentGeneralization: false,
      status: 'UNDERPOWERED',
      sampleTriplet: {
        track2: {nCh: t2RecallBootstrap.nClusters, nPos: nPosTrack2, kRep: kRepTrack2},
        regression7: {nCh: nChReg, kRep: kRepReg},
      },
      gaps: [`Track2 effective positive clusters=${t2RecallBootstrap.nClusters} < ${th.minTrack2Chapters}`],
      pass: false,
    };
  }

  const regSummary = summarizeConfusionAcrossRuns(derivedRegRuns);
  const regRecallSeries = summarizeSeriesStrict(regSummary.perRun.map(r => r.recall));
  const totalBlockerMisses = t2Summary.rawTotalsAcrossRuns.blockerMisses + regSummary.rawTotalsAcrossRuns.blockerMisses;

  const failures = [];
  if (t2RecallSeries.hasUndefined || t2RecallSeries.mean === null || t2RecallSeries.mean < th.minTrack2Recall) {
    failures.push(`Track2 recall mean=${t2RecallSeries.mean} < ${th.minTrack2Recall}`);
  }
  if (regRecallSeries.hasUndefined || regRecallSeries.min === null || regRecallSeries.min < th.minRegressionDetectionRate) {
    failures.push(`Regression7 detection rate=${regRecallSeries.min} < ${th.minRegressionDetectionRate}`);
  }
  if (totalBlockerMisses > th.maxBlockerMisses) {
    failures.push(`Known BLOCKER misses=${totalBlockerMisses} > ${th.maxBlockerMisses}`);
  }

  return {
    gate: 'G1',
    track: 'regression_calibration',
    isIndependentGeneralization: false,
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    pass: failures.length === 0,
    sampleTriplet: {
      track2: {nCh: nChTrack2, effectiveClusters: t2RecallBootstrap.nClusters, nPos: nPosTrack2, kRep: kRepTrack2},
      regression7: {nCh: nChReg, kRep: kRepReg},
    },
    track2: {
      rawTotalsAcrossRuns: t2Summary.rawTotalsAcrossRuns,
      perRun: t2Summary.perRun,
      recallSummary: t2RecallSeries,
      recallClusterBootstrap95CI: t2RecallBootstrap,
    },
    regression7: {
      rawTotalsAcrossRuns: regSummary.rawTotalsAcrossRuns,
      perRun: regSummary.perRun,
      detectionRateSummary: regRecallSeries,
    },
    knownBlockerMisses: totalBlockerMisses,
    failures,
  };
}

function evaluateG2Core(
  gateName,
  track,
  g2Data,
  thresholds,
  {seed = DEFAULT_BOOTSTRAP_SEED, iterations = BOOTSTRAP_ITERATIONS, requireGenres = false, maxCasesPerChapter = null} = {}
) {
  const chapters = g2Data?.chapters || [];
  const runsRaw = g2Data?.runs || [];

  const uCheck = assertUniqueChapters(chapters, gateName);
  if (!uCheck.ok) {
    return {gate: gateName, track, status: 'INVALID_DESIGN', exitCode: 2, error: uCheck.code, message: uCheck.message, pass: false};
  }

  const kRep = runsRaw.length;
  if (kRep > thresholds.requiredRepeats) {
    return {
      gate: gateName,
      track,
      status: 'INVALID_DESIGN',
      exitCode: 2,
      error: 'R3_P0_6_REPEAT_COUNT_EXCEEDS_FROZEN_DESIGN',
      message: `${gateName} 重复轮次 K=${kRep} 超出冻结设计值 K=${thresholds.requiredRepeats}。`,
      pass: false,
    };
  }

  // Blocking 4: Controlled canonical genre validation for G2-B (trim/normalize, no unclassified chapters)
  const genreSet = new Set();
  if (requireGenres) {
    for (const ch of chapters) {
      const normG = normalizeCanonicalGenre(ch?.genre);
      if (!normG) {
        return {
          gate: gateName,
          track,
          status: 'INVALID_DESIGN',
          exitCode: 2,
          error: 'R3_P0_6_INVALID_OR_MISSING_GENRE',
          chapterId: ch.chapterId,
          rawGenre: ch?.genre ?? null,
          message: `${gateName} 章节 ${ch.chapterId} 缺少题材或题材不在 15 个受控规范题材词表中：${String(ch?.genre)}。`,
          pass: false,
        };
      }
      genreSet.add(normG);
    }
  } else {
    for (const ch of chapters) {
      const normG = normalizeCanonicalGenre(ch?.genre);
      if (normG) genreSet.add(normG);
    }
  }
  const genres = [...genreSet].sort();

  let derivedRuns = [];
  let manifestIndex = null;
  if (kRep > 0) {
    manifestIndex = buildCaseManifestIndex(chapters, 'g2', gateName);
    if (!manifestIndex.ok) {
      return {gate: gateName, track, status: 'INVALID_DESIGN', exitCode: 2, error: manifestIndex.code, message: manifestIndex.message, pass: false};
    }
    // Blocking 1: G2 Precision requires bounded positive cases in the declared case manifest!
    if (manifestIndex.totalPositives <= 0) {
      return {
        gate: gateName,
        track,
        status: 'INVALID_DESIGN',
        exitCode: 2,
        error: 'R3_P0_6_G2_POSITIVE_MANIFEST_REQUIRED_FOR_PRECISION',
        message: `${gateName} 缺少声明正例案例（positives=0），无法基于受控清册计算 Precision >= 88%，严禁凭空注入 TP。`,
        pass: false,
      };
    }
    const derived = deriveRunsFromCasePredictions(runsRaw, manifestIndex, 'g2', gateName);
    if (!derived.ok) {
      return {gate: gateName, track, status: 'INVALID_DESIGN', exitCode: 2, error: derived.code, message: derived.message, pass: false};
    }
    derivedRuns = derived.runs;
  }

  const nCh = chapters.length;
  const nNeg = manifestIndex
    ? manifestIndex.totalNegatives
    : countDeclaredChapterField(chapters, 'negatives', c => c?.truthClass === 'NON_BLOCKING');
  const nPos = manifestIndex
    ? manifestIndex.totalPositives
    : countDeclaredChapterField(chapters, 'positives', c => POSITIVE_TRUTH_CLASSES.includes(c?.truthClass));

  if (maxCasesPerChapter !== null) {
    const capViolations = chapters.filter(ch => {
      const negCount = Array.isArray(ch.cases)
        ? ch.cases.filter(c => c?.truthClass === 'NON_BLOCKING').length
        : (ch.negatives || 0);
      return negCount > maxCasesPerChapter;
    });
    if (capViolations.length > 0) {
      return {
        gate: gateName,
        track,
        status: 'INVALID_DESIGN',
        exitCode: 2,
        error: 'R3_P0_6_G2B_CHAPTER_CASE_CAP_EXCEEDED',
        pass: false,
        offendingChapters: capViolations.map(c => ({chapterId: c.chapterId})),
      };
    }
  }

  const gaps = [];
  if (nCh < thresholds.minChapters) gaps.push(`N_ch=${nCh} < ${thresholds.minChapters} (need +${thresholds.minChapters - nCh})`);
  if (nNeg < thresholds.minNegatives) gaps.push(`N_neg=${nNeg} < ${thresholds.minNegatives} (need +${thresholds.minNegatives - nNeg})`);
  if (requireGenres && genres.length < thresholds.minGenres) {
    gaps.push(`genres=${genres.length} < ${thresholds.minGenres} (need +${thresholds.minGenres - genres.length})`);
  }
  if (kRep < thresholds.requiredRepeats) gaps.push(`K_rep=${kRep} < ${thresholds.requiredRepeats}`);

  if (gaps.length > 0) {
    return {
      gate: gateName,
      track,
      isIndependentGeneralization: gateName === 'G2-B',
      g2aPassDoesNotImplyG2bPass: true,
      doNotExtrapolatePrecisionToProduction: true,
      status: 'UNDERPOWERED',
      sampleTriplet: {nCh, nPos, nNeg, kRep, genres},
      gaps,
      pass: false,
    };
  }

  const summary = summarizeConfusionAcrossRuns(derivedRuns);
  const fprSeries = summarizeSeriesStrict(summary.perRun.map(r => r.fpr));
  const precisionSeries = summarizeSeriesStrict(summary.perRun.map(r => r.precision));
  const maxClearFp = Math.max(...summary.perRun.map(r => r.clearTierFp));

  const fprClusters = aggregateRunsByChapter(derivedRuns, c => ({
    numerator: c.fp,
    denominator: c.fp + c.tn,
  }));
  const fprBootstrap = chapterClusterBootstrapCI(fprClusters, {iterations, seed});

  if (fprBootstrap.nClusters < thresholds.minChapters) {
    return {
      gate: gateName,
      track,
      isIndependentGeneralization: gateName === 'G2-B',
      g2aPassDoesNotImplyG2bPass: true,
      doNotExtrapolatePrecisionToProduction: true,
      status: 'UNDERPOWERED',
      sampleTriplet: {nCh: fprBootstrap.nClusters, nPos, nNeg, kRep, genres},
      gaps: [`effective negative clusters=${fprBootstrap.nClusters} < ${thresholds.minChapters}`],
      pass: false,
    };
  }

  const precisionClusters = aggregateRunsByChapter(derivedRuns, c => ({
    numerator: c.tp,
    denominator: c.tp + c.fp,
  }));
  const precisionBootstrap = chapterClusterBootstrapCI(precisionClusters, {iterations, seed: seed + 1});

  const failures = [];
  if (maxClearFp > thresholds.maxClearTierFpPerRun) {
    failures.push(`Clear-tier FP max=${maxClearFp} > ${thresholds.maxClearTierFpPerRun}`);
  }
  if (fprSeries.hasUndefined || fprSeries.mean === null || fprSeries.mean > thresholds.maxMeanFpr) {
    failures.push(`FPR 3-run mean=${fprSeries.mean} > ${thresholds.maxMeanFpr}`);
  }
  if (fprSeries.hasUndefined || fprSeries.max === null || fprSeries.max > thresholds.maxSingleRunFpr) {
    failures.push(`FPR single-run max=${fprSeries.max} > ${thresholds.maxSingleRunFpr}`);
  }
  if (precisionSeries.hasUndefined || precisionSeries.mean === null) {
    failures.push('R3_P0_6_PRECISION_UNDEFINED: at least one run has TP+FP=0 (null precision cannot be silently dropped)');
  } else if (precisionSeries.mean < thresholds.minPrecision) {
    failures.push(`Test-set precision mean=${precisionSeries.mean} < ${thresholds.minPrecision}`);
  }

  return {
    gate: gateName,
    track,
    isIndependentGeneralization: gateName === 'G2-B',
    g2aPassDoesNotImplyG2bPass: true,
    doNotExtrapolatePrecisionToProduction: true,
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    pass: failures.length === 0,
    sampleTriplet: {nCh, effectiveClusters: fprBootstrap.nClusters, nPos, nNeg, kRep, genres},
    rawTotalsAcrossRuns: summary.rawTotalsAcrossRuns,
    perRun: summary.perRun,
    clearTierFpMaxPerRun: maxClearFp,
    fprSummary: fprSeries,
    fprClusterBootstrap95CI: fprBootstrap,
    precisionSummary: precisionSeries,
    precisionClusterBootstrap95CI: precisionBootstrap,
    failures,
  };
}

/**
 * Evaluate G2-A (Historical Regression/Calibration FPR control, exact K=3).
 */
export function evaluateG2A(g2aData, opts = {}) {
  return evaluateG2Core('G2-A', 'regression_calibration', g2aData, FROZEN_THRESHOLDS.G2A, opts);
}

/**
 * Evaluate G2-B (Independent Holdout Non-Blocking Generalization, exact K=3).
 */
export function evaluateG2B(g2bData, {referenceChapters = [], seed = DEFAULT_BOOTSTRAP_SEED, iterations = BOOTSTRAP_ITERATIONS} = {}) {
  const declaredChapters = g2bData?.chapters || [];
  const leakage = assertZeroLeakage(referenceChapters, declaredChapters, {holdoutName: 'G2-B'});
  if (!leakage.ok) {
    return {
      gate: 'G2-B',
      track: 'independent_holdout',
      isIndependentGeneralization: true,
      status: 'LEAKAGE_REJECTED',
      exitCode: 2,
      error: leakage.error,
      leakageViolations: leakage.violations,
      pass: false,
    };
  }
  const provenance = assertHoldoutInternalProvenanceAndUniqueness(declaredChapters, {holdoutName: 'G2-B'});
  if (!provenance.ok) {
    return {
      gate: 'G2-B',
      track: 'independent_holdout',
      isIndependentGeneralization: true,
      status: 'INVALID_DESIGN',
      exitCode: 2,
      error: provenance.error,
      provenanceViolations: provenance.violations,
      pass: false,
    };
  }
  return evaluateG2Core('G2-B', 'independent_holdout', g2bData, FROZEN_THRESHOLDS.G2B, {
    seed,
    iterations,
    requireGenres: true,
    maxCasesPerChapter: FROZEN_THRESHOLDS.G2B.maxCasesPerChapter,
  });
}

/**
 * Evaluate G3 (Clean Paragraphs Zero False-Blocking, exact K=3).
 */
export function evaluateG3(g3Data, {seed = DEFAULT_BOOTSTRAP_SEED, iterations = BOOTSTRAP_ITERATIONS} = {}) {
  const th = FROZEN_THRESHOLDS.G3;
  const chapters = g3Data?.chapters || [];
  const runsRaw = g3Data?.runs || [];

  const uCheck = assertUniqueChapters(chapters, 'G3');
  if (!uCheck.ok) return {gate: 'G3', status: 'INVALID_DESIGN', exitCode: 2, error: uCheck.code, message: uCheck.message, pass: false};

  const kRep = runsRaw.length;
  if (kRep > th.requiredRepeats) {
    return {
      gate: 'G3',
      status: 'INVALID_DESIGN',
      exitCode: 2,
      error: 'R3_P0_6_REPEAT_COUNT_EXCEEDS_FROZEN_DESIGN',
      message: `G3 重复轮次 K=${kRep} 超出冻结设计值 K=${th.requiredRepeats}。`,
      pass: false,
    };
  }

  let derivedRuns = [];
  let manifestIndex = null;
  if (kRep > 0) {
    manifestIndex = buildCaseManifestIndex(chapters, 'g3', 'G3');
    if (!manifestIndex.ok) return {gate: 'G3', status: 'INVALID_DESIGN', exitCode: 2, error: manifestIndex.code, message: manifestIndex.message, pass: false};
    const derived = deriveRunsFromCasePredictions(runsRaw, manifestIndex, 'g3', 'G3');
    if (!derived.ok) return {gate: 'G3', status: 'INVALID_DESIGN', exitCode: 2, error: derived.code, message: derived.message, pass: false};
    derivedRuns = derived.runs;
  }

  const nCh = chapters.length;
  const nCases = manifestIndex
    ? manifestIndex.totalCleanParagraphs
    : countDeclaredChapterField(chapters, 'paragraphs');

  const capViolations = chapters.filter(ch => {
    const paraCount = Array.isArray(ch.cases) ? ch.cases.length : (ch.paragraphs || 0);
    return paraCount > th.maxCasesPerChapter;
  });
  if (capViolations.length > 0) {
    return {
      gate: 'G3',
      status: 'INVALID_DESIGN',
      exitCode: 2,
      error: 'R3_P0_6_G3_CHAPTER_PARAGRAPH_CAP_EXCEEDED',
      pass: false,
      offendingChapters: capViolations.map(c => ({chapterId: c.chapterId})),
    };
  }

  const gaps = [];
  if (nCh < th.minChapters) gaps.push(`N_ch=${nCh} < ${th.minChapters} (need +${th.minChapters - nCh})`);
  if (nCases < th.minCases) gaps.push(`N_case=${nCases} < ${th.minCases} (need +${th.minCases - nCases})`);
  if (kRep < th.requiredRepeats) gaps.push(`K_rep=${kRep} < ${th.requiredRepeats}`);

  if (gaps.length > 0) {
    return {
      gate: 'G3',
      status: 'UNDERPOWERED',
      sampleTriplet: {nCh, nCases, kRep},
      gaps,
      pass: false,
    };
  }

  let totalBlockingFp = 0;
  let totalNonBlockingTn = 0;
  let totalNoIssue = 0;
  let totalEvaluated = 0;
  const perRun = [];

  for (let idx = 0; idx < derivedRuns.length; idx++) {
    let rBlkFp = 0;
    let rNonBlkTn = 0;
    let rNoIssue = 0;
    let rTotal = 0;
    for (const ch of derivedRuns[idx].chapters || []) {
      rBlkFp += ch.blockingFp;
      rNonBlkTn += ch.nonBlockingTn;
      rNoIssue += ch.noIssue;
      rTotal += ch.blockingFp + ch.nonBlockingTn;
    }
    totalBlockingFp += rBlkFp;
    totalNonBlockingTn += rNonBlkTn;
    totalNoIssue += rNoIssue;
    totalEvaluated += rTotal;
    perRun.push({
      runIndex: idx + 1,
      tn: rNonBlkTn,
      fp: rBlkFp,
      noIssue: rNoIssue,
      total: rTotal,
      nonBlockingRate: rTotal > 0 ? round6(rNonBlkTn / rTotal) : null,
      noIssueRate: rTotal > 0 ? round6(rNoIssue / rTotal) : null,
    });
  }

  const nonBlockingRate = totalEvaluated > 0 ? totalNonBlockingTn / totalEvaluated : null;
  const noIssueRate = totalEvaluated > 0 ? totalNoIssue / totalEvaluated : null;

  const noIssueClusters = aggregateRunsByChapter(derivedRuns, c => ({
    numerator: c.noIssue,
    denominator: c.blockingFp + c.nonBlockingTn,
  }));
  const noIssueBootstrap = chapterClusterBootstrapCI(noIssueClusters, {iterations, seed});

  if (noIssueBootstrap.nClusters < th.minChapters) {
    return {
      gate: 'G3',
      status: 'UNDERPOWERED',
      sampleTriplet: {nCh: noIssueBootstrap.nClusters, nCases, kRep},
      gaps: [`effective clean-paragraph clusters=${noIssueBootstrap.nClusters} < ${th.minChapters}`],
      pass: false,
    };
  }

  const nonBlockingClusters = aggregateRunsByChapter(derivedRuns, c => ({
    numerator: c.nonBlockingTn,
    denominator: c.blockingFp + c.nonBlockingTn,
  }));
  const nonBlockingBootstrap = chapterClusterBootstrapCI(nonBlockingClusters, {iterations, seed: seed + 1});

  const failures = [];
  if (nonBlockingRate === null || nonBlockingRate < th.minNonBlockingRate || totalBlockingFp > 0) {
    failures.push(`nonBlockingRate=${round6(nonBlockingRate)} < 1.0 (blockingFp=${totalBlockingFp})`);
  }
  if (noIssueRate === null || noIssueRate < th.minNoIssueRate) {
    failures.push(`noIssueRate=${round6(noIssueRate)} < ${th.minNoIssueRate}`);
  }

  return {
    gate: 'G3',
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    pass: failures.length === 0,
    sampleTriplet: {nCh, effectiveClusters: noIssueBootstrap.nClusters, nCases, kRep},
    rawTotalsAcrossRuns: {tn: totalNonBlockingTn, fp: totalBlockingFp, noIssue: totalNoIssue, total: totalEvaluated},
    perRun,
    nonBlockingRate: round6(nonBlockingRate),
    noIssueRate: round6(noIssueRate),
    nonBlockingClusterBootstrap95CI: nonBlockingBootstrap,
    noIssueClusterBootstrap95CI: noIssueBootstrap,
    failures,
  };
}

/**
 * Evaluate G4 (Ordered 4-Class Severity Stability: exact N_case = 24, exact K = 2, kappa_w >= 0.85, 0 SUGGESTION leak).
 */
export function evaluateG4(g4Data) {
  const th = FROZEN_THRESHOLDS.G4;
  const declaredSourceChapters = [...new Set((g4Data?.sourceChapters || []).filter(isNonEmptyString).map(normalizeId))].sort();
  const runs = g4Data?.runs || [];
  const kRep = runs.length;

  // Blocking 3: Exact K=2 check
  if (kRep > th.requiredRepeats) {
    return {
      gate: 'G4',
      status: 'INVALID_DESIGN',
      exitCode: 2,
      error: 'R3_P0_6_REPEAT_COUNT_EXCEEDS_FROZEN_DESIGN',
      message: `G4 重复轮次 K=${kRep} 超出冻结设计值 K=${th.requiredRepeats}。`,
      pass: false,
    };
  }

  // Blocking 3: Exact declared N_case === 24 check (if non-zero / >24)
  if (g4Data?.nCases !== undefined && g4Data.nCases !== th.requiredCases && (kRep > 0 || g4Data.nCases > th.requiredCases)) {
    return {
      gate: 'G4',
      status: 'INVALID_DESIGN',
      exitCode: 2,
      error: 'R3_P0_6_G4_CASE_COUNT_MUST_BE_EXACT_24',
      declaredCases: g4Data.nCases,
      message: `G4 冻结探针数量必须严格等于 ${th.requiredCases}（当前声明 ${String(g4Data.nCases)}）。`,
      pass: false,
    };
  }

  if (kRep === 0) {
    const nCases = g4Data?.nCases ?? 0;
    const gaps = [];
    if (declaredSourceChapters.length < th.minSourceChapters) {
      gaps.push(`independentSourceChapters=${declaredSourceChapters.length} < ${th.minSourceChapters} (need +${th.minSourceChapters - declaredSourceChapters.length})`);
    }
    if (nCases < th.requiredCases) gaps.push(`N_case=${nCases} < ${th.requiredCases}`);
    gaps.push(`K_rep=0 < ${th.requiredRepeats}`);
    return {
      gate: 'G4',
      status: 'UNDERPOWERED',
      sampleTriplet: {nSourceChapters: declaredSourceChapters.length, nCases, kRep: 0},
      gaps,
      pass: false,
    };
  }

  let baselineProbeKey = null;
  const observedSourceSet = new Set();
  const observedTruthClasses = new Set();

  for (let idx = 0; idx < runs.length; idx++) {
    const pairs = runs[idx]?.pairs;
    if (!Array.isArray(pairs)) {
      return {gate: 'G4', status: 'INVALID_DESIGN', exitCode: 2, error: 'R3_P0_6_G4_CASE_TRACEABILITY_MISSING', pass: false};
    }
    if (pairs.length !== th.requiredCases) {
      return {
        gate: 'G4',
        status: 'INVALID_DESIGN',
        exitCode: 2,
        error: 'R3_P0_6_G4_CASE_COUNT_MUST_BE_EXACT_24',
        runIndex: idx + 1,
        observedCases: pairs.length,
        message: `G4 第 ${idx + 1} 轮实际案例数为 ${pairs.length}，必须严格等于冻结值 ${th.requiredCases}。`,
        pass: false,
      };
    }
    if (g4Data?.nCases !== undefined && g4Data.nCases !== pairs.length) {
      return {
        gate: 'G4',
        status: 'INVALID_DESIGN',
        exitCode: 2,
        error: 'R3_P0_6_G4_CASE_COUNT_MUST_BE_EXACT_24',
        message: `G4 声明案例数 ${g4Data.nCases} 与第 ${idx + 1} 轮实际案例数 ${pairs.length} 不一致。`,
        pass: false,
      };
    }

    const seenCaseIds = new Set();
    const runProbeManifest = [];
    for (const p of pairs) {
      if (!isNonEmptyString(p?.caseId) || !isNonEmptyString(p?.sourceChapterId)) {
        return {
          gate: 'G4',
          status: 'INVALID_DESIGN',
          exitCode: 2,
          error: 'R3_P0_6_G4_CASE_TRACEABILITY_MISSING',
          message: `G4 第 ${idx + 1} 轮存在缺少 caseId 或 sourceChapterId 的探针案例。`,
          pass: false,
        };
      }
      const normCase = normalizeId(p.caseId);
      const normSrc = normalizeId(p.sourceChapterId);
      if (seenCaseIds.has(normCase)) {
        return {
          gate: 'G4',
          status: 'INVALID_DESIGN',
          exitCode: 2,
          error: 'R3_P0_6_G4_DUPLICATE_CASE_ID',
          message: `G4 第 ${idx + 1} 轮存在重复 caseId：${p.caseId}`,
          pass: false,
        };
      }
      seenCaseIds.add(normCase);
      observedSourceSet.add(normSrc);
      const gt = p.truth ?? p.gt;
      if (ORDERED_SEVERITIES.includes(gt)) {
        observedTruthClasses.add(gt);
      }
      runProbeManifest.push({caseId: normCase, sourceChapterId: normSrc, truth: gt});
    }
    runProbeManifest.sort((a, b) => a.caseId.localeCompare(b.caseId, 'en'));
    const sig = canonicalJson(runProbeManifest);
    if (baselineProbeKey === null) {
      baselineProbeKey = sig;
    } else if (sig !== baselineProbeKey) {
      return {
        gate: 'G4',
        status: 'INVALID_DESIGN',
        exitCode: 2,
        error: 'R3_P0_6_G4_RUN_PROBES_MISMATCH',
        message: `G4 第 ${idx + 1} 轮探针集合（caseId/sourceChapterId/truth）与第 1 轮不一致。`,
        pass: false,
      };
    }
  }

  const observedSources = [...observedSourceSet].sort();
  if (declaredSourceChapters.length > 0 && canonicalJson(declaredSourceChapters) !== canonicalJson(observedSources)) {
    return {
      gate: 'G4',
      status: 'INVALID_DESIGN',
      exitCode: 2,
      error: 'R3_P0_6_G4_SOURCE_CHAPTER_MISMATCH',
      declaredSourceChapters,
      observedSourceChapters: observedSources,
      message: `G4 声明来源章集合（${declaredSourceChapters.length} 章）与实际案例 sourceChapterId 集合（${observedSources.length} 章）不一致。`,
      pass: false,
    };
  }

  const gaps = [];
  if (observedSources.length < th.minSourceChapters) {
    gaps.push(`independentSourceChapters=${observedSources.length} < ${th.minSourceChapters} (need +${th.minSourceChapters - observedSources.length})`);
  }
  if (kRep < th.requiredRepeats) gaps.push(`K_rep=${kRep} < ${th.requiredRepeats}`);

  if (gaps.length > 0) {
    return {
      gate: 'G4',
      status: 'UNDERPOWERED',
      sampleTriplet: {nSourceChapters: observedSources.length, nCases: th.requiredCases, kRep},
      gaps,
      pass: false,
    };
  }

  const missingClasses = ORDERED_SEVERITIES.filter(c => !observedTruthClasses.has(c));
  if (missingClasses.length > 0) {
    return {
      gate: 'G4',
      status: 'INVALID_DESIGN',
      exitCode: 2,
      error: 'R3_P0_6_G4_INCOMPLETE_SEVERITY_CLASSES',
      missingClasses,
      message: `G4 四级探针真值缺少有序严重度类别：${missingClasses.join(', ')}（不得以单类或残缺类别代替四级校准）。`,
      pass: false,
    };
  }

  const perRun = [];
  const allPairs = [];
  let suggestionLoopLeaks = 0;

  for (let idx = 0; idx < runs.length; idx++) {
    const run = runs[idx];
    const pairs = run.pairs;
    const kappa = computeOrderedKappa(pairs);
    if (kappa.degenerateMarginals || kappa.quadraticWeightedKappa === null) {
      return {
        gate: 'G4',
        status: 'INVALID_DESIGN',
        exitCode: 2,
        error: 'R3_P0_6_G4_DEGENERATE_KAPPA_UNDEFINED',
        message: `G4 第 ${idx + 1} 轮出现退化边际分布（Kappa 分母为零，无四级区分度），严禁判定为通过。`,
        pass: false,
      };
    }
    const leaks = run.suggestionLoopLeaks ?? 0;
    if (!isNonNegInt(leaks)) {
      return {
        gate: 'G4',
        status: 'INVALID_DESIGN',
        exitCode: 2,
        error: 'R3_P0_6_INVALID_OBSERVATION_COUNTS',
        message: `G4 第 ${idx + 1} 轮 suggestionLoopLeaks 必须为非负整数。`,
        pass: false,
      };
    }
    suggestionLoopLeaks += leaks;
    allPairs.push(...pairs);
    perRun.push({
      runIndex: idx + 1,
      n: kappa.n,
      quadraticWeightedKappa: kappa.quadraticWeightedKappa,
      unweightedKappa: kappa.unweightedKappa,
      kappaStatus: kappa.kappaStatus,
      agreementRate: kappa.agreementRate,
      suggestionLoopLeaks: leaks,
    });
  }

  const pooled = computeOrderedKappa(allPairs);
  if (pooled.degenerateMarginals || pooled.quadraticWeightedKappa === null) {
    return {
      gate: 'G4',
      status: 'INVALID_DESIGN',
      exitCode: 2,
      error: 'R3_P0_6_G4_DEGENERATE_KAPPA_UNDEFINED',
      message: 'G4 汇总边际退化（Kappa 未定义），严禁判定为通过。',
      pass: false,
    };
  }
  const minRunKappaW = Math.min(...perRun.map(r => r.quadraticWeightedKappa));

  const failures = [];
  if (pooled.quadraticWeightedKappa < th.minQuadraticKappa) {
    failures.push(`pooled kappa_w=${pooled.quadraticWeightedKappa} < ${th.minQuadraticKappa}`);
  }
  if (minRunKappaW < th.minQuadraticKappa) {
    failures.push(`min per-run kappa_w=${minRunKappaW} < ${th.minQuadraticKappa}`);
  }
  if (suggestionLoopLeaks > th.maxSuggestionLoopLeaks) {
    failures.push(`SUGGESTION loop leaks=${suggestionLoopLeaks} > 0`);
  }

  return {
    gate: 'G4',
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    pass: failures.length === 0,
    sampleTriplet: {nSourceChapters: observedSources.length, nCases: th.requiredCases, kRep},
    perRun,
    pooled: {
      n: pooled.n,
      labels: pooled.labels,
      confusionMatrix: pooled.confusionMatrix,
      labeledConfusionMatrix: pooled.labeledConfusionMatrix,
      agreementRate: pooled.agreementRate,
      quadraticWeightedKappa: pooled.quadraticWeightedKappa,
      unweightedKappa: pooled.unweightedKappa,
      kappaStatus: pooled.kappaStatus,
    },
    suggestionLoopLeaks,
    failures,
  };
}

/**
 * Evaluate G5 (OR6 Anti-Whitewash PLANNING_CONFLICT_BLOCK & S1/ENG-FIX-P1 Compatibility).
 */
export function evaluateG5(g5Data) {
  const th = FROZEN_THRESHOLDS.G5;
  const deadlockCases = g5Data?.deadlockCases || [];
  const legalTropeCases = g5Data?.legalTropeCases || [];
  const deadlockChapters = [...new Set(deadlockCases.map(c => normalizeId(c.chapterId)).filter(Boolean))];
  const compatEvidenceRef = g5Data?.compatEvidenceRef ?? null;

  const gaps = [];
  if (deadlockChapters.length < th.minDeadlockChapters) {
    gaps.push(`deadlockChapters=${deadlockChapters.length} < ${th.minDeadlockChapters} (need +${th.minDeadlockChapters - deadlockChapters.length})`);
  }
  if (legalTropeCases.length < th.minLegalTropeCases) {
    gaps.push(`legalTropeCases=${legalTropeCases.length} < ${th.minLegalTropeCases}`);
  }

  if (gaps.length > 0) {
    return {
      gate: 'G5',
      status: 'UNDERPOWERED',
      sampleTriplet: {deadlockChapters: deadlockChapters.length, deadlockCases: deadlockCases.length, legalTropeCases: legalTropeCases.length, kRep: 1},
      compatEvidenceRef,
      gaps,
      pass: false,
    };
  }

  const deadlockBlocked = deadlockCases.filter(c => c.decision === 'PLANNING_CONFLICT_BLOCK').length;
  const deadlockWhitewashedToPass = deadlockCases.filter(c => c.decision === 'pass_candidate').length;
  const deadlockBlockRate = deadlockBlocked / deadlockCases.length;

  const legalBlocked = legalTropeCases.filter(c => c.blocking === true).length;
  const legalUnresolved = legalTropeCases.filter(c => typeof c.blocking !== 'boolean').length;
  const legalBlockRate = legalBlocked / legalTropeCases.length;

  const s1CompatPassed = g5Data?.s1CompatPassed === true;
  const engFixP1Passed = g5Data?.engFixP1Passed === true;
  const hasVerifiableCompatRef =
    isPlainObject(compatEvidenceRef) &&
    Object.values(compatEvidenceRef).some(v => isNonEmptyString(v));

  const failures = [];
  if (deadlockBlockRate < th.minDeadlockBlockRate || deadlockWhitewashedToPass > 0) {
    failures.push(`deadlockBlockRate=${round6(deadlockBlockRate)} < 1.0 (whitewashedToPass=${deadlockWhitewashedToPass})`);
  }
  if (legalBlockRate > th.maxLegalTropeBlockRate) {
    failures.push(`legalTropeBlockRate=${round6(legalBlockRate)} > 0`);
  }
  if (legalUnresolved > 0) {
    failures.push(`legalTropeCases has ${legalUnresolved} unresolved/non-boolean blocking decisions`);
  }
  if (!s1CompatPassed) failures.push('S1 bidirectional compatibility check failed');
  if (!engFixP1Passed) failures.push('ENG-FIX-P1 compatibility check failed');
  if (!hasVerifiableCompatRef) failures.push('G5 requires non-empty compatEvidenceRef pointing to verifiable compatibility test artifacts');

  return {
    gate: 'G5',
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    pass: failures.length === 0,
    sampleTriplet: {deadlockChapters: deadlockChapters.length, deadlockCases: deadlockCases.length, legalTropeCases: legalTropeCases.length, kRep: 1},
    deadlockBlockRate: round6(deadlockBlockRate),
    deadlockWhitewashedToPass,
    legalTropeBlockRate: round6(legalBlockRate),
    s1CompatPassed,
    engFixP1Passed,
    compatEvidenceRef,
    failures,
  };
}

/**
 * Evaluate G6 (Cross-Genre Holdout Limited-Budget Engineering Admission Screen, exact K=1).
 */
export function evaluateG6(
  g6Data,
  {referenceChapters = [], seed = DEFAULT_BOOTSTRAP_SEED, iterations = BOOTSTRAP_ITERATIONS, g6BudgetExpansionApproved = false} = {}
) {
  const th = FROZEN_THRESHOLDS.G6;
  const chapters = g6Data?.chapters || [];
  const runsRaw = g6Data?.runs || [];

  const leakage = assertZeroLeakage(referenceChapters, chapters, {holdoutName: 'G6'});
  if (!leakage.ok) {
    return {
      gate: 'G6',
      track: 'independent_cross_genre_holdout',
      framing: 'limited_budget_engineering_screen_not_production_recall_proof',
      status: 'LEAKAGE_REJECTED',
      exitCode: 2,
      error: leakage.error,
      leakageViolations: leakage.violations,
      pass: false,
    };
  }

  const provenance = assertHoldoutInternalProvenanceAndUniqueness(chapters, {holdoutName: 'G6'});
  if (!provenance.ok) {
    return {
      gate: 'G6',
      track: 'independent_cross_genre_holdout',
      framing: 'limited_budget_engineering_screen_not_production_recall_proof',
      status: 'INVALID_DESIGN',
      exitCode: 2,
      error: provenance.error,
      provenanceViolations: provenance.violations,
      pass: false,
    };
  }

  const uCheck = assertUniqueChapters(chapters, 'G6');
  if (!uCheck.ok) {
    return {gate: 'G6', status: 'INVALID_DESIGN', exitCode: 2, error: uCheck.code, message: uCheck.message, pass: false};
  }

  const kRep = runsRaw.length;
  if (kRep > th.requiredRepeats) {
    return {
      gate: 'G6',
      track: 'independent_cross_genre_holdout',
      framing: 'limited_budget_engineering_screen_not_production_recall_proof',
      status: 'INVALID_DESIGN',
      exitCode: 2,
      error: 'R3_P0_6_G6_MUST_BE_SINGLE_SHOT_K1',
      pass: false,
    };
  }

  // Blocking 4: Every chapter MUST carry a valid canonical genre (no unclassified chapters!)
  const genreCounts = new Map();
  for (const ch of chapters) {
    const normG = normalizeCanonicalGenre(ch?.genre);
    if (!normG) {
      return {
        gate: 'G6',
        track: 'independent_cross_genre_holdout',
        framing: 'limited_budget_engineering_screen_not_production_recall_proof',
        status: 'INVALID_DESIGN',
        exitCode: 2,
        error: 'R3_P0_6_INVALID_OR_MISSING_GENRE',
        chapterId: ch.chapterId,
        rawGenre: ch?.genre ?? null,
        message: `G6 章节 ${ch.chapterId} 缺少题材或题材不在 15 个受控规范题材词表中：${String(ch?.genre)}。`,
        pass: false,
      };
    }
    genreCounts.set(normG, (genreCounts.get(normG) || 0) + 1);
  }
  const genres = [...genreCounts.keys()].sort();
  const underRepresentedGenres = [...genreCounts.entries()]
    .filter(([, cnt]) => cnt < th.minChaptersPerGenre)
    .map(([g, cnt]) => ({genre: g, chapters: cnt}));

  const nCh = chapters.length;
  const exceedsBudget = genres.length > th.maxBudgetGenres || nCh > th.maxBudgetChapters;
  const budgetStatus = exceedsBudget
    ? (g6BudgetExpansionApproved ? 'EXCEEDS_FROZEN_BUDGET_APPROVED' : 'EXCEEDS_FROZEN_BUDGET_REQUIRES_AUTHOR_APPROVAL')
    : 'WITHIN_FROZEN_BUDGET';

  if (exceedsBudget && !g6BudgetExpansionApproved) {
    return {
      gate: 'G6',
      track: 'independent_cross_genre_holdout',
      framing: 'limited_budget_engineering_screen_not_production_recall_proof',
      budgetStatus,
      status: 'INVALID_DESIGN',
      exitCode: 2,
      error: 'R3_P0_6_G6_BUDGET_EXCEEDED_UNAPPROVED',
      message: `G6 样本超出冻结预算上限（题材 ${genres.length}/6，章数 ${nCh}/16），未经作者显式批准（g6BudgetExpansionApproved）不得继续正式裁决。`,
      pass: false,
    };
  }

  let derivedRuns = [];
  let manifestIndex = null;
  if (kRep > 0) {
    manifestIndex = buildCaseManifestIndex(chapters, 'g6', 'G6');
    if (!manifestIndex.ok) {
      return {gate: 'G6', status: 'INVALID_DESIGN', exitCode: 2, error: manifestIndex.code, message: manifestIndex.message, pass: false};
    }
    const derived = deriveRunsFromCasePredictions(runsRaw, manifestIndex, 'g6', 'G6');
    if (!derived.ok) {
      return {gate: 'G6', status: 'INVALID_DESIGN', exitCode: 2, error: derived.code, message: derived.message, pass: false};
    }
    derivedRuns = derived.runs;
  }

  const nPos = manifestIndex
    ? manifestIndex.totalPositives
    : countDeclaredChapterField(chapters, 'positives', c => POSITIVE_TRUTH_CLASSES.includes(c?.truthClass));
  const nNeg = manifestIndex
    ? manifestIndex.totalNegatives
    : countDeclaredChapterField(chapters, 'negatives', c => c?.truthClass === 'NON_BLOCKING');

  const gaps = [];
  if (genres.length < th.minGenres) gaps.push(`genres=${genres.length} < ${th.minGenres}`);
  if (underRepresentedGenres.length > 0) {
    gaps.push(
      `underRepresentedGenres(<${th.minChaptersPerGenre}ch): ${underRepresentedGenres.map(u => `${u.genre}(${u.chapters})`).join(', ')}`
    );
  }
  if (nCh < th.minChapters) gaps.push(`N_ch=${nCh} < ${th.minChapters} (need +${th.minChapters - nCh})`);
  if (nPos < th.minPositives) gaps.push(`N_pos=${nPos} < ${th.minPositives} (need +${th.minPositives - nPos})`);
  if (nNeg < th.minNegatives) gaps.push(`N_neg=${nNeg} < ${th.minNegatives} (need +${th.minNegatives - nNeg})`);
  if (kRep < th.requiredRepeats) gaps.push(`K_rep=${kRep} < ${th.requiredRepeats}`);

  if (gaps.length > 0) {
    return {
      gate: 'G6',
      track: 'independent_cross_genre_holdout',
      framing: 'limited_budget_engineering_screen_not_production_recall_proof',
      budgetStatus,
      status: 'UNDERPOWERED',
      sampleTriplet: {nCh, nPos, nNeg, kRep, genres},
      gaps,
      pass: false,
    };
  }

  const runChapters = derivedRuns[0].chapters;
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  let clearTierFp = 0;
  let blockerMisses = 0;
  const heavyChapters = [];

  for (const ch of runChapters) {
    tp += ch.tp;
    fp += ch.fp;
    fn += ch.fn;
    tn += ch.tn;
    clearTierFp += ch.clearTierFp;
    blockerMisses += ch.blockerMisses;
    const totalCasesInCh = ch.tp + ch.fn + ch.fp + ch.tn;
    if (totalCasesInCh > th.clusterWeightDisclosureCaseCap) {
      heavyChapters.push({chapterId: ch.chapterId, totalCases: totalCasesInCh});
    }
  }

  const recallClusters = runChapters.map(c => ({
    chapterId: c.chapterId,
    numerator: c.tp,
    denominator: c.tp + c.fn,
  }));
  const recallBootstrap = chapterClusterBootstrapCI(recallClusters, {iterations, seed});

  const fprClusters = runChapters.map(c => ({
    chapterId: c.chapterId,
    numerator: c.fp,
    denominator: c.fp + c.tn,
  }));
  const fprBootstrap = chapterClusterBootstrapCI(fprClusters, {iterations, seed: seed + 1});

  if (recallBootstrap.nClusters < th.minChapters || fprBootstrap.nClusters < th.minChapters) {
    return {
      gate: 'G6',
      track: 'independent_cross_genre_holdout',
      framing: 'limited_budget_engineering_screen_not_production_recall_proof',
      budgetStatus,
      status: 'UNDERPOWERED',
      sampleTriplet: {
        nCh,
        effectiveRecallClusters: recallBootstrap.nClusters,
        effectiveFprClusters: fprBootstrap.nClusters,
        nPos,
        nNeg,
        kRep,
        genres,
      },
      gaps: [
        ...(recallBootstrap.nClusters < th.minChapters ? [`effective recall clusters=${recallBootstrap.nClusters} < ${th.minChapters}`] : []),
        ...(fprBootstrap.nClusters < th.minChapters ? [`effective FPR clusters=${fprBootstrap.nClusters} < ${th.minChapters}`] : []),
      ],
      pass: false,
    };
  }

  const recallPoint = recallBootstrap.point;
  const recallCiLower = recallBootstrap.ci95[0];
  const fprPoint = fprBootstrap.point;

  const failures = [];
  if (blockerMisses > th.maxBlockerMisses) {
    failures.push(`Objective BLOCKER misses=${blockerMisses} > ${th.maxBlockerMisses}`);
  }
  if (recallPoint === null || recallPoint < th.minCombinedRecallPoint) {
    failures.push(`G6 combined recall point=${recallPoint} < ${th.minCombinedRecallPoint}`);
  }
  if (recallCiLower === null || recallCiLower < th.minCombinedRecallCiLower) {
    failures.push(`G6 combined recall 95% CI lower=${recallCiLower} < ${th.minCombinedRecallCiLower}`);
  }
  if (fprPoint === null || fprPoint > th.maxFpr) {
    failures.push(`G6 non-blocking FPR=${fprPoint} > ${th.maxFpr}`);
  }
  if (clearTierFp > th.maxClearTierFp) {
    failures.push(`G6 Clear-tier FP=${clearTierFp} > ${th.maxClearTierFp}`);
  }

  return {
    gate: 'G6',
    track: 'independent_cross_genre_holdout',
    framing: 'limited_budget_engineering_screen_not_production_recall_proof',
    budgetStatus,
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    pass: failures.length === 0,
    sampleTriplet: {
      nCh,
      effectiveRecallClusters: recallBootstrap.nClusters,
      effectiveFprClusters: fprBootstrap.nClusters,
      nPos,
      nNeg,
      kRep,
      genres,
    },
    rawCounts: {tp, fp, fn, tn, clearTierFp, blockerMisses},
    recallClusterBootstrap95CI: recallBootstrap,
    fprClusterBootstrap95CI: fprBootstrap,
    clusterWeightDisclosure: heavyChapters,
    failures,
  };
}

/**
 * Evaluate a single scheme across all 7 separated gates (G1, G2-A, G2-B, G3, G4, G5, G6).
 * Strictly forbids merged `G2` key (`R3_P0_6_MERGED_G2_FORBIDDEN`).
 */
export function evaluateSchemeG1ToG6(
  schemeName,
  schemeData,
  {referenceChapters = [], seed = DEFAULT_BOOTSTRAP_SEED, iterations = BOOTSTRAP_ITERATIONS, g6BudgetExpansionApproved = false} = {}
) {
  if (isPlainObject(schemeData) && Object.hasOwn(schemeData, 'G2')) {
    return {
      scheme: schemeName,
      status: 'INVALID_DESIGN',
      exitCode: 2,
      error: 'R3_P0_6_MERGED_G2_FORBIDDEN',
      message: '严禁合并提交 G2；必须严格分轨提供 G2A（历史回归）与 G2B（独立 Holdout）。',
      gates: {},
      allGatesPassed: false,
      underpoweredGates: [],
      failedGates: ['G2'],
      avgReviewLatencyMs: schemeData?.avgReviewLatencyMs ?? null,
    };
  }

  const refAll = [
    ...referenceChapters,
    ...(schemeData?.G1?.track2?.chapters || []),
    ...(schemeData?.G1?.regression7?.chapters || []),
    ...(schemeData?.G2A?.chapters || []),
  ];

  const G1 = evaluateG1(schemeData?.G1, {seed, iterations});
  const G2A = evaluateG2A(schemeData?.G2A, {seed: seed + 10, iterations});
  const G2B = evaluateG2B(schemeData?.G2B, {referenceChapters: refAll, seed: seed + 20, iterations});
  const G3 = evaluateG3(schemeData?.G3, {seed: seed + 30, iterations});
  const G4 = evaluateG4(schemeData?.G4);
  const G5 = evaluateG5(schemeData?.G5);
  const G6 = evaluateG6(schemeData?.G6, {
    referenceChapters: refAll,
    seed: seed + 40,
    iterations,
    g6BudgetExpansionApproved,
  });

  const gates = {G1, G2A, G2B, G3, G4, G5, G6};
  const gateList = Object.values(gates);

  const leakageGate = gateList.find(g => g.status === 'LEAKAGE_REJECTED');
  if (leakageGate) {
    return {
      scheme: schemeName,
      status: 'LEAKAGE_REJECTED',
      exitCode: 2,
      error: leakageGate.error,
      gates,
      allGatesPassed: false,
      underpoweredGates: [],
      failedGates: [leakageGate.gate],
      avgReviewLatencyMs: schemeData?.avgReviewLatencyMs ?? null,
    };
  }

  const invalidGate = gateList.find(g => g.status === 'INVALID_DESIGN');
  if (invalidGate) {
    return {
      scheme: schemeName,
      status: 'INVALID_DESIGN',
      exitCode: 2,
      error: invalidGate.error,
      gates,
      allGatesPassed: false,
      underpoweredGates: [],
      failedGates: [invalidGate.gate],
      avgReviewLatencyMs: schemeData?.avgReviewLatencyMs ?? null,
    };
  }

  const underpoweredGates = gateList.filter(g => g.status === 'UNDERPOWERED').map(g => g.gate);
  const failedGates = gateList.filter(g => g.status === 'FAIL').map(g => g.gate);
  const allGatesPassed = gateList.every(g => g.pass === true);

  let status = 'PASS';
  if (underpoweredGates.length > 0) status = 'UNDERPOWERED';
  else if (failedGates.length > 0) status = 'FAIL';

  return {
    scheme: schemeName,
    status,
    exitCode: 0,
    gates,
    allGatesPassed,
    underpoweredGates,
    failedGates,
    avgReviewLatencyMs: schemeData?.avgReviewLatencyMs ?? null,
  };
}

function normalizeChapterManifestForEquivalence(chapters) {
  return (chapters || [])
    .map(c => ({
      chapterId: normalizeId(c?.chapterId),
      sourceChapterId: isNonEmptyString(c?.sourceChapterId) ? normalizeId(c.sourceChapterId) : null,
      contentSha256: isNonEmptyString(c?.contentSha256) ? c.contentSha256.trim().toLowerCase() : null,
      genre: normalizeCanonicalGenre(c?.genre) ?? (isNonEmptyString(c?.genre) ? c.genre.trim() : null),
      positives: c?.positives ?? null,
      negatives: c?.negatives ?? null,
      paragraphs: c?.paragraphs ?? null,
      cases: Array.isArray(c?.cases)
        ? c.cases
            .map(item => ({
              caseId: normalizeId(item?.caseId),
              truthClass: item?.truthClass ?? null,
              tier: item?.tier ?? null,
            }))
            .sort((a, b) => a.caseId.localeCompare(b.caseId, 'en'))
        : null,
    }))
    .sort((a, b) => a.chapterId.localeCompare(b.chapterId, 'en'));
}

/**
 * Extract canonical case-level evaluation dataset signature for a scheme so A, B, and C are guaranteed
 * to be adjudicated on the EXACT SAME frozen chapters, source IDs, content hashes, caseIds, truthClasses, and tiers.
 */
export function extractSchemeDatasetSignature(schemeData) {
  const g4Run0Pairs = Array.isArray(schemeData?.G4?.runs?.[0]?.pairs)
    ? schemeData.G4.runs[0].pairs
        .map(p => ({
          caseId: normalizeId(p?.caseId),
          sourceChapterId: normalizeId(p?.sourceChapterId),
          truth: p?.truth ?? p?.gt ?? null,
        }))
        .sort((a, b) => a.caseId.localeCompare(b.caseId, 'en'))
    : null;

  return {
    G1_track2: normalizeChapterManifestForEquivalence(schemeData?.G1?.track2?.chapters),
    G1_regression7: normalizeChapterManifestForEquivalence(schemeData?.G1?.regression7?.chapters),
    G2A: normalizeChapterManifestForEquivalence(schemeData?.G2A?.chapters),
    G2B: normalizeChapterManifestForEquivalence(schemeData?.G2B?.chapters),
    G3: normalizeChapterManifestForEquivalence(schemeData?.G3?.chapters),
    G4: {
      sourceChapters: [...new Set((schemeData?.G4?.sourceChapters || []).filter(isNonEmptyString).map(normalizeId))].sort(),
      nCases: schemeData?.G4?.nCases ?? (g4Run0Pairs ? g4Run0Pairs.length : 0),
      probes: g4Run0Pairs,
    },
    G5: {
      deadlockChapters: (schemeData?.G5?.deadlockCases || []).map(c => normalizeId(c?.chapterId)).sort(),
      legalTropeIds: (schemeData?.G5?.legalTropeCases || []).map(c => normalizeId(c?.caseId)).sort(),
    },
    G6: normalizeChapterManifestForEquivalence(schemeData?.G6?.chapters),
  };
}

function assertFairABCEquivalence(schemesPayload) {
  if (!isPlainObject(schemesPayload)) {
    return {
      ok: false,
      code: 'R3_P0_6_INCOMPLETE_ABC_SCHEMES',
      message: '正式裁决必须提供完整的 A / B / C 三方案数据。',
    };
  }
  const presentKeys = Object.keys(schemesPayload).sort();
  const missing = REQUIRED_ADJUDICATION_SCHEMES.filter(k => !isPlainObject(schemesPayload[k]));
  const extra = presentKeys.filter(k => !REQUIRED_ADJUDICATION_SCHEMES.includes(k));
  if (missing.length > 0 || extra.length > 0) {
    return {
      ok: false,
      code: 'R3_P0_6_INCOMPLETE_ABC_SCHEMES',
      missingSchemes: missing,
      unexpectedSchemes: extra,
      message: `正式 A/B/C 同台裁决要求三方案齐备（缺失：${missing.join(', ') || '无'}；多余：${extra.join(', ') || '无'}）；单方案诊断请调用 evaluateSchemeG1ToG6()。`,
    };
  }

  const sigA = extractSchemeDatasetSignature(schemesPayload.A);
  const sigB = extractSchemeDatasetSignature(schemesPayload.B);
  const sigC = extractSchemeDatasetSignature(schemesPayload.C);

  const mismatchedGates = [];
  for (const gateKey of Object.keys(sigA)) {
    const aStr = canonicalJson(sigA[gateKey]);
    if (canonicalJson(sigB[gateKey]) !== aStr || canonicalJson(sigC[gateKey]) !== aStr) {
      mismatchedGates.push(gateKey);
    }
  }
  if (mismatchedGates.length > 0) {
    return {
      ok: false,
      code: 'R3_P0_6_UNEQUAL_EVALUATION_DATASET',
      mismatchedGates,
      message: `A / B / C 三方案在以下门禁使用了不等价的评测集（章节 ID、来源章、内容哈希、案例主键或真值标注不一致）：${mismatchedGates.join(', ')}。`,
    };
  }
  return {ok: true};
}

/**
 * Side-by-side Go / No-Go adjudication across Schemes A, B, and C (frozen `08` §1.1 & §3).
 */
export function adjudicateSchemes(
  schemesPayload,
  {referenceChapters = [], seed = DEFAULT_BOOTSTRAP_SEED, iterations = BOOTSTRAP_ITERATIONS, g6BudgetExpansionApproved = false} = {}
) {
  const fairness = assertFairABCEquivalence(schemesPayload);
  if (!fairness.ok) {
    return {
      schemaVersion: P0_6_STATS_SCHEMA,
      ok: false,
      exitCode: 2,
      verdict: 'INVALID_DESIGN',
      error: fairness.code,
      message: fairness.message,
      ...(fairness.missingSchemes ? {missingSchemes: fairness.missingSchemes} : {}),
      ...(fairness.mismatchedGates ? {mismatchedGates: fairness.mismatchedGates} : {}),
      winner: null,
      allowProductionMerge: false,
      requiresGpt6AcceptanceAndAuthorApproval: true,
      schemes: {},
    };
  }

  const evaluated = {};
  for (const name of REQUIRED_ADJUDICATION_SCHEMES) {
    evaluated[name] = evaluateSchemeG1ToG6(name, schemesPayload[name], {
      referenceChapters,
      seed,
      iterations,
      g6BudgetExpansionApproved,
    });
    if (evaluated[name].status === 'LEAKAGE_REJECTED' || evaluated[name].status === 'INVALID_DESIGN') {
      return {
        schemaVersion: P0_6_STATS_SCHEMA,
        ok: false,
        exitCode: 2,
        verdict: evaluated[name].status,
        error: evaluated[name].error,
        winner: null,
        allowProductionMerge: false,
        requiresGpt6AcceptanceAndAuthorApproval: true,
        schemes: evaluated,
      };
    }
  }

  // Scheme B hard elimination rule (frozen `08` §1.1 rule 2, float-safe round6 comparison)
  const eliminations = {};
  if (evaluated.B) {
    const reasons = [];
    const bG1Recall = evaluated.B.gates.G1.track2?.recallSummary?.mean ?? null;
    const bG6Recall = evaluated.B.gates.G6.recallClusterBootstrap95CI?.point ?? null;
    const bG1BlkMiss = evaluated.B.gates.G1.knownBlockerMisses ?? 0;
    const bG6BlkMiss = evaluated.B.gates.G6.rawCounts?.blockerMisses ?? 0;

    if (bG1BlkMiss > 0) reasons.push(`SCHEME_B_G1_BLOCKER_MISS:${bG1BlkMiss}`);
    if (bG6BlkMiss > 0) reasons.push(`SCHEME_B_G6_BLOCKER_MISS:${bG6BlkMiss}`);

    for (const peerName of ['A', 'C']) {
      if (!evaluated[peerName]) continue;
      const peerG1Recall = evaluated[peerName].gates.G1.track2?.recallSummary?.mean ?? null;
      const peerG6Recall = evaluated[peerName].gates.G6.recallClusterBootstrap95CI?.point ?? null;
      if (bG1Recall !== null && peerG1Recall !== null && round6(peerG1Recall - bG1Recall) > FROZEN_THRESHOLDS.SCHEME_B_ELIMINATION.maxRecallLagVsAC) {
        reasons.push(`SCHEME_B_G1_RECALL_LAG_VS_${peerName}:${round6(peerG1Recall - bG1Recall)}`);
      }
      if (bG6Recall !== null && peerG6Recall !== null && round6(peerG6Recall - bG6Recall) > FROZEN_THRESHOLDS.SCHEME_B_ELIMINATION.maxRecallLagVsAC) {
        reasons.push(`SCHEME_B_G6_RECALL_LAG_VS_${peerName}:${round6(peerG6Recall - bG6Recall)}`);
      }
    }
    if (reasons.length > 0) {
      eliminations.B = {eliminated: true, reasons};
    }
  }

  const anyUnderpowered = Object.values(evaluated).some(s => s.underpoweredGates.length > 0);
  if (anyUnderpowered) {
    const sampleGaps = {};
    for (const [sName, res] of Object.entries(evaluated)) {
      sampleGaps[sName] = {};
      for (const gKey of res.underpoweredGates) {
        const key = gKey === 'G2-A' ? 'G2A' : gKey === 'G2-B' ? 'G2B' : gKey;
        sampleGaps[sName][gKey] = {
          sampleTriplet: res.gates[key].sampleTriplet,
          gaps: res.gates[key].gaps,
        };
      }
    }
    return {
      schemaVersion: P0_6_STATS_SCHEMA,
      ok: true,
      exitCode: 0,
      verdict: 'BLOCKED_UNDERPOWERED',
      winner: null,
      allowProductionMerge: false,
      requiresGpt6AcceptanceAndAuthorApproval: true,
      eliminations,
      sampleGaps,
      schemes: evaluated,
      note: '独立 Holdout 或必需样本门槛未齐，强制维持 BLOCKED_UNDERPOWERED，严禁混算 G2-A/G2-B、严禁降门槛、严禁合入生产主干。',
    };
  }

  const passingCandidates = Object.values(evaluated).filter(
    s => s.allGatesPassed && !eliminations[s.scheme]?.eliminated
  );

  if (passingCandidates.length === 0) {
    return {
      schemaVersion: P0_6_STATS_SCHEMA,
      ok: true,
      exitCode: 0,
      verdict: 'NO_GO_ALL_SCHEMES_FAILED',
      winner: null,
      allowProductionMerge: false,
      requiresGpt6AcceptanceAndAuthorApproval: true,
      eliminations,
      schemes: evaluated,
      note: 'A / B / C 三方案均未全部通过 G1–G6 硬门槛（或被硬淘汰），触发停机规则 1，严禁合入生产主干。',
    };
  }

  const ranked = [...passingCandidates].sort((x, y) => {
    const xG6 = x.gates.G6.recallClusterBootstrap95CI.point ?? -1;
    const yG6 = y.gates.G6.recallClusterBootstrap95CI.point ?? -1;
    if (yG6 !== xG6) return yG6 - xG6;

    const xFpr = x.gates.G2B.fprSummary.mean ?? Infinity;
    const yFpr = y.gates.G2B.fprSummary.mean ?? Infinity;
    if (xFpr !== yFpr) return xFpr - yFpr;

    const xVar = x.gates.G2B.fprSummary.variance ?? Infinity;
    const yVar = y.gates.G2B.fprSummary.variance ?? Infinity;
    if (xVar !== yVar) return xVar - yVar;

    const xLat = typeof x.avgReviewLatencyMs === 'number' ? x.avgReviewLatencyMs : Infinity;
    const yLat = typeof y.avgReviewLatencyMs === 'number' ? y.avgReviewLatencyMs : Infinity;
    if (xLat !== yLat) return xLat - yLat;

    return x.scheme.localeCompare(y.scheme, 'en');
  });

  const winner = ranked[0].scheme;
  return {
    schemaVersion: P0_6_STATS_SCHEMA,
    ok: true,
    exitCode: 0,
    verdict: 'GO_CANDIDATE_SELECTED',
    winner,
    ranking: ranked.map(s => ({
      scheme: s.scheme,
      g6Recall: s.gates.G6.recallClusterBootstrap95CI.point,
      g6RecallCi95: s.gates.G6.recallClusterBootstrap95CI.ci95,
      g2bMeanFpr: s.gates.G2B.fprSummary.mean,
      g2bFprVariance: s.gates.G2B.fprSummary.variance,
      avgReviewLatencyMs: s.avgReviewLatencyMs,
    })),
    allowProductionMerge: false,
    requiresGpt6AcceptanceAndAuthorApproval: true,
    eliminations,
    schemes: evaluated,
  };
}

function parseCliArgs(argv) {
  const [cmd, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--input' && rest[i + 1]) opts.input = rest[++i];
    else if (rest[i] === '--out' && rest[i + 1]) opts.out = rest[++i];
    else if (rest[i] === '--seed' && rest[i + 1]) opts.seed = Number(rest[++i]);
    else if (rest[i] === '--approve-g6-budget-expansion') opts.g6BudgetExpansionApproved = true;
  }
  return {cmd, opts};
}

const isDirectCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectCli) {
  const {cmd, opts} = parseCliArgs(process.argv.slice(2));
  if (cmd !== 'evaluate' || !opts.input) {
    console.log(
      JSON.stringify({
        ok: false,
        exitCode: 2,
        error: 'R3_P0_6_CLI_USAGE',
        usage: 'node scripts/p0_prototypes/eval_g1_g6_stats.mjs evaluate --input <payload.json> [--out <report.json>] [--seed <int>]',
      })
    );
    process.exit(2);
  }
  try {
    const raw = fs.readFileSync(path.resolve(opts.input), 'utf8').replace(/^\uFEFF/, '');
    const payload = JSON.parse(raw);
    const seed = Number.isSafeInteger(opts.seed) ? opts.seed : DEFAULT_BOOTSTRAP_SEED;
    const result = adjudicateSchemes(payload.schemes || {}, {
      referenceChapters: payload.referenceChapters || [],
      seed,
      iterations: payload.iterations ?? BOOTSTRAP_ITERATIONS,
      g6BudgetExpansionApproved: opts.g6BudgetExpansionApproved === true || payload.g6BudgetExpansionApproved === true,
    });
    const outText = JSON.stringify(result, null, 2) + '\n';
    if (opts.out) {
      fs.mkdirSync(path.dirname(path.resolve(opts.out)), {recursive: true});
      fs.writeFileSync(path.resolve(opts.out), outText, 'utf8');
    }
    process.stdout.write(outText);
    process.exit(result.exitCode);
  } catch (err) {
    console.log(JSON.stringify({ok: false, exitCode: 2, error: err?.message || 'R3_P0_6_CLI_ERROR'}));
    process.exit(2);
  }
}
