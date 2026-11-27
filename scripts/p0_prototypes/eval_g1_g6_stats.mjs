#!/usr/bin/env node
/**
 * P0-6: Deterministic G1-G6 Statistical Verification, Anti-Leakage & A/B/C Go/No-Go Adjudication Engine.
 *
 * Implements frozen acceptance protocol `08-工程效率与文学质量双重验收方案.md` (v1.2.3) §2.1 & §3
 * and `P0-Implementation-PRD.md` task `P0-6`:
 *   - Strict separation of `G2-A Regression/Calibration` vs `G2-B Independent Holdout` (ZERO mixing!)
 *   - Hard anti-leakage assertions: zero chapter/content overlap & retired blacklist (`NH-1..5`, `V22-H1..4`,
 *     `OLD-HOLD-1..4`, `DOC-1..6`, `Arm 0..2 Ch 1..3`, etc.)
 *   - Deterministic chapter-cluster nonparametric Bootstrap 95% CI (locked B = 2,000, explicit reminder that
 *     Bootstrap does NOT compensate for insufficient independent chapters N_ch)
 *   - Exact ordered 4-class confusion matrix (`BLOCKER`, `MAJOR`, `MINOR`, `SUGGESTION`), quadratic weighted
 *     Kappa (primary, >= 0.85) + unweighted Cohen's Kappa (auxiliary) + `SUGGESTION` loop-leak count
 *   - Mandatory `UNDERPOWERED` / `BLOCKED_UNDERPOWERED` enforcement whenever fresh independent samples are
 *     below frozen thresholds (NEVER weakens thresholds or fabricates a PASS!)
 *   - Scheme B hard elimination rule (> 1.0 pp recall lag vs A/C in G1 or G6, or ANY 1 BLOCKER miss)
 *   - Multi-winner priority tie-break: (1) G6 BLOCKER=0 & highest recall -> (2) G2-B lowest FPR & lowest variance -> (3) lowest latency
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const P0_6_STATS_SCHEMA = 'r3-p0-6-g1-g6-stats-1';
export const BOOTSTRAP_ITERATIONS = 2000;
export const DEFAULT_BOOTSTRAP_SEED = 20261126;

export const ORDERED_SEVERITIES = Object.freeze(['BLOCKER', 'MAJOR', 'MINOR', 'SUGGESTION']);

export const FROZEN_THRESHOLDS = Object.freeze({
  G1: Object.freeze({
    minTrack2Chapters: 9,
    minTrack2Positives: 40,
    minTrack2Repeats: 3,
    minRegressionChapters: 7,
    minRegressionRepeats: 1,
    minTrack2Recall: 0.95,
    minRegressionDetectionRate: 1.0,
    maxBlockerMisses: 0,
  }),
  G2A: Object.freeze({
    minChapters: 9,
    minNegatives: 33,
    minRepeats: 3,
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
    minRepeats: 3,
    maxClearTierFpPerRun: 0,
    maxMeanFpr: 0.13,
    maxSingleRunFpr: 0.15,
    minPrecision: 0.88,
  }),
  G3: Object.freeze({
    minChapters: 10,
    minCases: 15,
    maxCasesPerChapter: 2,
    minRepeats: 3,
    minNonBlockingRate: 1.0,
    minNoIssueRate: 0.90,
  }),
  G4: Object.freeze({
    minSourceChapters: 8,
    minCases: 24,
    minRepeats: 2,
    minQuadraticKappa: 0.85,
    maxSuggestionLoopLeaks: 0,
  }),
  G5: Object.freeze({
    minDeadlockChapters: 3,
    minLegalTropeCases: 1,
    minRepeats: 1,
    minDeadlockBlockRate: 1.0,
    maxLegalTropeBlockRate: 0.0,
  }),
  G6: Object.freeze({
    minGenres: 4,
    minChapters: 12,
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
const round6 = x => (typeof x === 'number' && Number.isFinite(x) ? Number(x.toFixed(6)) : null);

export function normalizeId(raw) {
  if (typeof raw !== 'string') return '';
  return raw.trim().replace(/\s+/g, '-').toUpperCase();
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
 * Fails closed with violation list if ANY chapter overlaps (by chapterId, sourceChapterId, or contentSha256)
 * or hits the retired blacklist (`NH-1..5`, `V22-H1..4`, `OLD-HOLD-1..4`, `DOC-1..6`, `Arm 0..2 Ch 1..3`, etc.).
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
 * Chapter-level cluster nonparametric Bootstrap 95% CI (locked B = 2,000).
 *
 * Each entry in `clusters` represents ONE independent chapter:
 *   { chapterId: string, numerator: number, denominator: number }
 * Resamples whole chapters with replacement B times and takes the [2.5%, 97.5%] percentiles.
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

  const degenerateMarginals = weightedExp === 0 || 1 - peUnweighted === 0;
  const quadraticWeightedKappa =
    weightedExp === 0 ? (weightedObs === 0 ? 1.0 : null) : 1 - weightedObs / weightedExp;
  const unweightedKappa =
    1 - peUnweighted === 0 ? (poUnweighted === 1 ? 1.0 : null) : (poUnweighted - peUnweighted) / (1 - peUnweighted);

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
    degenerateMarginals,
  };
}

function summarizeSeries(values) {
  const valid = values.filter(v => typeof v === 'number' && Number.isFinite(v));
  if (valid.length === 0) {
    return {count: 0, mean: null, min: null, max: null, range: null, variance: null};
  }
  const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  const variance =
    valid.length > 1
      ? valid.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / (valid.length - 1)
      : 0;
  return {
    count: valid.length,
    mean: round6(mean),
    min: round6(min),
    max: round6(max),
    range: round6(max - min),
    variance: round6(variance),
  };
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
  const perRun = [];
  for (let idx = 0; idx < (runs || []).length; idx++) {
    const run = runs[idx];
    let rTp = 0;
    let rFp = 0;
    let rFn = 0;
    let rTn = 0;
    let rClearFp = 0;
    for (const ch of run.chapters || []) {
      rTp += ch.tp || 0;
      rFp += ch.fp || 0;
      rFn += ch.fn || 0;
      rTn += ch.tn || 0;
      rClearFp += ch.clearTierFp || 0;
    }
    tp += rTp;
    fp += rFp;
    fn += rFn;
    tn += rTn;
    clearTierFp += rClearFp;
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
      fpr: round6(fpr),
      recall: round6(recall),
      precision: round6(precision),
    });
  }
  return {
    rawTotalsAcrossRuns: {tp, fp, fn, tn, clearTierFp},
    perRun,
  };
}

function assertUniqueChapters(chapters, gateName) {
  const seen = new Set();
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
    if (seen.has(id)) {
      duplicates.push(ch.chapterId);
    }
    seen.add(id);
  }
  if (duplicates.length > 0) {
    return {
      ok: false,
      code: 'R3_P0_6_DUPLICATE_CHAPTER_ID',
      duplicates,
      message: `${gateName} 存在重复 chapterId（严禁通过重复章节虚增独立章节数 N_ch）：${duplicates.join(', ')}`,
    };
  }
  return {ok: true, idSet: seen};
}

function assertRunsOnlyUseDeclaredChapters(runs, declaredIdSet, gateName) {
  for (let idx = 0; idx < (runs || []).length; idx++) {
    const runSeen = new Set();
    for (const ch of runs[idx]?.chapters || []) {
      const id = normalizeId(ch?.chapterId);
      if (!id || !declaredIdSet.has(id)) {
        return {
          ok: false,
          code: 'R3_P0_6_UNDECLARED_RUN_CHAPTER',
          runIndex: idx + 1,
          chapterId: ch?.chapterId ?? null,
          message: `${gateName} 第 ${idx + 1} 轮出现未在章节清册中声明的 chapterId：${String(ch?.chapterId)}`,
        };
      }
      if (runSeen.has(id)) {
        return {
          ok: false,
          code: 'R3_P0_6_DUPLICATE_CHAPTER_ID',
          runIndex: idx + 1,
          chapterId: ch.chapterId,
          message: `${gateName} 第 ${idx + 1} 轮重复出现 chapterId：${ch.chapterId}`,
        };
      }
      runSeen.add(id);
    }
  }
  return {ok: true};
}

/**
 * Evaluate G1: Track 2 High-Recall Defense (Regression/Calibration) + 7-Chapter Known Regression.
 */
export function evaluateG1(g1Data, {seed = DEFAULT_BOOTSTRAP_SEED, iterations = BOOTSTRAP_ITERATIONS} = {}) {
  const th = FROZEN_THRESHOLDS.G1;
  const track2Chapters = g1Data?.track2?.chapters || [];
  const track2Runs = g1Data?.track2?.runs || [];
  const regChapters = g1Data?.regression7?.chapters || [];
  const regRuns = g1Data?.regression7?.runs || [];

  const uT2 = assertUniqueChapters(track2Chapters, 'G1.track2');
  if (!uT2.ok) return {gate: 'G1', status: 'INVALID_DESIGN', exitCode: 2, error: uT2.code, message: uT2.message, pass: false};
  const rT2 = assertRunsOnlyUseDeclaredChapters(track2Runs, uT2.idSet, 'G1.track2');
  if (!rT2.ok) return {gate: 'G1', status: 'INVALID_DESIGN', exitCode: 2, error: rT2.code, message: rT2.message, pass: false};
  const uReg = assertUniqueChapters(regChapters, 'G1.regression7');
  if (!uReg.ok) return {gate: 'G1', status: 'INVALID_DESIGN', exitCode: 2, error: uReg.code, message: uReg.message, pass: false};
  const rReg = assertRunsOnlyUseDeclaredChapters(regRuns, uReg.idSet, 'G1.regression7');
  if (!rReg.ok) return {gate: 'G1', status: 'INVALID_DESIGN', exitCode: 2, error: rReg.code, message: rReg.message, pass: false};

  const nChTrack2 = track2Chapters.length;
  const nPosTrack2 = track2Chapters.reduce((acc, c) => acc + (c.positives || 0), 0);
  const kRepTrack2 = track2Runs.length;
  const nChReg = regChapters.length;
  const kRepReg = regRuns.length;

  const gaps = [];
  if (nChTrack2 < th.minTrack2Chapters) gaps.push(`Track2 N_ch=${nChTrack2} < ${th.minTrack2Chapters}`);
  if (nPosTrack2 < th.minTrack2Positives) gaps.push(`Track2 N_pos=${nPosTrack2} < ${th.minTrack2Positives}`);
  if (kRepTrack2 < th.minTrack2Repeats) gaps.push(`Track2 K_rep=${kRepTrack2} < ${th.minTrack2Repeats}`);
  if (nChReg < th.minRegressionChapters) gaps.push(`Regression7 N_ch=${nChReg} < ${th.minRegressionChapters}`);
  if (kRepReg < th.minRegressionRepeats) gaps.push(`Regression7 K_rep=${kRepReg} < ${th.minRegressionRepeats}`);

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

  const t2Summary = summarizeConfusionAcrossRuns(track2Runs);
  for (const r of t2Summary.perRun) {
    if (r.tp + r.fn < th.minTrack2Positives) {
      return {
        gate: 'G1',
        track: 'regression_calibration',
        isIndependentGeneralization: false,
        status: 'UNDERPOWERED',
        sampleTriplet: {
          track2: {nCh: nChTrack2, nPos: r.tp + r.fn, kRep: kRepTrack2},
          regression7: {nCh: nChReg, kRep: kRepReg},
        },
        gaps: [`Track2 run ${r.runIndex} evaluated positives=${r.tp + r.fn} < ${th.minTrack2Positives}`],
        pass: false,
      };
    }
  }
  const t2RecallSeries = summarizeSeries(t2Summary.perRun.map(r => r.recall));
  const t2Clusters = aggregateRunsByChapter(track2Runs, c => ({
    numerator: c.tp || 0,
    denominator: (c.tp || 0) + (c.fn || 0),
  }));
  const t2RecallBootstrap = chapterClusterBootstrapCI(t2Clusters, {iterations, seed});

  const regSummary = summarizeConfusionAcrossRuns(regRuns);
  const regRecallSeries = summarizeSeries(regSummary.perRun.map(r => r.recall));

  let totalBlockerMisses = 0;
  for (const run of [...track2Runs, ...regRuns]) {
    for (const ch of run.chapters || []) {
      totalBlockerMisses += ch.blockerMisses || 0;
    }
  }

  const failures = [];
  if (t2RecallSeries.mean === null || t2RecallSeries.mean < th.minTrack2Recall) {
    failures.push(`Track2 recall mean=${t2RecallSeries.mean} < ${th.minTrack2Recall}`);
  }
  if (regRecallSeries.min === null || regRecallSeries.min < th.minRegressionDetectionRate) {
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
      track2: {nCh: nChTrack2, nPos: nPosTrack2, kRep: kRepTrack2},
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
  const runs = g2Data?.runs || [];

  const uCheck = assertUniqueChapters(chapters, gateName);
  if (!uCheck.ok) {
    return {gate: gateName, track, status: 'INVALID_DESIGN', exitCode: 2, error: uCheck.code, message: uCheck.message, pass: false};
  }
  const rCheck = assertRunsOnlyUseDeclaredChapters(runs, uCheck.idSet, gateName);
  if (!rCheck.ok) {
    return {gate: gateName, track, status: 'INVALID_DESIGN', exitCode: 2, error: rCheck.code, message: rCheck.message, pass: false};
  }

  const nCh = chapters.length;
  const nNeg = chapters.reduce((acc, c) => acc + (c.negatives || 0), 0);
  const kRep = runs.length;
  const genres = [...new Set(chapters.map(c => c?.genre).filter(isNonEmptyString))];

  if (maxCasesPerChapter !== null) {
    const capViolations = chapters.filter(c => (c.negatives || 0) > maxCasesPerChapter);
    if (capViolations.length > 0) {
      return {
        gate: gateName,
        track,
        status: 'INVALID_DESIGN',
        exitCode: 2,
        error: 'R3_P0_6_G2B_CHAPTER_CASE_CAP_EXCEEDED',
        pass: false,
        offendingChapters: capViolations.map(c => ({chapterId: c.chapterId, negatives: c.negatives})),
      };
    }
    for (const run of runs) {
      const runCapViolations = (run.chapters || []).filter(c => (c.fp || 0) + (c.tn || 0) > maxCasesPerChapter);
      if (runCapViolations.length > 0) {
        return {
          gate: gateName,
          track,
          status: 'INVALID_DESIGN',
          exitCode: 2,
          error: 'R3_P0_6_G2B_CHAPTER_CASE_CAP_EXCEEDED',
          pass: false,
          offendingChapters: runCapViolations.map(c => ({chapterId: c.chapterId, evaluatedNegatives: (c.fp || 0) + (c.tn || 0)})),
        };
      }
    }
  }

  const gaps = [];
  if (nCh < thresholds.minChapters) gaps.push(`N_ch=${nCh} < ${thresholds.minChapters} (need +${thresholds.minChapters - nCh})`);
  if (nNeg < thresholds.minNegatives) gaps.push(`N_neg=${nNeg} < ${thresholds.minNegatives} (need +${thresholds.minNegatives - nNeg})`);
  if (requireGenres && genres.length < thresholds.minGenres) {
    gaps.push(`genres=${genres.length} < ${thresholds.minGenres} (need +${thresholds.minGenres - genres.length})`);
  }
  if (kRep < thresholds.minRepeats) gaps.push(`K_rep=${kRep} < ${thresholds.minRepeats}`);

  if (gaps.length > 0) {
    return {
      gate: gateName,
      track,
      isIndependentGeneralization: gateName === 'G2-B',
      g2aPassDoesNotImplyG2bPass: true,
      doNotExtrapolatePrecisionToProduction: true,
      status: 'UNDERPOWERED',
      sampleTriplet: {nCh, nNeg, kRep, genres},
      gaps,
      pass: false,
    };
  }

  const summary = summarizeConfusionAcrossRuns(runs);
  for (const r of summary.perRun) {
    if (r.fp + r.tn < thresholds.minNegatives) {
      return {
        gate: gateName,
        track,
        isIndependentGeneralization: gateName === 'G2-B',
        g2aPassDoesNotImplyG2bPass: true,
        doNotExtrapolatePrecisionToProduction: true,
        status: 'UNDERPOWERED',
        sampleTriplet: {nCh, nNeg: r.fp + r.tn, kRep, genres},
        gaps: [`run ${r.runIndex} evaluated negatives=${r.fp + r.tn} < ${thresholds.minNegatives}`],
        pass: false,
      };
    }
  }

  const fprSeries = summarizeSeries(summary.perRun.map(r => r.fpr));
  const precisionSeries = summarizeSeries(summary.perRun.map(r => r.precision));
  const maxClearFp = Math.max(...summary.perRun.map(r => r.clearTierFp));

  const fprClusters = aggregateRunsByChapter(runs, c => ({
    numerator: c.fp || 0,
    denominator: (c.fp || 0) + (c.tn || 0),
  }));
  const fprBootstrap = chapterClusterBootstrapCI(fprClusters, {iterations, seed});

  const precisionClusters = aggregateRunsByChapter(runs, c => ({
    numerator: c.tp || 0,
    denominator: (c.tp || 0) + (c.fp || 0),
  }));
  const precisionBootstrap = chapterClusterBootstrapCI(precisionClusters, {iterations, seed: seed + 1});

  const failures = [];
  if (maxClearFp > thresholds.maxClearTierFpPerRun) {
    failures.push(`Clear-tier FP max=${maxClearFp} > ${thresholds.maxClearTierFpPerRun}`);
  }
  if (fprSeries.mean === null || fprSeries.mean > thresholds.maxMeanFpr) {
    failures.push(`FPR 3-run mean=${fprSeries.mean} > ${thresholds.maxMeanFpr}`);
  }
  if (fprSeries.max === null || fprSeries.max > thresholds.maxSingleRunFpr) {
    failures.push(`FPR single-run max=${fprSeries.max} > ${thresholds.maxSingleRunFpr}`);
  }
  if (precisionSeries.mean === null || precisionSeries.mean < thresholds.minPrecision) {
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
    sampleTriplet: {nCh, nNeg, kRep, genres},
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
 * Evaluate G2-A (Historical Regression/Calibration FPR control).
 * STRICTLY SEPARATE from G2-B — passing G2-A NEVER implies passing G2-B!
 */
export function evaluateG2A(g2aData, opts = {}) {
  return evaluateG2Core('G2-A', 'regression_calibration', g2aData, FROZEN_THRESHOLDS.G2A, opts);
}

/**
 * Evaluate G2-B (Independent Holdout Non-Blocking Generalization).
 * Runs hard zero-overlap & retired-blacklist assertions across BOTH declared chapters and all run chapters.
 */
export function evaluateG2B(g2bData, {referenceChapters = [], seed = DEFAULT_BOOTSTRAP_SEED, iterations = BOOTSTRAP_ITERATIONS} = {}) {
  const allG2bChapters = [
    ...(g2bData?.chapters || []),
    ...(g2bData?.runs || []).flatMap(r => r?.chapters || []),
  ];
  const leakage = assertZeroLeakage(referenceChapters, allG2bChapters, {holdoutName: 'G2-B'});
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
  return evaluateG2Core('G2-B', 'independent_holdout', g2bData, FROZEN_THRESHOLDS.G2B, {
    seed,
    iterations,
    requireGenres: true,
    maxCasesPerChapter: FROZEN_THRESHOLDS.G2B.maxCasesPerChapter,
  });
}

/**
 * Evaluate G3 (Clean Paragraphs Zero False-Blocking).
 */
export function evaluateG3(g3Data, {seed = DEFAULT_BOOTSTRAP_SEED, iterations = BOOTSTRAP_ITERATIONS} = {}) {
  const th = FROZEN_THRESHOLDS.G3;
  const chapters = g3Data?.chapters || [];
  const runs = g3Data?.runs || [];

  const uCheck = assertUniqueChapters(chapters, 'G3');
  if (!uCheck.ok) return {gate: 'G3', status: 'INVALID_DESIGN', exitCode: 2, error: uCheck.code, message: uCheck.message, pass: false};
  const rCheck = assertRunsOnlyUseDeclaredChapters(runs, uCheck.idSet, 'G3');
  if (!rCheck.ok) return {gate: 'G3', status: 'INVALID_DESIGN', exitCode: 2, error: rCheck.code, message: rCheck.message, pass: false};

  const nCh = chapters.length;
  const nCases = chapters.reduce((acc, c) => acc + (c.paragraphs || 0), 0);
  const kRep = runs.length;

  const capViolations = chapters.filter(c => (c.paragraphs || 0) > th.maxCasesPerChapter);
  if (capViolations.length > 0) {
    return {
      gate: 'G3',
      status: 'INVALID_DESIGN',
      exitCode: 2,
      error: 'R3_P0_6_G3_CHAPTER_PARAGRAPH_CAP_EXCEEDED',
      pass: false,
      offendingChapters: capViolations.map(c => ({chapterId: c.chapterId, paragraphs: c.paragraphs})),
    };
  }

  const gaps = [];
  if (nCh < th.minChapters) gaps.push(`N_ch=${nCh} < ${th.minChapters} (need +${th.minChapters - nCh})`);
  if (nCases < th.minCases) gaps.push(`N_case=${nCases} < ${th.minCases} (need +${th.minCases - nCases})`);
  if (kRep < th.minRepeats) gaps.push(`K_rep=${kRep} < ${th.minRepeats}`);

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

  for (let idx = 0; idx < runs.length; idx++) {
    let rBlkFp = 0;
    let rNonBlkTn = 0;
    let rNoIssue = 0;
    let rTotal = 0;
    for (const ch of runs[idx].chapters || []) {
      const fp = ch.blockingFp || 0;
      const tn = ch.nonBlockingTn || 0;
      const ni = ch.noIssue || 0;
      const tot = fp + tn;
      rBlkFp += fp;
      rNonBlkTn += tn;
      rNoIssue += ni;
      rTotal += tot;
    }
    if (rTotal < th.minCases) {
      return {
        gate: 'G3',
        status: 'UNDERPOWERED',
        sampleTriplet: {nCh, nCases: rTotal, kRep},
        gaps: [`run ${idx + 1} evaluated paragraphs=${rTotal} < ${th.minCases}`],
        pass: false,
      };
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

  const noIssueClusters = aggregateRunsByChapter(runs, c => ({
    numerator: c.noIssue || 0,
    denominator: (c.blockingFp || 0) + (c.nonBlockingTn || 0),
  }));
  const noIssueBootstrap = chapterClusterBootstrapCI(noIssueClusters, {iterations, seed});

  const nonBlockingClusters = aggregateRunsByChapter(runs, c => ({
    numerator: c.nonBlockingTn || 0,
    denominator: (c.blockingFp || 0) + (c.nonBlockingTn || 0),
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
    sampleTriplet: {nCh, nCases, kRep},
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
 * Evaluate G4 (Ordered 4-Class Severity Stability via Quadratic Weighted Kappa >= 0.85 & Zero SUGGESTION Leak).
 */
export function evaluateG4(g4Data) {
  const th = FROZEN_THRESHOLDS.G4;
  const sourceChapters = [...new Set((g4Data?.sourceChapters || []).filter(isNonEmptyString).map(normalizeId))];
  const nCases = g4Data?.nCases ?? (g4Data?.runs?.[0]?.pairs?.length ?? 0);
  const runs = g4Data?.runs || [];
  const kRep = runs.length;

  const gaps = [];
  if (sourceChapters.length < th.minSourceChapters) {
    gaps.push(`independentSourceChapters=${sourceChapters.length} < ${th.minSourceChapters} (need +${th.minSourceChapters - sourceChapters.length})`);
  }
  if (nCases < th.minCases) gaps.push(`N_case=${nCases} < ${th.minCases}`);
  if (kRep < th.minRepeats) gaps.push(`K_rep=${kRep} < ${th.minRepeats}`);

  if (gaps.length > 0) {
    return {
      gate: 'G4',
      status: 'UNDERPOWERED',
      sampleTriplet: {nSourceChapters: sourceChapters.length, nCases, kRep},
      gaps,
      pass: false,
    };
  }

  const perRun = [];
  const allPairs = [];
  let suggestionLoopLeaks = 0;

  for (let idx = 0; idx < runs.length; idx++) {
    const run = runs[idx];
    const pairs = run.pairs || [];
    if (pairs.length < th.minCases) {
      return {
        gate: 'G4',
        status: 'UNDERPOWERED',
        sampleTriplet: {nSourceChapters: sourceChapters.length, nCases: pairs.length, kRep},
        gaps: [`run ${idx + 1} pairs=${pairs.length} < ${th.minCases}`],
        pass: false,
      };
    }
    const kappa = computeOrderedKappa(pairs);
    const leaks = run.suggestionLoopLeaks || 0;
    suggestionLoopLeaks += leaks;
    allPairs.push(...pairs);
    perRun.push({
      runIndex: idx + 1,
      n: kappa.n,
      quadraticWeightedKappa: kappa.quadraticWeightedKappa,
      unweightedKappa: kappa.unweightedKappa,
      agreementRate: kappa.agreementRate,
      suggestionLoopLeaks: leaks,
    });
  }

  const pooled = computeOrderedKappa(allPairs);
  const minRunKappaW = Math.min(...perRun.map(r => r.quadraticWeightedKappa ?? -Infinity));

  const failures = [];
  if (pooled.quadraticWeightedKappa === null || pooled.quadraticWeightedKappa < th.minQuadraticKappa) {
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
    sampleTriplet: {nSourceChapters: sourceChapters.length, nCases, kRep},
    perRun,
    pooled: {
      n: pooled.n,
      labels: pooled.labels,
      confusionMatrix: pooled.confusionMatrix,
      labeledConfusionMatrix: pooled.labeledConfusionMatrix,
      agreementRate: pooled.agreementRate,
      quadraticWeightedKappa: pooled.quadraticWeightedKappa,
      unweightedKappa: pooled.unweightedKappa,
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
      gaps,
      pass: false,
    };
  }

  const deadlockBlocked = deadlockCases.filter(c => c.decision === 'PLANNING_CONFLICT_BLOCK').length;
  const deadlockWhitewashedToPass = deadlockCases.filter(c => c.decision === 'pass_candidate').length;
  const deadlockBlockRate = deadlockBlocked / deadlockCases.length;

  const legalBlocked = legalTropeCases.filter(c => c.blocking === true).length;
  const legalBlockRate = legalBlocked / legalTropeCases.length;

  const s1CompatPassed = g5Data?.s1CompatPassed === true;
  const engFixP1Passed = g5Data?.engFixP1Passed === true;

  const failures = [];
  if (deadlockBlockRate < th.minDeadlockBlockRate || deadlockWhitewashedToPass > 0) {
    failures.push(`deadlockBlockRate=${round6(deadlockBlockRate)} < 1.0 (whitewashedToPass=${deadlockWhitewashedToPass})`);
  }
  if (legalBlockRate > th.maxLegalTropeBlockRate) {
    failures.push(`legalTropeBlockRate=${round6(legalBlockRate)} > 0`);
  }
  if (!s1CompatPassed) failures.push('S1 bidirectional compatibility check failed');
  if (!engFixP1Passed) failures.push('ENG-FIX-P1 compatibility check failed');

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
    failures,
  };
}

/**
 * Evaluate G6 (Cross-Genre Holdout Limited-Budget Engineering Admission Screen, K=1).
 * Explicitly framed as limited-budget engineering screening — NEVER as statistical proof of 90% production recall.
 */
export function evaluateG6(g6Data, {referenceChapters = [], seed = DEFAULT_BOOTSTRAP_SEED, iterations = BOOTSTRAP_ITERATIONS} = {}) {
  const th = FROZEN_THRESHOLDS.G6;
  const chapters = g6Data?.chapters || [];
  const runs = g6Data?.runs || [];
  const allG6Chapters = [...chapters, ...runs.flatMap(r => r?.chapters || [])];
  const leakage = assertZeroLeakage(referenceChapters, allG6Chapters, {holdoutName: 'G6'});
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

  const uCheck = assertUniqueChapters(chapters, 'G6');
  if (!uCheck.ok) {
    return {gate: 'G6', status: 'INVALID_DESIGN', exitCode: 2, error: uCheck.code, message: uCheck.message, pass: false};
  }
  const rCheck = assertRunsOnlyUseDeclaredChapters(runs, uCheck.idSet, 'G6');
  if (!rCheck.ok) {
    return {gate: 'G6', status: 'INVALID_DESIGN', exitCode: 2, error: rCheck.code, message: rCheck.message, pass: false};
  }

  const kRep = runs.length;
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

  const genreCounts = new Map();
  for (const ch of chapters) {
    if (isNonEmptyString(ch?.genre)) {
      genreCounts.set(ch.genre, (genreCounts.get(ch.genre) || 0) + 1);
    }
  }
  const genres = [...genreCounts.keys()];
  const genresWithMin2 = [...genreCounts.entries()].filter(([, cnt]) => cnt >= 2).map(([g]) => g);

  const nCh = chapters.length;
  const nPos = chapters.reduce((acc, c) => acc + (c.positives || 0), 0);
  const nNeg = chapters.reduce((acc, c) => acc + (c.negatives || 0), 0);

  const gaps = [];
  if (genres.length < th.minGenres) gaps.push(`genres=${genres.length} < ${th.minGenres}`);
  if (genresWithMin2.length < th.minGenres) {
    gaps.push(`genresWith>=2Chapters=${genresWithMin2.length} < ${th.minGenres}`);
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
      status: 'UNDERPOWERED',
      sampleTriplet: {nCh, nPos, nNeg, kRep, genres},
      gaps,
      pass: false,
    };
  }

  const run = runs[0];
  const runChapters = run.chapters || [];
  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  let clearTierFp = 0;
  let blockerMisses = 0;
  const heavyChapters = [];

  for (const ch of runChapters) {
    tp += ch.tp || 0;
    fp += ch.fp || 0;
    fn += ch.fn || 0;
    tn += ch.tn || 0;
    clearTierFp += ch.clearTierFp || 0;
    blockerMisses += ch.blockerMisses || 0;
    const totalCasesInCh = (ch.tp || 0) + (ch.fn || 0) + (ch.fp || 0) + (ch.tn || 0);
    if (totalCasesInCh > th.clusterWeightDisclosureCaseCap) {
      heavyChapters.push({chapterId: ch.chapterId, totalCases: totalCasesInCh});
    }
  }

  if (tp + fn < th.minPositives || fp + tn < th.minNegatives) {
    return {
      gate: 'G6',
      track: 'independent_cross_genre_holdout',
      framing: 'limited_budget_engineering_screen_not_production_recall_proof',
      status: 'UNDERPOWERED',
      sampleTriplet: {nCh, nPos: tp + fn, nNeg: fp + tn, kRep, genres},
      gaps: [
        ...(tp + fn < th.minPositives ? [`evaluated positives=${tp + fn} < ${th.minPositives}`] : []),
        ...(fp + tn < th.minNegatives ? [`evaluated negatives=${fp + tn} < ${th.minNegatives}`] : []),
      ],
      pass: false,
    };
  }

  const recallClusters = runChapters.map(c => ({
    chapterId: c.chapterId,
    numerator: c.tp || 0,
    denominator: (c.tp || 0) + (c.fn || 0),
  }));
  const recallBootstrap = chapterClusterBootstrapCI(recallClusters, {iterations, seed});

  const fprClusters = runChapters.map(c => ({
    chapterId: c.chapterId,
    numerator: c.fp || 0,
    denominator: (c.fp || 0) + (c.tn || 0),
  }));
  const fprBootstrap = chapterClusterBootstrapCI(fprClusters, {iterations, seed: seed + 1});

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
    status: failures.length === 0 ? 'PASS' : 'FAIL',
    pass: failures.length === 0,
    sampleTriplet: {nCh, nPos, nNeg, kRep, genres},
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
  {referenceChapters = [], seed = DEFAULT_BOOTSTRAP_SEED, iterations = BOOTSTRAP_ITERATIONS} = {}
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
  const G6 = evaluateG6(schemeData?.G6, {referenceChapters: refAll, seed: seed + 40, iterations});

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

/**
 * Side-by-side Go / No-Go adjudication across Schemes A, B, and C (frozen `08` §1.1 & §3).
 */
export function adjudicateSchemes(
  schemesPayload,
  {referenceChapters = [], seed = DEFAULT_BOOTSTRAP_SEED, iterations = BOOTSTRAP_ITERATIONS} = {}
) {
  const schemeNames = Object.keys(schemesPayload || {});
  const evaluated = {};
  for (const name of schemeNames) {
    evaluated[name] = evaluateSchemeG1ToG6(name, schemesPayload[name], {
      referenceChapters,
      seed,
      iterations,
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

  // Check if any scheme hit UNDERPOWERED on mandatory gates (especially G2-B / G6 / G3 / G4 / G5)
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

  // Frozen tie-break priority (`08` §1.1 rule 3):
  //   1. Highest G6 recall (BLOCKER misses = 0 already enforced)
  //   2. Lowest G2-B 3-round mean FPR, then lowest G2-B 3-round FPR variance
  //   3. Lowest end-to-end review latency
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
    allowProductionMerge: false, // Still requires GPT-6 ACCEPTED + author approval + Phase 2 if applicable!
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
