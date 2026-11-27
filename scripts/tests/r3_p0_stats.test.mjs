#!/usr/bin/env node
/**
 * P0-6 Comprehensive Statistical, Anti-Leakage & Go/No-Go Engine Test Suite (`TC-P0-6-1A`~`1G`, `TC-P0-6-R2-1`~`R2-4`):
 *   - TC-P0-6-1A: Exact mathematical verification (4x4 confusion matrix, quadratic weighted Kappa, unweighted Kappa, locked B=2000 cluster Bootstrap 95% CI)
 *   - TC-P0-6-1B: Cross-set anti-leakage, retired blacklist (`NH-1..5`, `V22-H1..4`, `OLD-HOLD-1..4`, `DOC-1..6`, `Arm 0..2 Ch 1..3`), merged-G2 ban, duplicate chapterId ban, per-chapter caps
 *   - TC-P0-6-1C: Mandatory `UNDERPOWERED` & `BLOCKED_UNDERPOWERED` enforcement (proving G2-A PASS != G2-B PASS and exact current sample gaps)
 *   - TC-P0-6-1D: Complete G1, G2-A, G2-B, G3, G4, G5, G6 threshold pass/fail boundary checks + G6 budget status
 *   - TC-P0-6-1E: Scheme B hard elimination (>1.0 pp recall lag or BLOCKER miss), float-safe 1.0 pp edge, tie-break priority, all-fail stop rule, and CLI end-to-end
 *   - TC-P0-6-1F: Frozen architecture (`docs/r3/review-v3/`) & production (`SKILL.md`, non-prototype `references/`) zero-diff isolation check
 *   - TC-P0-6-1G: Archived `p0-6-readiness-verdict.json` byte-for-byte reproducibility against `p0-6-readiness-input.json`
 *   - TC-P0-6-R2-1: Blocking 1 — manifest-to-run full chapter coverage, non-negative integer counts, inclusion checks, and "declare 12 chapters, run 1 chapter" rejection
 *   - TC-P0-6-R2-2: Blocking 2 — complete `{A, B, C}` requirement & canonical frozen dataset equivalence across all 3 schemes
 *   - TC-P0-6-R2-3: Blocking 3 — independent Holdout internal provenance (`sourceChapterId` + 64-hex `contentSha256`) and internal uniqueness (renamed source/hash rejection)
 *   - TC-P0-6-R2-4: Blocking 4 — G4 undefined degenerate Kappa (never 1.0), 4-class truth coverage, and per-case `caseId`/`sourceChapterId` traceability
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {
  BOOTSTRAP_ITERATIONS,
  ORDERED_SEVERITIES,
  assertZeroLeakage,
  assertHoldoutInternalProvenanceAndUniqueness,
  chapterClusterBootstrapCI,
  computeOrderedKappa,
  evaluateG1,
  evaluateG2A,
  evaluateG2B,
  evaluateG3,
  evaluateG4,
  evaluateG5,
  evaluateG6,
  evaluateSchemeG1ToG6,
  adjudicateSchemes,
} from '../p0_prototypes/eval_g1_g6_stats.mjs';

const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const EVAL_CLI = fileURLToPath(new URL('../p0_prototypes/eval_g1_g6_stats.mjs', import.meta.url));

/**
 * Helper: build a fully powered, clean synthetic passing dataset across all 7 gates for a single scheme.
 * Uses clean fresh IDs with verifiable `sourceChapterId` & 64-hex `contentSha256`, per-case G4 traceability,
 * and ZERO overlap with historical calibration sets or retired blacklist.
 */
function makePassingSchemeData({
  g1Track2RecallPerCh = null,
  g1BlockerMisses = 0,
  g2bRunFprCounts = [2, 2, 2], // out of 60 negatives per run -> FPR = 2/60 = 3.33%
  g6RecallRatio = 35 / 36, // 35/36 = 97.22%
  g6BlockerMisses = 0,
  avgReviewLatencyMs = 45000,
} = {}) {
  // G1: 9 Track 2 chapters (40 positives: 4+4+4+4+4+5+5+5+5 = 40) x K=3 + 7 regression chapters x K=1
  const t2PosCounts = [4, 4, 4, 4, 4, 5, 5, 5, 5];
  const g1Track2Chapters = t2PosCounts.map((pos, i) => ({
    chapterId: `HIST-CAL-CH${String(i + 1).padStart(2, '0')}`,
    positives: pos,
  }));
  const g1Track2Runs = [0, 1, 2].map(rIdx => ({
    chapters: g1Track2Chapters.map((ch, i) => {
      const custom = g1Track2RecallPerCh ? g1Track2RecallPerCh(rIdx, i, ch.positives) : null;
      const fn = custom !== null ? custom : (i === 0 ? 1 : 0); // default 39/40 = 97.5% >= 95%
      return {
        chapterId: ch.chapterId,
        tp: ch.positives - fn,
        fn,
        fp: 0,
        tn: 0,
        blockerMisses: rIdx === 0 && i === 0 ? g1BlockerMisses : 0,
      };
    }),
  }));
  const reg7Chapters = Array.from({length: 7}, (_, i) => ({
    chapterId: `HIST-REG7-CH${String(i + 1).padStart(2, '0')}`,
    positives: 2,
  }));
  const reg7Runs = [{
    chapters: reg7Chapters.map(ch => ({chapterId: ch.chapterId, tp: 2, fn: 0, fp: 0, tn: 0, blockerMisses: 0})),
  }];

  // G2-A: 9 historical chapters, 33 negatives (3+3+3+4+4+4+4+4+4 = 33), K=3
  const g2aNegCounts = [3, 3, 3, 4, 4, 4, 4, 4, 4];
  const g2aChapters = g2aNegCounts.map((neg, i) => ({
    chapterId: `HIST-CAL-CH${String(i + 1).padStart(2, '0')}`,
    negatives: neg,
  }));
  const g2aRuns = [0, 1, 2].map(() => ({
    chapters: g2aChapters.map((ch, i) => {
      const fp = i < 2 ? 1 : 0; // 2/33 = 6.06% FPR <= 13%, TP = 4 per ch -> 36 TP, Precision = 36/38 = 94.7% >= 88%
      return {
        chapterId: ch.chapterId,
        tp: 4,
        fn: 0,
        fp,
        tn: ch.negatives - fp,
        clearTierFp: 0,
      };
    }),
  }));

  // G2-B: 20 fresh independent chapters x 3 negatives = 60 cases, 4 genres, verifiable unique sourceChapterId + contentSha256, K=3
  const genres4 = ['悬疑', '历史', '科幻', '都市'];
  const g2bChapters = Array.from({length: 20}, (_, i) => ({
    chapterId: `FRESH-G2B-CH${String(i + 1).padStart(2, '0')}`,
    sourceChapterId: `SRC-G2B-NOVEL${(i % 4) + 1}-CH${String(i + 1).padStart(2, '0')}`,
    genre: genres4[i % genres4.length],
    negatives: 3,
    contentSha256: `b${String(i + 1).padStart(63, '0')}`,
  }));
  const g2bRuns = g2bRunFprCounts.map(totalFpInRun => {
    let remainingFp = totalFpInRun;
    return {
      chapters: g2bChapters.map(ch => {
        const fp = remainingFp > 0 ? 1 : 0;
        remainingFp -= fp;
        return {
          chapterId: ch.chapterId,
          tp: 3,
          fn: 0,
          fp,
          tn: ch.negatives - fp,
          clearTierFp: 0,
        };
      }),
    };
  });

  // G3: 10 chapters, 15 clean paragraphs (5x2 + 5x1 = 15, <=2/ch), K=3
  const g3Chapters = Array.from({length: 10}, (_, i) => ({
    chapterId: `FRESH-G3-CH${String(i + 1).padStart(2, '0')}`,
    paragraphs: i < 5 ? 2 : 1,
  }));
  const g3Runs = [0, 1, 2].map(() => ({
    chapters: g3Chapters.map(ch => ({
      chapterId: ch.chapterId,
      blockingFp: 0,
      nonBlockingTn: ch.paragraphs,
      noIssue: ch.paragraphs, // 100% >= 90%
    })),
  }));

  // G4: 8 independent source chapters, 24 traceable cases (6 per class, 3 cases per source chapter), K=2
  const g4SourceChapters = Array.from({length: 8}, (_, i) => `FRESH-G4-SRC${i + 1}`);
  const g4Pairs = [];
  for (let i = 0; i < 24; i++) {
    const gt = ORDERED_SEVERITIES[i % 4];
    const pred = i === 23 ? 'MINOR' : gt; // 23/24 exact, 1 adjacent (SUGGESTION -> MINOR) => kappa_w > 0.98
    g4Pairs.push({
      caseId: `G4-CASE-${String(i + 1).padStart(2, '0')}`,
      sourceChapterId: g4SourceChapters[i % 8],
      truth: gt,
      predicted: pred,
    });
  }
  const g4Runs = [
    {pairs: g4Pairs, suggestionLoopLeaks: 0},
    {pairs: g4Pairs, suggestionLoopLeaks: 0},
  ];

  // G5: 3 independent deadlock chapters + 3 legal trope cases, K=1
  const g5Data = {
    deadlockCases: [
      {chapterId: 'DEADLOCK-CH01', decision: 'PLANNING_CONFLICT_BLOCK'},
      {chapterId: 'DEADLOCK-CH02', decision: 'PLANNING_CONFLICT_BLOCK'},
      {chapterId: 'DEADLOCK-CH03', decision: 'PLANNING_CONFLICT_BLOCK'},
    ],
    legalTropeCases: [
      {caseId: 'CAL-49', blocking: false},
      {caseId: 'CAL-62', blocking: false},
      {caseId: 'TROPE-03', blocking: false},
    ],
    s1CompatPassed: true,
    engFixP1Passed: true,
    compatEvidenceRef: {
      s1TestFile: 'scripts/tests/r3_s1_severity_compat.test.mjs',
      engFixP1TestFile: 'scripts/tests/r3_fingerprint_failclosed.test.mjs',
    },
  };

  // G6: 4 genres x 3 chapters = 12 independent unblinded chapters, verifiable unique sourceChapterId + contentSha256, K=1
  const g6Chapters = Array.from({length: 12}, (_, i) => ({
    chapterId: `FRESH-G6-CH${String(i + 1).padStart(2, '0')}`,
    sourceChapterId: `SRC-G6-NOVEL${(i % 4) + 1}-CH${String(i + 1).padStart(2, '0')}`,
    genre: genres4[i % 4],
    positives: 3,
    negatives: 4,
    contentSha256: `c${String(i + 1).padStart(63, '0')}`,
  }));
  const totalG6Pos = 36;
  const targetG6Tp = Math.round(totalG6Pos * g6RecallRatio);
  let remainingFn = totalG6Pos - targetG6Tp;
  const g6Runs = [{
    chapters: g6Chapters.map((ch, idx) => {
      const fn = remainingFn > 0 ? Math.min(remainingFn, 1) : 0;
      remainingFn -= fn;
      const fp = idx < 2 ? 1 : 0; // 2/48 = 4.17% <= 13%
      return {
        chapterId: ch.chapterId,
        tp: ch.positives - fn,
        fn,
        fp,
        tn: ch.negatives - fp,
        clearTierFp: 0,
        blockerMisses: idx === 0 ? g6BlockerMisses : 0,
      };
    }),
  }];

  return {
    avgReviewLatencyMs,
    G1: {
      track2: {chapters: g1Track2Chapters, runs: g1Track2Runs},
      regression7: {chapters: reg7Chapters, runs: reg7Runs},
    },
    G2A: {chapters: g2aChapters, runs: g2aRuns},
    G2B: {chapters: g2bChapters, runs: g2bRuns},
    G3: {chapters: g3Chapters, runs: g3Runs},
    G4: {sourceChapters: g4SourceChapters, nCases: 24, runs: g4Runs},
    G5: g5Data,
    G6: {chapters: g6Chapters, runs: g6Runs},
  };
}

// ============================================================================
// TC-P0-6-1A: Exact Hand-Calculated Mathematical Benchmarks (Kappa_w, Kappa, B=2000 Cluster Bootstrap)
// ============================================================================
test('TC-P0-6-1A: quadratic weighted Kappa, unweighted Kappa, 4x4 matrix, and B=2000 cluster Bootstrap match exact hand-calculated math', () => {
  // 1. Hand-calculated exact 4-class benchmark:
  //    (BLOCKER,BLOCKER), (MAJOR,MAJOR), (MINOR,SUGGESTION), (SUGGESTION,MINOR)
  //    Exact analytical result: kappa_w = 1 - (1/18)/(5/18) = 0.800000; unweighted kappa = 1/3 = 0.333333
  const exactPairs = [
    {truth: 'BLOCKER', predicted: 'BLOCKER'},
    {truth: 'MAJOR', predicted: 'MAJOR'},
    {truth: 'MINOR', predicted: 'SUGGESTION'},
    {truth: 'SUGGESTION', predicted: 'MINOR'},
  ];
  const kExact = computeOrderedKappa(exactPairs);
  assert.equal(kExact.n, 4);
  assert.equal(kExact.agreementRate, 0.5);
  assert.equal(kExact.quadraticWeightedKappa, 0.8);
  assert.equal(kExact.unweightedKappa, 0.333333);
  assert.equal(kExact.kappaStatus, 'DEFINED');
  assert.deepEqual(kExact.confusionMatrix, [
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 0, 1],
    [0, 0, 1, 0],
  ]);

  // 2. Opposite-end error (BLOCKER <-> SUGGESTION, w=9/9=1) must yield strictly lower kappa_w than adjacent error (w=1/9)
  const extremePairs = [
    {truth: 'BLOCKER', predicted: 'SUGGESTION'},
    {truth: 'MAJOR', predicted: 'MAJOR'},
    {truth: 'MINOR', predicted: 'MINOR'},
    {truth: 'SUGGESTION', predicted: 'BLOCKER'},
  ];
  const kExtreme = computeOrderedKappa(extremePairs);
  assert.equal(kExtreme.quadraticWeightedKappa, -0.8);
  assert.ok(kExtreme.quadraticWeightedKappa < kExact.quadraticWeightedKappa);

  // 3. Invalid severity label fails closed
  assert.throws(
    () => computeOrderedKappa([{truth: 'BLOCKER', predicted: 'UNKNOWN_LEVEL'}]),
    /R3_P0_6_INVALID_SEVERITY_LABEL/
  );

  // 4. Cluster Bootstrap: locked B=2000, deterministic reproducibility, exact point & macro mean
  assert.throws(
    () => chapterClusterBootstrapCI([{chapterId: 'C1', numerator: 1, denominator: 2}], {iterations: 500}),
    /R3_P0_6_BOOTSTRAP_ITERATIONS_LOCKED/
  );

  const clusters = [
    {chapterId: 'C1', numerator: 0, denominator: 10},
    {chapterId: 'C2', numerator: 10, denominator: 10},
  ];
  const b1 = chapterClusterBootstrapCI(clusters, {iterations: BOOTSTRAP_ITERATIONS, seed: 42});
  const b2 = chapterClusterBootstrapCI(clusters, {iterations: BOOTSTRAP_ITERATIONS, seed: 42});
  assert.deepEqual(b1, b2, 'Seeded cluster Bootstrap must be bit-for-bit reproducible');
  assert.equal(b1.iterations, 2000);
  assert.equal(b1.nClusters, 2);
  assert.equal(b1.point, 0.5);
  assert.equal(b1.macroMean, 0.5);
  assert.deepEqual(b1.ci95, [0, 1]);
  assert.equal(b1.doesNotCompensateForSmallNCh, true);

  // Weighted vs macro mean distinction: 1/2 (50%) + 9/10 (90%) => point = 10/12 = 0.833333, macro = 0.7
  const uneven = chapterClusterBootstrapCI([
    {chapterId: 'C1', numerator: 1, denominator: 2},
    {chapterId: 'C2', numerator: 9, denominator: 10},
  ], {seed: 7});
  assert.equal(uneven.point, 0.833333);
  assert.equal(uneven.macroMean, 0.7);
});

// ============================================================================
// TC-P0-6-1B: Cross-Set Anti-Leakage, Retired Blacklist, Merged-G2 Ban & Anti-Cheating Assertions
// ============================================================================
test('TC-P0-6-1B: hard rejects chapter/hash overlap, retired blacklist (NH-1..5 / V22-H1..4 / OLD-HOLD / DOC), merged G2, duplicates, and chapter caps', () => {
  const refChapters = [
    {chapterId: 'HIST-CAL-CH01', contentSha256: 'a'.repeat(64)},
  ];

  // 1. Direct chapterId overlap
  const ovId = assertZeroLeakage(refChapters, [{chapterId: 'hist-cal-ch01'}], {holdoutName: 'G2-B'});
  assert.equal(ovId.ok, false);
  assert.equal(ovId.exitCode, 2);
  assert.equal(ovId.error, 'R3_P0_6_DATA_LEAKAGE_DETECTED');

  // 2. Content SHA-256 overlap under renamed chapterId
  const ovHash = assertZeroLeakage(refChapters, [{chapterId: 'BRAND-NEW-ID', contentSha256: 'a'.repeat(64)}], {holdoutName: 'G2-B'});
  assert.equal(ovHash.ok, false);
  assert.ok(ovHash.violations.some(v => v.code === 'R3_P0_6_CONTENT_HASH_OVERLAP'));

  // 3. Retired blacklist hits (NH-1..5, V22-H1..4, OLD-HOLD-1..4, DOC-4, ARM1-CH2, retired Chinese titles)
  for (const bad of [
    {chapterId: 'NH-1'},
    {chapterId: 'NH5-ch01'},
    {chapterId: 'V22-H4'},
    {chapterId: 'OLD-HOLD-2'},
    {chapterId: 'DOC-4'},
    {chapterId: 'ARM1-CH2'},
    {chapterId: 'NEW-99', sourceNovel: '盐引旧账'},
    {chapterId: 'NEW-98', sourceNovel: '器痕录'},
  ]) {
    const res = assertZeroLeakage([], [bad], {holdoutName: 'G2-B'});
    assert.equal(res.ok, false, `Expected blacklist hit for ${JSON.stringify(bad)}`);
    assert.equal(res.exitCode, 2);
    assert.ok(res.violations.some(v => v.code === 'R3_P0_6_RETIRED_BLACKLIST_HIT'));
  }

  // 4. Smuggling NH-3 inside G2-B runs[0].chapters (not in declared chapters) -> still rejected!
  const smuggleData = makePassingSchemeData();
  smuggleData.G2B.runs[0].chapters[0].chapterId = 'NH-3';
  const smuggleRes = adjudicateSchemes({A: smuggleData, B: makePassingSchemeData(), C: makePassingSchemeData()});
  assert.equal(smuggleRes.ok, false);
  assert.equal(smuggleRes.exitCode, 2);
  assert.equal(smuggleRes.verdict, 'LEAKAGE_REJECTED');

  // 5. Merged `G2` key strictly forbidden!
  const mergedG2 = makePassingSchemeData();
  mergedG2.G2 = mergedG2.G2A;
  const mergedRes = evaluateSchemeG1ToG6('A', mergedG2);
  assert.equal(mergedRes.status, 'INVALID_DESIGN');
  assert.equal(mergedRes.exitCode, 2);
  assert.equal(mergedRes.error, 'R3_P0_6_MERGED_G2_FORBIDDEN');

  // 6. Duplicate chapterId in G2-B trying to inflate N_ch -> rejected!
  const dupData = makePassingSchemeData();
  dupData.G2B.chapters[1].chapterId = dupData.G2B.chapters[0].chapterId;
  const dupRes = evaluateG2B(dupData.G2B);
  assert.equal(dupRes.status, 'INVALID_DESIGN');
  assert.equal(dupRes.exitCode, 2);
  assert.equal(dupRes.error, 'R3_P0_6_DUPLICATE_CHAPTER_ID');

  // 7. G2-B chapter with >3 non-blocking cases -> rejected!
  const capG2b = makePassingSchemeData();
  capG2b.G2B.chapters[0].negatives = 4;
  capG2b.G2B.runs.forEach(r => { r.chapters[0].fp = 0; r.chapters[0].tn = 4; });
  assert.equal(evaluateG2B(capG2b.G2B).error, 'R3_P0_6_G2B_CHAPTER_CASE_CAP_EXCEEDED');

  // 8. G3 chapter with >2 paragraphs -> rejected!
  const capG3 = makePassingSchemeData();
  capG3.G3.chapters[0].paragraphs = 3;
  capG3.G3.runs.forEach(r => { r.chapters[0].nonBlockingTn = 3; r.chapters[0].noIssue = 3; });
  assert.equal(evaluateG3(capG3.G3).error, 'R3_P0_6_G3_CHAPTER_PARAGRAPH_CAP_EXCEEDED');

  // 9. G6 with K > 1 -> rejected (must be single-shot K=1 to prevent overfitting)!
  const multiG6 = makePassingSchemeData();
  multiG6.G6.runs.push(structuredClone(multiG6.G6.runs[0]));
  assert.equal(evaluateG6(multiG6.G6).error, 'R3_P0_6_G6_MUST_BE_SINGLE_SHOT_K1');
});

// ============================================================================
// TC-P0-6-1C: Mandatory UNDERPOWERED & BLOCKED_UNDERPOWERED Enforcement
// ============================================================================
test('TC-P0-6-1C: insufficient G2-B / G3 / G4 / G5 / G6 samples force UNDERPOWERED and BLOCKED_UNDERPOWERED even when G1 & G2-A pass 100%', () => {
  // 1. G2-B with 0 chapters / 0 cases (exact current real repo status!) -> BLOCKED_UNDERPOWERED
  const currentGapData = makePassingSchemeData();
  currentGapData.G2B = {chapters: [], runs: []};
  currentGapData.G6 = {chapters: [], runs: []};
  const resBlocked = adjudicateSchemes({
    A: currentGapData,
    B: structuredClone(currentGapData),
    C: structuredClone(currentGapData),
  });
  assert.equal(resBlocked.ok, true);
  assert.equal(resBlocked.verdict, 'BLOCKED_UNDERPOWERED');
  assert.equal(resBlocked.winner, null);
  assert.equal(resBlocked.allowProductionMerge, false);
  assert.equal(resBlocked.schemes.A.gates.G1.status, 'PASS');
  assert.equal(resBlocked.schemes.A.gates.G2A.status, 'PASS');
  assert.equal(resBlocked.schemes.A.gates.G2B.status, 'UNDERPOWERED');
  assert.equal(resBlocked.schemes.A.gates.G6.status, 'UNDERPOWERED');

  // 2. G2-B with 19 chapters (< 20) or 2 genres (< 3) -> UNDERPOWERED
  const g2b19 = makePassingSchemeData().G2B;
  g2b19.chapters.pop();
  g2b19.runs.forEach(r => r.chapters.pop());
  assert.equal(evaluateG2B(g2b19).status, 'UNDERPOWERED');

  const g2b2Genres = makePassingSchemeData().G2B;
  g2b2Genres.chapters.forEach((c, i) => { c.genre = i % 2 === 0 ? '悬疑' : '历史'; });
  assert.equal(evaluateG2B(g2b2Genres).status, 'UNDERPOWERED');

  // 3. G3 with 9 chapters / 9 paragraphs (exact historical S4 status!) -> UNDERPOWERED
  const g3Hist = {
    chapters: Array.from({length: 9}, (_, i) => ({chapterId: `S4-CH${i + 1}`, paragraphs: 1})),
    runs: [],
  };
  const g3Res = evaluateG3(g3Hist);
  assert.equal(g3Res.status, 'UNDERPOWERED');
  assert.ok(g3Res.gaps.some(g => g.includes('N_ch=9 < 10')));
  assert.ok(g3Res.gaps.some(g => g.includes('N_case=9 < 15')));

  // 4. G4 with 3 independent source chapters (exact historical four-class-24 status!) -> UNDERPOWERED
  const g4Hist = makePassingSchemeData().G4;
  g4Hist.sourceChapters = ['QHL-CH1', 'QHL-CH2', 'QHL-CH3'];
  g4Hist.runs.forEach(r => {
    r.pairs.forEach((p, idx) => { p.sourceChapterId = g4Hist.sourceChapters[idx % 3]; });
  });
  const g4Res = evaluateG4(g4Hist);
  assert.equal(g4Res.status, 'UNDERPOWERED');
  assert.ok(g4Res.gaps.some(g => g.includes('independentSourceChapters=3 < 8')));

  // 5. G5 with 1 deadlock chapter (exact historical V22-H4 status!) -> UNDERPOWERED
  const g5Hist = makePassingSchemeData().G5;
  g5Hist.deadlockCases = [{chapterId: 'V22-H4', decision: 'PLANNING_CONFLICT_BLOCK'}];
  const g5Res = evaluateG5(g5Hist);
  assert.equal(g5Res.status, 'UNDERPOWERED');
  assert.ok(g5Res.gaps.some(g => g.includes('deadlockChapters=1 < 3')));
});

// ============================================================================
// TC-P0-6-1D: All 7 Gates (G1, G2-A, G2-B, G3, G4, G5, G6) Pass & Boundary Fail Checks
// ============================================================================
test('TC-P0-6-1D: all 7 gates enforce exact frozen thresholds on pass, surgical boundary failures, and G6 budget audit', () => {
  const clean = makePassingSchemeData();
  const evalClean = evaluateSchemeG1ToG6('C', clean);
  assert.equal(evalClean.status, 'PASS');
  assert.equal(evalClean.allGatesPassed, true);
  assert.equal(evalClean.gates.G6.budgetStatus, 'WITHIN_FROZEN_BUDGET');

  // G1 fail: 1 known BLOCKER miss
  const badG1 = makePassingSchemeData({g1BlockerMisses: 1});
  assert.equal(evaluateG1(badG1.G1).status, 'FAIL');

  // G2-B fail: Clear-tier FP = 1 (with fp >= 1 so clearTierFp <= fp stays valid)
  const badG2bClear = makePassingSchemeData();
  badG2bClear.G2B.runs[1].chapters[0].clearTierFp = 1;
  assert.equal(evaluateG2B(badG2bClear.G2B).status, 'FAIL');

  // G2-B fail: single-run FPR > 15% (10/60 = 16.67%) even when 3-run mean <= 13%
  const badG2bSingle = makePassingSchemeData({g2bRunFprCounts: [0, 10, 0]});
  assert.equal(evaluateG2B(badG2bSingle.G2B).status, 'FAIL');

  // G2-B fail: 3-run mean FPR > 13% (8/60 = 13.33% each run <= 15% single-run, but mean > 13%)
  const badG2bMean = makePassingSchemeData({g2bRunFprCounts: [8, 8, 8]});
  assert.equal(evaluateG2B(badG2bMean.G2B).status, 'FAIL');

  // G3 fail: 1 blocking FP (matching declared paragraphs count)
  const badG3 = makePassingSchemeData();
  badG3.G3.runs[0].chapters[0].blockingFp = 1;
  badG3.G3.runs[0].chapters[0].nonBlockingTn -= 1;
  badG3.G3.runs[0].chapters[0].noIssue -= 1;
  assert.equal(evaluateG3(badG3.G3).status, 'FAIL');

  // G4 fail: 1 SUGGESTION loop leak even with kappa_w >= 0.85
  const badG4 = makePassingSchemeData();
  badG4.G4.runs[0].suggestionLoopLeaks = 1;
  assert.equal(evaluateG4(badG4.G4).status, 'FAIL');

  // G5 fail: deadlock whitewashed to pass_candidate
  const badG5 = makePassingSchemeData();
  badG5.G5.deadlockCases[0].decision = 'pass_candidate';
  assert.equal(evaluateG5(badG5.G5).status, 'FAIL');

  // G6 fail: 1 objective BLOCKER miss
  const badG6 = makePassingSchemeData({g6BlockerMisses: 1});
  assert.equal(evaluateG6(badG6.G6).status, 'FAIL');

  // G6 budget ceiling audit (>16 chapters flags EXCEEDS_FROZEN_BUDGET_REQUIRES_AUTHOR_APPROVAL)
  const overBudgetG6 = makePassingSchemeData().G6;
  const genres4 = ['悬疑', '历史', '科幻', '都市'];
  for (let i = 12; i < 17; i++) {
    const ch = {
      chapterId: `FRESH-G6-CH${String(i + 1).padStart(2, '0')}`,
      sourceChapterId: `SRC-G6-NOVEL${(i % 4) + 1}-CH${String(i + 1).padStart(2, '0')}`,
      genre: genres4[i % 4],
      positives: 3,
      negatives: 4,
      contentSha256: `c${String(i + 1).padStart(63, '0')}`,
    };
    overBudgetG6.chapters.push(ch);
    overBudgetG6.runs[0].chapters.push({
      chapterId: ch.chapterId,
      tp: 3,
      fn: 0,
      fp: 0,
      tn: 4,
      clearTierFp: 0,
      blockerMisses: 0,
    });
  }
  assert.equal(evaluateG6(overBudgetG6).budgetStatus, 'EXCEEDS_FROZEN_BUDGET_REQUIRES_AUTHOR_APPROVAL');
});

// ============================================================================
// TC-P0-6-1E: Scheme B Hard Elimination, Tie-Break Priority, All-Fail Stop Rule, and CLI
// ============================================================================
test('TC-P0-6-1E: enforces Scheme B hard elimination (>1.0 pp recall lag or BLOCKER miss), float-safe 1.0 pp edge, tie-break priority, and CLI exit codes', t => {
  // 1. Scheme B eliminated when G6 recall trails Scheme C by > 1.0 pp (33/36 = 91.67% vs 35/36 = 97.22%)
  const schemeA = makePassingSchemeData({g6RecallRatio: 35 / 36, g2bRunFprCounts: [4, 4, 4], avgReviewLatencyMs: 40000});
  const schemeB = makePassingSchemeData({g6RecallRatio: 33 / 36, g2bRunFprCounts: [1, 1, 1], avgReviewLatencyMs: 30000});
  const schemeC = makePassingSchemeData({g6RecallRatio: 35 / 36, g2bRunFprCounts: [2, 2, 2], avgReviewLatencyMs: 42000});

  const adj1 = adjudicateSchemes({A: schemeA, B: schemeB, C: schemeC});
  assert.equal(adj1.verdict, 'GO_CANDIDATE_SELECTED');
  assert.equal(adj1.eliminations.B?.eliminated, true, 'Scheme B MUST be eliminated when G6 recall lags C by > 1.0 pp');
  assert.equal(adj1.winner, 'C', 'Between A and C tied on G6 recall, C wins via lower G2-B FPR (3.33% vs 6.67%)');
  assert.equal(adj1.allowProductionMerge, false, 'Automated adjudication must NEVER auto-authorize production merge');

  // 2. Float-safe 1.0 pp boundary: G1 recall 0.96 vs 0.95 (exact 0.01 lag) -> NOT falsely eliminated!
  const exactEdgeA = makePassingSchemeData({g6RecallRatio: 35 / 36, g2bRunFprCounts: [3, 3, 3], avgReviewLatencyMs: 50000});
  const exactEdgeB = makePassingSchemeData({g6RecallRatio: 35 / 36, g2bRunFprCounts: [2, 2, 2], avgReviewLatencyMs: 35000});
  const exactEdgeC = makePassingSchemeData({g6RecallRatio: 35 / 36, g2bRunFprCounts: [4, 4, 4], avgReviewLatencyMs: 45000});
  const make100PosG1 = (fnCount) => {
    const chs = Array.from({length: 10}, (_, i) => ({chapterId: `EDGE-CH${i + 1}`, positives: 10}));
    const runs = [0, 1, 2].map(() => {
      let rem = fnCount;
      return {
        chapters: chs.map(c => {
          const fn = rem > 0 ? 1 : 0;
          rem -= fn;
          return {chapterId: c.chapterId, tp: 10 - fn, fn, fp: 0, tn: 0, blockerMisses: 0};
        }),
      };
    });
    return {track2: {chapters: chs, runs}, regression7: exactEdgeA.G1.regression7};
  };
  exactEdgeA.G1 = make100PosG1(4); // 96/100 = 0.96
  exactEdgeB.G1 = make100PosG1(5); // 95/100 = 0.95 (exact 1.0 pp lag, NOT > 1.0 pp)
  exactEdgeC.G1 = make100PosG1(4); // 96/100 = 0.96
  const adjEdge = adjudicateSchemes({A: exactEdgeA, B: exactEdgeB, C: exactEdgeC});
  assert.equal(adjEdge.eliminations.B, undefined, 'Exact 1.0 pp difference must NOT falsely trigger > 1.0 pp elimination due to float dust');
  assert.equal(adjEdge.winner, 'B');

  // 3. All schemes fail -> NO_GO_ALL_SCHEMES_FAILED
  const failAll = makePassingSchemeData({g6BlockerMisses: 1});
  const adjNoGo = adjudicateSchemes({A: failAll, B: structuredClone(failAll), C: structuredClone(failAll)});
  assert.equal(adjNoGo.verdict, 'NO_GO_ALL_SCHEMES_FAILED');
  assert.equal(adjNoGo.winner, null);
  assert.equal(adjNoGo.allowProductionMerge, false);

  // 4. CLI end-to-end: complete A/B/C clean run exits 0 & writes JSON; leakage run exits 2
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p06-cli-'));
  t.after(() => fs.rmSync(tmpDir, {recursive: true, force: true}));

  const okIn = path.join(tmpDir, 'ok.json');
  const okOut = path.join(tmpDir, 'ok-out.json');
  fs.writeFileSync(okIn, JSON.stringify({schemes: {A: schemeA, B: schemeB, C: schemeC}}, null, 2), 'utf8');
  const cliOk = spawnSync(process.execPath, [EVAL_CLI, 'evaluate', '--input', okIn, '--out', okOut], {encoding: 'utf8'});
  assert.equal(cliOk.status, 0, cliOk.stderr);
  assert.equal(JSON.parse(fs.readFileSync(okOut, 'utf8')).winner, 'C');

  const leakScheme = makePassingSchemeData();
  leakScheme.G2B.chapters[0].chapterId = 'V22-H4';
  const leakPayload = {schemes: {A: leakScheme, B: structuredClone(leakScheme), C: structuredClone(leakScheme)}};
  const leakIn = path.join(tmpDir, 'leak.json');
  fs.writeFileSync(leakIn, JSON.stringify(leakPayload, null, 2), 'utf8');
  const cliLeak = spawnSync(process.execPath, [EVAL_CLI, 'evaluate', '--input', leakIn], {encoding: 'utf8'});
  assert.equal(cliLeak.status, 2);
  assert.equal(JSON.parse(cliLeak.stdout).error, 'R3_P0_6_DATA_LEAKAGE_DETECTED');
});

// ============================================================================
// TC-P0-6-1F: Frozen Architecture & Production Isolation Verification
// ============================================================================
test('TC-P0-6-1F: frozen docs/r3/review-v3/, SKILL.md, and non-prototype references/ remain 0-byte diff vs b5572a94', () => {
  const diffRes = spawnSync(
    'git',
    ['diff', '--name-only', 'b5572a94', '--', 'SKILL.md', 'docs/r3/review-v3/', 'references/', ':(exclude)references/v3/prototypes'],
    {cwd: REPO_ROOT, encoding: 'utf8'}
  );
  assert.equal(diffRes.status, 0, diffRes.stderr);
  assert.equal(diffRes.stdout.trim(), '', `Frozen docs or production templates were modified:\n${diffRes.stdout}`);
});

// ============================================================================
// TC-P0-6-1G: Archived Readiness Verdict JSON Byte-for-Byte Reproducibility
// ============================================================================
test('TC-P0-6-1G: archived p0-6-readiness-verdict.json is byte-for-byte reproducible from p0-6-readiness-input.json and enforces BLOCKED_UNDERPOWERED', () => {
  const inputPath = path.join(REPO_ROOT, 'docs/r3/p0-implementation/evidence/p0-6/p0-6-readiness-input.json');
  const verdictPath = path.join(REPO_ROOT, 'docs/r3/p0-implementation/evidence/p0-6/p0-6-readiness-verdict.json');
  const archived = fs.readFileSync(verdictPath, 'utf8');

  const res = spawnSync(
    process.execPath,
    [EVAL_CLI, 'evaluate', '--input', inputPath, '--seed', '20261126'],
    {cwd: REPO_ROOT, encoding: 'utf8'}
  );
  assert.equal(res.status, 0, res.stderr);
  assert.equal(res.stdout, archived, 'Archived p0-6-readiness-verdict.json must match live deterministic CLI output byte-for-byte');

  const parsed = JSON.parse(res.stdout);
  assert.equal(parsed.verdict, 'BLOCKED_UNDERPOWERED');
  assert.equal(parsed.winner, null);
  assert.equal(parsed.allowProductionMerge, false);
  assert.equal(parsed.schemes.A.gates.G2B.status, 'UNDERPOWERED');
  assert.equal(parsed.schemes.A.gates.G6.status, 'UNDERPOWERED');
});

// ============================================================================
// TC-P0-6-R2-1: Blocking 1 — Manifest-to-Run Coverage & Per-Chapter Count Consistency
// ============================================================================
test('TC-P0-6-R2-1: rejects declare-12-chapters-but-run-1-chapter, partial run coverage, manifest count mismatch, and invalid/negative counts', () => {
  // 1. Classic Blocking 1 exploit: G6 declares 12 chapters (36 pos, 48 neg), but run only tests 1 chapter stuffing tp=30, tn=40!
  const g6Stuffed1Ch = makePassingSchemeData().G6;
  g6Stuffed1Ch.runs = [{
    chapters: [{chapterId: 'FRESH-G6-CH01', tp: 30, fn: 0, fp: 0, tn: 40, clearTierFp: 0, blockerMisses: 0}],
  }];
  const rStuffed = evaluateG6(g6Stuffed1Ch);
  assert.equal(rStuffed.status, 'INVALID_DESIGN');
  assert.equal(rStuffed.exitCode, 2);
  assert.equal(rStuffed.error, 'R3_P0_6_OBSERVATION_MANIFEST_MISMATCH');

  // 2. G6 declares 12 chapters, run tests only 1 chapter matching its own 3 pos / 4 neg (11 chapters silently omitted)
  const g6Partial = makePassingSchemeData().G6;
  g6Partial.runs = [{chapters: [g6Partial.runs[0].chapters[0]]}];
  const rPartial = evaluateG6(g6Partial);
  assert.equal(rPartial.status, 'INVALID_DESIGN');
  assert.equal(rPartial.exitCode, 2);
  assert.equal(rPartial.error, 'R3_P0_6_RUN_CHAPTER_COVERAGE_MISMATCH');

  // 3. G1 observation count mismatch (tp+fn != declared positives)
  const g1Mismatch = makePassingSchemeData().G1;
  g1Mismatch.track2.runs[0].chapters[0].tp += 5;
  assert.equal(evaluateG1(g1Mismatch).error, 'R3_P0_6_OBSERVATION_MANIFEST_MISMATCH');

  // 4. G2-B negative count or clearTierFp > fp violation
  const g2bNeg = makePassingSchemeData().G2B;
  g2bNeg.runs[0].chapters[0].fp = -1;
  g2bNeg.runs[0].chapters[0].tn = 4;
  assert.equal(evaluateG2B(g2bNeg).error, 'R3_P0_6_INVALID_OBSERVATION_COUNTS');

  const g2bClearOverflow = makePassingSchemeData().G2B;
  g2bClearOverflow.runs[0].chapters[5].fp = 0;
  g2bClearOverflow.runs[0].chapters[5].tn = 3;
  g2bClearOverflow.runs[0].chapters[5].clearTierFp = 1; // clearTierFp > fp!
  assert.equal(evaluateG2B(g2bClearOverflow).error, 'R3_P0_6_INVALID_OBSERVATION_COUNTS');

  // 5. G3 observation count mismatch (noIssue > nonBlockingTn or missing chapters)
  const g3Overflow = makePassingSchemeData().G3;
  g3Overflow.runs[0].chapters[0].noIssue = g3Overflow.runs[0].chapters[0].nonBlockingTn + 1;
  assert.equal(evaluateG3(g3Overflow).error, 'R3_P0_6_INVALID_OBSERVATION_COUNTS');
});

// ============================================================================
// TC-P0-6-R2-2: Blocking 2 — Complete {A, B, C} & Frozen Dataset Equivalence Gate
// ============================================================================
test('TC-P0-6-R2-2: adjudicateSchemes requires complete {A, B, C} and exact canonical dataset equivalence across all 3 schemes', () => {
  const baseA = makePassingSchemeData();
  const baseB = makePassingSchemeData();
  const baseC = makePassingSchemeData();

  // 1. Missing B & C ({A} only) -> rejected (never picks winner!)
  const onlyA = adjudicateSchemes({A: baseA});
  assert.equal(onlyA.ok, false);
  assert.equal(onlyA.exitCode, 2);
  assert.equal(onlyA.error, 'R3_P0_6_INCOMPLETE_ABC_SCHEMES');
  assert.equal(onlyA.winner, null);

  // 2. Missing B ({A, C}) -> rejected
  const missingB = adjudicateSchemes({A: baseA, C: baseC});
  assert.equal(missingB.ok, false);
  assert.equal(missingB.exitCode, 2);
  assert.equal(missingB.error, 'R3_P0_6_INCOMPLETE_ABC_SCHEMES');

  // 3. Different chapter IDs between Scheme C and A/B in G2-B -> rejected!
  const diffIdC = makePassingSchemeData();
  diffIdC.G2B.chapters[0].chapterId = 'DIFFERENT-G2B-CH99';
  diffIdC.G2B.runs.forEach(r => { r.chapters[0].chapterId = 'DIFFERENT-G2B-CH99'; });
  const rDiffId = adjudicateSchemes({A: baseA, B: baseB, C: diffIdC});
  assert.equal(rDiffId.ok, false);
  assert.equal(rDiffId.exitCode, 2);
  assert.equal(rDiffId.error, 'R3_P0_6_UNEQUAL_EVALUATION_DATASET');
  assert.ok(rDiffId.mismatchedGates.includes('G2B'));

  // 4. Same chapter IDs, but Scheme B has a DIFFERENT contentSha256 in G6 -> rejected!
  const diffHashB = makePassingSchemeData();
  diffHashB.G6.chapters[0].contentSha256 = 'f'.repeat(64);
  const rDiffHash = adjudicateSchemes({A: baseA, B: diffHashB, C: baseC});
  assert.equal(rDiffHash.ok, false);
  assert.equal(rDiffHash.exitCode, 2);
  assert.equal(rDiffHash.error, 'R3_P0_6_UNEQUAL_EVALUATION_DATASET');
  assert.ok(rDiffHash.mismatchedGates.includes('G6'));

  // 5. Same G4 caseIds, but Scheme C altered a ground-truth label -> rejected!
  const diffTruthC = makePassingSchemeData();
  diffTruthC.G4.runs.forEach(r => { r.pairs[0].truth = 'MAJOR'; });
  const rDiffTruth = adjudicateSchemes({A: baseA, B: baseB, C: diffTruthC});
  assert.equal(rDiffTruth.ok, false);
  assert.equal(rDiffTruth.exitCode, 2);
  assert.equal(rDiffTruth.error, 'R3_P0_6_UNEQUAL_EVALUATION_DATASET');
  assert.ok(rDiffTruth.mismatchedGates.includes('G4'));

  // 6. Single-scheme diagnostic API still works cleanly without declaring an A/B/C winner
  const diagA = evaluateSchemeG1ToG6('A', baseA);
  assert.equal(diagA.status, 'PASS');
  assert.equal(diagA.winner, undefined);
});

// ============================================================================
// TC-P0-6-R2-3: Blocking 3 — Independent Holdout Internal Provenance & Uniqueness
// ============================================================================
test('TC-P0-6-R2-3: rejects renamed duplicate sourceChapterId, renamed duplicate contentSha256, and unverified missing provenance inside G2-B & G6', () => {
  // 1. Renamed duplicate sourceChapterId inside G2-B
  const dupSrcG2b = makePassingSchemeData().G2B;
  dupSrcG2b.chapters[1].sourceChapterId = dupSrcG2b.chapters[0].sourceChapterId;
  const rDupSrcG2b = evaluateG2B(dupSrcG2b);
  assert.equal(rDupSrcG2b.status, 'INVALID_DESIGN');
  assert.equal(rDupSrcG2b.exitCode, 2);
  assert.equal(rDupSrcG2b.error, 'R3_P0_6_HOLDOUT_DUPLICATE_SOURCE_CHAPTER');

  // 2. Renamed duplicate contentSha256 inside G2-B
  const dupHashG2b = makePassingSchemeData().G2B;
  dupHashG2b.chapters[1].contentSha256 = dupHashG2b.chapters[0].contentSha256;
  const rDupHashG2b = evaluateG2B(dupHashG2b);
  assert.equal(rDupHashG2b.status, 'INVALID_DESIGN');
  assert.equal(rDupHashG2b.exitCode, 2);
  assert.equal(rDupHashG2b.error, 'R3_P0_6_HOLDOUT_DUPLICATE_CONTENT_HASH');

  // 3. Missing sourceChapterId or invalid contentSha256 inside G6 -> Fail-Closed unverified provenance
  const noProvG6 = makePassingSchemeData().G6;
  delete noProvG6.chapters[0].sourceChapterId;
  const rNoProvG6 = evaluateG6(noProvG6);
  assert.equal(rNoProvG6.status, 'INVALID_DESIGN');
  assert.equal(rNoProvG6.exitCode, 2);
  assert.equal(rNoProvG6.error, 'R3_P0_6_HOLDOUT_PROVENANCE_UNVERIFIED');

  const badHashG6 = makePassingSchemeData().G6;
  badHashG6.chapters[0].contentSha256 = 'not-a-sha256';
  assert.equal(evaluateG6(badHashG6).error, 'R3_P0_6_HOLDOUT_PROVENANCE_UNVERIFIED');

  // 4. Renamed duplicate sourceChapterId & contentSha256 inside G6
  const dupSrcG6 = makePassingSchemeData().G6;
  dupSrcG6.chapters[2].sourceChapterId = dupSrcG6.chapters[0].sourceChapterId;
  assert.equal(evaluateG6(dupSrcG6).error, 'R3_P0_6_HOLDOUT_DUPLICATE_SOURCE_CHAPTER');

  const dupHashG6 = makePassingSchemeData().G6;
  dupHashG6.chapters[2].contentSha256 = dupHashG6.chapters[0].contentSha256;
  assert.equal(evaluateG6(dupHashG6).error, 'R3_P0_6_HOLDOUT_DUPLICATE_CONTENT_HASH');

  // 5. Direct helper check on clean empty readiness list -> ok (does not break 0-sample readiness audit)
  assert.equal(assertHoldoutInternalProvenanceAndUniqueness([], {holdoutName: 'G2-B'}).ok, true);
});

// ============================================================================
// TC-P0-6-R2-4: Blocking 4 — G4 Undefined Degenerate Kappa & Per-Case Source-Chapter Traceability
// ============================================================================
test('TC-P0-6-R2-4: G4 rejects single-class degenerate Kappa (never 1.0), incomplete 4-class truth, and declared-8-vs-actual-1 source chapter mismatch', () => {
  // 1. 24 identical single-class pairs (SUGGESTION -> SUGGESTION) -> Kappa MUST be null/UNDEFINED, NEVER 1.0!
  const degenPairs = Array.from({length: 24}, (_, i) => ({
    caseId: `DEG-${i + 1}`,
    sourceChapterId: `FRESH-G4-SRC${(i % 8) + 1}`,
    truth: 'SUGGESTION',
    predicted: 'SUGGESTION',
  }));
  const kDegen = computeOrderedKappa(degenPairs);
  assert.equal(kDegen.quadraticWeightedKappa, null, 'Degenerate zero-denominator Kappa MUST be null, NEVER 1.0');
  assert.equal(kDegen.unweightedKappa, null);
  assert.equal(kDegen.degenerateMarginals, true);
  assert.equal(kDegen.kappaStatus, 'UNDEFINED_DEGENERATE_MARGINALS');

  const g4Degen = {
    sourceChapters: Array.from({length: 8}, (_, i) => `FRESH-G4-SRC${i + 1}`),
    nCases: 24,
    runs: [
      {pairs: degenPairs, suggestionLoopLeaks: 0},
      {pairs: degenPairs, suggestionLoopLeaks: 0},
    ],
  };
  const rDegen = evaluateG4(g4Degen);
  assert.equal(rDegen.pass, false);
  assert.equal(rDegen.status, 'INVALID_DESIGN');
  assert.equal(rDegen.exitCode, 2);
  assert.equal(rDegen.error, 'R3_P0_6_G4_INCOMPLETE_SEVERITY_CLASSES');

  // 2. Declare 8 sourceChapters, but all 24 cases actually come from ONLY 1 sourceChapterId -> rejected!
  const g4Fake8 = makePassingSchemeData().G4;
  g4Fake8.runs.forEach(r => {
    r.pairs.forEach(p => { p.sourceChapterId = 'FRESH-G4-SRC1'; });
  });
  const rFake8 = evaluateG4(g4Fake8);
  assert.equal(rFake8.pass, false);
  assert.equal(rFake8.status, 'INVALID_DESIGN');
  assert.equal(rFake8.exitCode, 2);
  assert.equal(rFake8.error, 'R3_P0_6_G4_SOURCE_CHAPTER_MISMATCH');

  // 3. Missing caseId/sourceChapterId on a probe -> rejected!
  const g4NoTrace = makePassingSchemeData().G4;
  delete g4NoTrace.runs[0].pairs[0].sourceChapterId;
  assert.equal(evaluateG4(g4NoTrace).error, 'R3_P0_6_G4_CASE_TRACEABILITY_MISSING');

  // 4. Duplicate caseId within a run -> rejected!
  const g4DupCase = makePassingSchemeData().G4;
  g4DupCase.runs[0].pairs[1].caseId = g4DupCase.runs[0].pairs[0].caseId;
  assert.equal(evaluateG4(g4DupCase).error, 'R3_P0_6_G4_DUPLICATE_CASE_ID');
});
