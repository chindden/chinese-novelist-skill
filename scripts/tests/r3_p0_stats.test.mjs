#!/usr/bin/env node
/**
 * P0-6 Comprehensive Statistical, Anti-Leakage & Go/No-Go Engine Test Suite
 * (`TC-P0-6-1A`~`1G`, `TC-P0-6-R2-1`~`R2-4`, `TC-P0-6-R3-1`~`R3-4`, `TC-P0-6-R4-1`~`R4-4`, `TC-P0-6-R5-1`~`R5-2`, `TC-P0-6-R6-1`):
 *   - TC-P0-6-1A: Exact mathematical verification (4x4 confusion matrix, quadratic weighted Kappa, unweighted Kappa, locked B=2000 cluster Bootstrap 95% CI)
 *   - TC-P0-6-1B: Cross-set anti-leakage, retired blacklist (`NH-1..5`, `V22-H1..4`, `OLD-HOLD-1..4`, `DOC-1..6`, `Arm 0..2 Ch 1..3`), merged-G2 ban, duplicate chapterId ban, per-chapter caps
 *   - TC-P0-6-1C: Mandatory `UNDERPOWERED` & `BLOCKED_UNDERPOWERED` enforcement (proving G2-A PASS != G2-B PASS and exact current sample gaps)
 *   - TC-P0-6-1D: Complete G1, G2-A, G2-B, G3, G4, G5, G6 threshold pass/fail boundary checks
 *   - TC-P0-6-1E: Scheme B hard elimination (>1.0 pp recall lag or BLOCKER miss), float-safe 1.0 pp edge, tie-break priority, all-fail stop rule, and CLI end-to-end
 *   - TC-P0-6-1F: Frozen architecture (`docs/r3/review-v3/`) & production (`SKILL.md`, non-prototype `references/`) zero-diff isolation check
 *   - TC-P0-6-1G: Archived `p0-6-readiness-verdict.json` byte-for-byte reproducibility against `p0-6-readiness-input.json`
 *   - TC-P0-6-R2-1: Case-level coverage & count consistency (rejects partial case coverage, undeclared caseIds, duplicate predictions, manifest mismatch)
 *   - TC-P0-6-R2-2: Complete `{A, B, C}` requirement & frozen dataset equivalence across all 3 schemes
 *   - TC-P0-6-R2-3: Independent Holdout internal provenance (`sourceChapterId` + 64-hex `contentSha256`) and internal uniqueness
 *   - TC-P0-6-R2-4: Direct math degenerate Kappa (`computeOrderedKappa` -> null) vs `evaluateG4` gate-level 4-class truth coverage, single-class collapse & source traceability
 *   - TC-P0-6-R3-1: G2 bounded positive manifest required for Precision & strict rejection of null-precision runs
 *   - TC-P0-6-R3-2: Case-level A/B/C equivalence (same chapter/count but different caseId/tier rejected) & derived BLOCKER misses (no self-reported integers)
 *   - TC-P0-6-R3-3: Exact frozen K_rep enforcement across G1/G2-A/G2-B/G3/G4/G6 & exact G4 N_case === 24
 *   - TC-P0-6-R3-4: Controlled 15-genre taxonomy, whitespace normalization, every-genre >=2ch, unclassified rejection, Fail-Closed G6 budget ceiling, and G5 compatEvidenceRef check
 *   - TC-P0-6-R4-1: Item 1 — G6 strict boolean `g6BudgetExpansionApproved === true` (rejects `"false"`, `1`, `{}`) and traceable `g6BudgetApprovalRef`
 *   - TC-P0-6-R4-2: Item 2 — K_rep protocol run provenance (unique `runId`, `executionEvidenceRef`, `modelId`/`configVersion`; rejects cloned runs while allowing identical predictions across distinct runs)
 *   - TC-P0-6-R4-3: Item 3 — G2-A exact frozen `9ch / 40pos / 33neg` + `manifestVersion`/`manifestSha256` pinning & G2-B Stage 1B author positive-cohort approval gate
 *   - TC-P0-6-R4-4: Items 4–5 — Unified G3/G4/G5 historical exposure auto-aggregation, G3 `sourceChapterId` deduplication, and G5 required `s1CompatTest` + `engFixP1Test` anchor keys
 *   - TC-P0-6-R5-1: Round 4 Blocking 1 — G3 mandatory `sourceChapterId` (rejects omitted sourceChapterId, preserves 3-source UNDERPOWERED & explicit independent PASS)
 *   - TC-P0-6-R5-2: Round 4 Blocking 2 — Mandatory out-of-band external pre-frozen manifest SHA-256 for official K=3 G2-A & G2-B across API & CLI (incl. symmetric G2-A tamper check)
 *   - TC-P0-6-R6-1: Round 5 Blocking 1 — Mandatory G2-B `positiveCohortApprovedManifestSha256` binding (rejects missing/malformed/mismatched; verified binding output; K=0 readiness unaffected)
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
  CANONICAL_GENRES,
  ORDERED_SEVERITIES,
  normalizeCanonicalGenre,
  computeCaseManifestSha256,
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

function makeRunMeta(gateTag, idx) {
  return {
    runId: `${gateTag}-RUN-${idx + 1}`,
    executionEvidenceRef: `evidence/runs/${gateTag.toLowerCase()}-run-${idx + 1}.json`,
    modelId: 'synthetic-reviewer-v1',
    configVersion: 'r3-p0-6-proto-v1',
  };
}

function g2AnchorsFor(scheme) {
  return {
    expectedG2AManifestSha256: scheme?.G2A?.manifestSha256 ?? null,
    expectedG2BManifestSha256: scheme?.G2B?.manifestSha256 ?? null,
  };
}

/**
 * Helper: build a fully powered, clean case-level synthetic passing dataset across all 7 gates for one scheme.
 * All TP, FP, FN, TN, Clear-tier FP, and BLOCKER misses are derived strictly from case-level predictions.
 */
function makePassingSchemeData({
  g1Track2MissMajorCount = 1, // out of 40 positives -> 39/40 = 97.5% >= 95%
  g1MissBlocker = false,
  g2bRunFpCounts = [2, 2, 2], // out of 60 negatives per run -> FPR = 2/60 = 3.33%
  g6MissMajorCount = 1, // out of 36 positives -> 35/36 = 97.22%
  g6MissBlocker = false,
  avgReviewLatencyMs = 45000,
} = {}) {
  // G1 Track 2: 9 historical chapters, 40 positive cases (1 BLOCKER + rest MAJOR per chapter), exact K=3
  const t2PosCounts = [4, 4, 4, 4, 4, 5, 5, 5, 5];
  const g1Track2Chapters = t2PosCounts.map((pos, i) => ({
    chapterId: `HIST-CAL-CH${String(i + 1).padStart(2, '0')}`,
    positives: pos,
    cases: Array.from({length: pos}, (_, j) => ({
      caseId: `G1-T2-CH${String(i + 1).padStart(2, '0')}-P${j + 1}`,
      truthClass: j === 0 ? 'BLOCKER' : 'MAJOR',
    })),
  }));
  const allT2Cases = g1Track2Chapters.flatMap(ch => ch.cases);
  const g1Track2Runs = [0, 1, 2].map(rIdx => {
    let remMajorMiss = g1Track2MissMajorCount;
    let remBlockerMiss = rIdx === 0 && g1MissBlocker ? 1 : 0;
    return {
      ...makeRunMeta('G1-T2', rIdx),
      predictions: allT2Cases.map(c => {
        if (c.truthClass === 'BLOCKER' && remBlockerMiss > 0) {
          remBlockerMiss--;
          return {caseId: c.caseId, predictedBlocking: false};
        }
        if (c.truthClass === 'MAJOR' && remMajorMiss > 0) {
          remMajorMiss--;
          return {caseId: c.caseId, predictedBlocking: false};
        }
        return {caseId: c.caseId, predictedBlocking: true};
      }),
    };
  });

  // G1 Regression 7: 7 chapters x 2 positive cases (1 BLOCKER + 1 MAJOR), exact K=1
  const reg7Chapters = Array.from({length: 7}, (_, i) => ({
    chapterId: `HIST-REG7-CH${String(i + 1).padStart(2, '0')}`,
    positives: 2,
    cases: [
      {caseId: `G1-REG7-CH${i + 1}-B1`, truthClass: 'BLOCKER'},
      {caseId: `G1-REG7-CH${i + 1}-M1`, truthClass: 'MAJOR'},
    ],
  }));
  const reg7Runs = [{
    ...makeRunMeta('G1-REG7', 0),
    predictions: reg7Chapters.flatMap(ch => ch.cases.map(c => ({caseId: c.caseId, predictedBlocking: true}))),
  }];

  // G2-A: Exact frozen P0-0 benchmark: 9 chapters, 40 positives + 33 negatives (3+3+3+4+4+4+4+4+4), exact K=3
  const g2aNegCounts = [3, 3, 3, 4, 4, 4, 4, 4, 4];
  const g2aChapters = g2aNegCounts.map((neg, i) => {
    const pos = t2PosCounts[i];
    const posCases = Array.from({length: pos}, (_, j) => ({
      caseId: `G2A-CH${String(i + 1).padStart(2, '0')}-POS${j + 1}`,
      truthClass: j === 0 ? 'BLOCKER' : 'MAJOR',
    }));
    const negCases = Array.from({length: neg}, (_, j) => ({
      caseId: `G2A-CH${String(i + 1).padStart(2, '0')}-NEG${j + 1}`,
      truthClass: 'NON_BLOCKING',
      tier: j === 0 ? 'CLEAR' : 'BORDERLINE',
    }));
    return {
      chapterId: `HIST-CAL-CH${String(i + 1).padStart(2, '0')}`,
      positives: pos,
      negatives: neg,
      cases: [...posCases, ...negCases],
    };
  });
  const allG2aCases = g2aChapters.flatMap(ch => ch.cases);
  const g2aRuns = [0, 1, 2].map(rIdx => {
    let remFp = 2; // 2 borderline FPs out of 33 negatives -> FPR = 6.06% <= 13%, TP = 40 -> Precision = 40/42 = 95.2% >= 88%
    return {
      ...makeRunMeta('G2A', rIdx),
      predictions: allG2aCases.map(c => {
        if (c.truthClass !== 'NON_BLOCKING') return {caseId: c.caseId, predictedBlocking: true};
        if (c.tier === 'BORDERLINE' && remFp > 0) {
          remFp--;
          return {caseId: c.caseId, predictedBlocking: true};
        }
        return {caseId: c.caseId, predictedBlocking: false};
      }),
    };
  });

  // G2-B: 20 fresh independent chapters x (3 positives + 3 negatives) = 60 positives + 60 negatives, 4 canonical genres, exact K=3
  const genres4 = ['悬疑', '历史', '科幻', '都市'];
  const g2bChapters = Array.from({length: 20}, (_, i) => {
    const posCases = Array.from({length: 3}, (_, j) => ({
      caseId: `G2B-CH${String(i + 1).padStart(2, '0')}-POS${j + 1}`,
      truthClass: j === 0 ? 'BLOCKER' : 'MAJOR',
    }));
    const negCases = Array.from({length: 3}, (_, j) => ({
      caseId: `G2B-CH${String(i + 1).padStart(2, '0')}-NEG${j + 1}`,
      truthClass: 'NON_BLOCKING',
      tier: j === 0 ? 'CLEAR' : 'BORDERLINE',
    }));
    return {
      chapterId: `FRESH-G2B-CH${String(i + 1).padStart(2, '0')}`,
      sourceChapterId: `SRC-G2B-NOVEL${(i % 4) + 1}-CH${String(i + 1).padStart(2, '0')}`,
      genre: genres4[i % genres4.length],
      positives: 3,
      negatives: 3,
      contentSha256: `b${String(i + 1).padStart(63, '0')}`,
      cases: [...posCases, ...negCases],
    };
  });
  const allG2bCases = g2bChapters.flatMap(ch => ch.cases);
  const g2bRuns = g2bRunFpCounts.map((totalFpInRun, rIdx) => {
    let remFp = totalFpInRun;
    return {
      ...makeRunMeta('G2B', rIdx),
      predictions: allG2bCases.map(c => {
        if (c.truthClass !== 'NON_BLOCKING') return {caseId: c.caseId, predictedBlocking: true};
        if (c.tier === 'BORDERLINE' && remFp > 0) {
          remFp--;
          return {caseId: c.caseId, predictedBlocking: true};
        }
        return {caseId: c.caseId, predictedBlocking: false};
      }),
    };
  });

  // G3: 10 independent chapters, 15 clean paragraphs (5x2 + 5x1 = 15, <=2/ch), exact K=3
  const g3Chapters = Array.from({length: 10}, (_, i) => {
    const cnt = i < 5 ? 2 : 1;
    return {
      chapterId: `FRESH-G3-CH${String(i + 1).padStart(2, '0')}`,
      sourceChapterId: `SRC-G3-CH${String(i + 1).padStart(2, '0')}`,
      paragraphs: cnt,
      cases: Array.from({length: cnt}, (_, j) => ({
        caseId: `G3-CH${String(i + 1).padStart(2, '0')}-PARA${j + 1}`,
        truthClass: 'CLEAN_PARAGRAPH',
      })),
    };
  });
  const allG3Cases = g3Chapters.flatMap(ch => ch.cases);
  const g3Runs = [0, 1, 2].map(rIdx => ({
    ...makeRunMeta('G3', rIdx),
    predictions: allG3Cases.map(c => ({caseId: c.caseId, predictedBlocking: false, noIssue: true})),
  }));

  // G4: 8 independent source chapters, exact N_case=24 traceable cases, exact K=2
  const g4SourceChapters = Array.from({length: 8}, (_, i) => `FRESH-G4-SRC${i + 1}`);
  const g4Pairs = [];
  for (let i = 0; i < 24; i++) {
    const gt = ORDERED_SEVERITIES[i % 4];
    const pred = i === 23 ? 'MINOR' : gt; // 23/24 exact, 1 adjacent => kappa_w > 0.98
    g4Pairs.push({
      caseId: `G4-CASE-${String(i + 1).padStart(2, '0')}`,
      sourceChapterId: g4SourceChapters[i % 8],
      truth: gt,
      predicted: pred,
    });
  }
  const g4Runs = [
    {...makeRunMeta('G4', 0), pairs: g4Pairs, suggestionLoopLeaks: 0},
    {...makeRunMeta('G4', 1), pairs: g4Pairs, suggestionLoopLeaks: 0},
  ];

  // G5: 3 independent deadlock chapters + 3 legal trope cases + required test path anchors
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
      s1CompatTest: 'scripts/tests/r3_s1_severity_compat.test.mjs',
      engFixP1Test: 'scripts/tests/r3_fingerprint_failclosed.test.mjs',
    },
  };

  // G6: 4 canonical genres x 3 chapters = 12 chapters, 36 positives (12 BLOCKER + 24 MAJOR), 48 negatives, exact K=1
  const g6Chapters = Array.from({length: 12}, (_, i) => {
    const posCases = [
      {caseId: `G6-CH${String(i + 1).padStart(2, '0')}-B1`, truthClass: 'BLOCKER'},
      {caseId: `G6-CH${String(i + 1).padStart(2, '0')}-M1`, truthClass: 'MAJOR'},
      {caseId: `G6-CH${String(i + 1).padStart(2, '0')}-M2`, truthClass: 'MAJOR'},
    ];
    const negCases = Array.from({length: 4}, (_, j) => ({
      caseId: `G6-CH${String(i + 1).padStart(2, '0')}-N${j + 1}`,
      truthClass: 'NON_BLOCKING',
      tier: j < 2 ? 'CLEAR' : 'BORDERLINE',
    }));
    return {
      chapterId: `FRESH-G6-CH${String(i + 1).padStart(2, '0')}`,
      sourceChapterId: `SRC-G6-NOVEL${(i % 4) + 1}-CH${String(i + 1).padStart(2, '0')}`,
      genre: genres4[i % 4],
      positives: 3,
      negatives: 4,
      contentSha256: `c${String(i + 1).padStart(63, '0')}`,
      cases: [...posCases, ...negCases],
    };
  });
  const allG6Cases = g6Chapters.flatMap(ch => ch.cases);
  let remG6MajorMiss = g6MissMajorCount;
  let remG6BlockerMiss = g6MissBlocker ? 1 : 0;
  let remG6Fp = 2; // 2/48 = 4.17% <= 13%
  const g6Runs = [{
    ...makeRunMeta('G6', 0),
    predictions: allG6Cases.map(c => {
      if (c.truthClass === 'BLOCKER') {
        if (remG6BlockerMiss > 0) {
          remG6BlockerMiss--;
          return {caseId: c.caseId, predictedBlocking: false};
        }
        return {caseId: c.caseId, predictedBlocking: true};
      }
      if (c.truthClass === 'MAJOR') {
        if (remG6MajorMiss > 0) {
          remG6MajorMiss--;
          return {caseId: c.caseId, predictedBlocking: false};
        }
        return {caseId: c.caseId, predictedBlocking: true};
      }
      if (c.tier === 'BORDERLINE' && remG6Fp > 0) {
        remG6Fp--;
        return {caseId: c.caseId, predictedBlocking: true};
      }
      return {caseId: c.caseId, predictedBlocking: false};
    }),
  }];

  const g2bManifestSha = computeCaseManifestSha256(g2bChapters);
  return {
    avgReviewLatencyMs,
    G1: {
      track2: {chapters: g1Track2Chapters, runs: g1Track2Runs},
      regression7: {chapters: reg7Chapters, runs: reg7Runs},
    },
    G2A: {
      manifestVersion: 'p0-0-track2-frozen-v1',
      manifestSha256: computeCaseManifestSha256(g2aChapters),
      chapters: g2aChapters,
      runs: g2aRuns,
    },
    G2B: {
      manifestVersion: 'stage-1b-synthetic-g2b-v1',
      manifestSha256: g2bManifestSha,
      positiveCohortApproved: true,
      positiveCohortApprovalRef: 'STAGE-1B-TEST-APPROVAL-REF',
      positiveCohortApprovedManifestSha256: g2bManifestSha,
      chapters: g2bChapters,
      runs: g2bRuns,
    },
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

  const extremePairs = [
    {truth: 'BLOCKER', predicted: 'SUGGESTION'},
    {truth: 'MAJOR', predicted: 'MAJOR'},
    {truth: 'MINOR', predicted: 'MINOR'},
    {truth: 'SUGGESTION', predicted: 'BLOCKER'},
  ];
  const kExtreme = computeOrderedKappa(extremePairs);
  assert.equal(kExtreme.quadraticWeightedKappa, -0.8);
  assert.ok(kExtreme.quadraticWeightedKappa < kExact.quadraticWeightedKappa);

  assert.throws(
    () => computeOrderedKappa([{truth: 'BLOCKER', predicted: 'UNKNOWN_LEVEL'}]),
    /R3_P0_6_INVALID_SEVERITY_LABEL/
  );

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
  assert.deepEqual(b1, b2);
  assert.equal(b1.iterations, 2000);
  assert.equal(b1.nClusters, 2);
  assert.equal(b1.point, 0.5);
  assert.equal(b1.macroMean, 0.5);
  assert.deepEqual(b1.ci95, [0, 1]);
  assert.equal(b1.doesNotCompensateForSmallNCh, true);

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
  const refChapters = [{chapterId: 'HIST-CAL-CH01', contentSha256: 'a'.repeat(64)}];

  const ovId = assertZeroLeakage(refChapters, [{chapterId: 'hist-cal-ch01'}], {holdoutName: 'G2-B'});
  assert.equal(ovId.ok, false);
  assert.equal(ovId.exitCode, 2);
  assert.equal(ovId.error, 'R3_P0_6_DATA_LEAKAGE_DETECTED');

  const ovHash = assertZeroLeakage(refChapters, [{chapterId: 'BRAND-NEW-ID', contentSha256: 'a'.repeat(64)}], {holdoutName: 'G2-B'});
  assert.equal(ovHash.ok, false);
  assert.ok(ovHash.violations.some(v => v.code === 'R3_P0_6_CONTENT_HASH_OVERLAP'));

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
    assert.equal(res.ok, false);
    assert.equal(res.exitCode, 2);
    assert.ok(res.violations.some(v => v.code === 'R3_P0_6_RETIRED_BLACKLIST_HIT'));
  }

  // Merged `G2` key strictly forbidden!
  const mergedG2 = makePassingSchemeData();
  mergedG2.G2 = mergedG2.G2A;
  assert.equal(evaluateSchemeG1ToG6('A', mergedG2).error, 'R3_P0_6_MERGED_G2_FORBIDDEN');

  // Duplicate chapterId in G2-B -> rejected!
  const dupData = makePassingSchemeData();
  dupData.G2B.chapters[1].chapterId = dupData.G2B.chapters[0].chapterId;
  assert.equal(evaluateG2B(dupData.G2B).error, 'R3_P0_6_DUPLICATE_CHAPTER_ID');

  // G2-B chapter with >3 non-blocking cases -> rejected!
  const capG2b = makePassingSchemeData();
  capG2b.G2B.chapters[0].negatives = 4;
  capG2b.G2B.chapters[0].cases.push({caseId: 'G2B-CH01-NEG4', truthClass: 'NON_BLOCKING', tier: 'BORDERLINE'});
  capG2b.G2B.manifestSha256 = computeCaseManifestSha256(capG2b.G2B.chapters);
  capG2b.G2B.positiveCohortApprovedManifestSha256 = capG2b.G2B.manifestSha256;
  capG2b.G2B.runs.forEach(r => r.predictions.push({caseId: 'G2B-CH01-NEG4', predictedBlocking: false}));
  assert.equal(
    evaluateG2B(capG2b.G2B, {expectedG2BManifestSha256: capG2b.G2B.manifestSha256}).error,
    'R3_P0_6_G2B_CHAPTER_CASE_CAP_EXCEEDED'
  );

  // G3 chapter with >2 paragraphs -> rejected!
  const capG3 = makePassingSchemeData();
  capG3.G3.chapters[0].paragraphs = 3;
  capG3.G3.chapters[0].cases.push({caseId: 'G3-CH01-PARA3', truthClass: 'CLEAN_PARAGRAPH'});
  capG3.G3.runs.forEach(r => r.predictions.push({caseId: 'G3-CH01-PARA3', predictedBlocking: false, noIssue: true}));
  assert.equal(evaluateG3(capG3.G3).error, 'R3_P0_6_G3_CHAPTER_PARAGRAPH_CAP_EXCEEDED');

  // G6 with K > 1 -> rejected!
  const multiG6 = makePassingSchemeData();
  multiG6.G6.runs.push(structuredClone(multiG6.G6.runs[0]));
  assert.equal(evaluateG6(multiG6.G6).error, 'R3_P0_6_G6_MUST_BE_SINGLE_SHOT_K1');
});

// ============================================================================
// TC-P0-6-1C: Mandatory UNDERPOWERED & BLOCKED_UNDERPOWERED Enforcement
// ============================================================================
test('TC-P0-6-1C: insufficient G2-B / G3 / G4 / G5 / G6 samples force UNDERPOWERED and BLOCKED_UNDERPOWERED even when G1 & G2-A pass 100%', () => {
  const currentGapData = makePassingSchemeData();
  currentGapData.G2B = {chapters: [], runs: []};
  currentGapData.G6 = {chapters: [], runs: []};
  const resBlocked = adjudicateSchemes(
    {
      A: currentGapData,
      B: structuredClone(currentGapData),
      C: structuredClone(currentGapData),
    },
    {expectedG2AManifestSha256: currentGapData.G2A.manifestSha256}
  );
  assert.equal(resBlocked.ok, true);
  assert.equal(resBlocked.verdict, 'BLOCKED_UNDERPOWERED');
  assert.equal(resBlocked.winner, null);
  assert.equal(resBlocked.allowProductionMerge, false);
  assert.equal(resBlocked.schemes.A.gates.G1.status, 'PASS');
  assert.equal(resBlocked.schemes.A.gates.G2A.status, 'PASS');
  assert.equal(resBlocked.schemes.A.gates.G2B.status, 'UNDERPOWERED');
  assert.equal(resBlocked.schemes.A.gates.G6.status, 'UNDERPOWERED');

  // G2-B with 19 chapters (< 20) -> UNDERPOWERED
  const g2b19 = makePassingSchemeData().G2B;
  const removedCh = g2b19.chapters.pop();
  g2b19.manifestSha256 = computeCaseManifestSha256(g2b19.chapters);
  g2b19.positiveCohortApprovedManifestSha256 = g2b19.manifestSha256;
  const removedIds = new Set(removedCh.cases.map(c => c.caseId));
  g2b19.runs.forEach(r => { r.predictions = r.predictions.filter(p => !removedIds.has(p.caseId)); });
  assert.equal(evaluateG2B(g2b19, {expectedG2BManifestSha256: g2b19.manifestSha256}).status, 'UNDERPOWERED');

  // G2-B with 2 genres (< 3) -> UNDERPOWERED
  const g2b2Genres = makePassingSchemeData().G2B;
  g2b2Genres.chapters.forEach((c, i) => { c.genre = i % 2 === 0 ? '悬疑' : '历史'; });
  g2b2Genres.manifestSha256 = computeCaseManifestSha256(g2b2Genres.chapters);
  g2b2Genres.positiveCohortApprovedManifestSha256 = g2b2Genres.manifestSha256;
  assert.equal(evaluateG2B(g2b2Genres, {expectedG2BManifestSha256: g2b2Genres.manifestSha256}).status, 'UNDERPOWERED');

  // G3 with 9 independent source chapters / 9 paragraphs -> UNDERPOWERED
  const g3Hist = {
    chapters: Array.from({length: 9}, (_, i) => ({
      chapterId: `S4-CH${i + 1}`,
      sourceChapterId: `S4-SRC-${i + 1}`,
      paragraphs: 1,
    })),
    runs: [],
  };
  const g3Res = evaluateG3(g3Hist);
  assert.equal(g3Res.status, 'UNDERPOWERED');
  assert.ok(g3Res.gaps.some(g => g.includes('N_ch(independentSourceChapters)=9 < 10')));

  // G4 with 3 independent source chapters -> UNDERPOWERED
  const g4Hist = makePassingSchemeData().G4;
  g4Hist.sourceChapters = ['QHL-CH1', 'QHL-CH2', 'QHL-CH3'];
  g4Hist.runs.forEach(r => {
    r.pairs.forEach((p, idx) => { p.sourceChapterId = g4Hist.sourceChapters[idx % 3]; });
  });
  const g4Res = evaluateG4(g4Hist);
  assert.equal(g4Res.status, 'UNDERPOWERED');
  assert.ok(g4Res.gaps.some(g => g.includes('independentSourceChapters=3 < 8')));

  // G5 with 1 deadlock chapter -> UNDERPOWERED
  const g5Hist = makePassingSchemeData().G5;
  g5Hist.deadlockCases = [{chapterId: 'V22-H4', decision: 'PLANNING_CONFLICT_BLOCK'}];
  assert.equal(evaluateG5(g5Hist).status, 'UNDERPOWERED');
});

// ============================================================================
// TC-P0-6-1D: All 7 Gates (G1, G2-A, G2-B, G3, G4, G5, G6) Pass & Boundary Fail Checks
// ============================================================================
test('TC-P0-6-1D: all 7 gates enforce exact frozen thresholds on pass and surgical boundary failures', () => {
  const clean = makePassingSchemeData();
  const evalClean = evaluateSchemeG1ToG6('C', clean, g2AnchorsFor(clean));
  assert.equal(evalClean.status, 'PASS');
  assert.equal(evalClean.allGatesPassed, true);
  assert.equal(evalClean.gates.G6.budgetStatus, 'WITHIN_FROZEN_BUDGET');

  // G1 fail: 1 known BLOCKER miss (derived from case-level prediction!)
  assert.equal(evaluateG1(makePassingSchemeData({g1MissBlocker: true}).G1).status, 'FAIL');

  // G2-B fail: Clear-tier FP = 1 (derived from CLEAR case predictedBlocking=true!)
  const badG2bClear = makePassingSchemeData();
  const clearCaseId = badG2bClear.G2B.chapters[0].cases.find(c => c.tier === 'CLEAR').caseId;
  badG2bClear.G2B.runs[1].predictions.find(p => p.caseId === clearCaseId).predictedBlocking = true;
  assert.equal(evaluateG2B(badG2bClear.G2B, {expectedG2BManifestSha256: badG2bClear.G2B.manifestSha256}).status, 'FAIL');

  // G2-B fail: single-run FPR > 15% (10/60 = 16.67%) even when 3-run mean <= 13%
  const badSingleFpr = makePassingSchemeData({g2bRunFpCounts: [0, 10, 0]}).G2B;
  assert.equal(evaluateG2B(badSingleFpr, {expectedG2BManifestSha256: badSingleFpr.manifestSha256}).status, 'FAIL');

  // G2-B fail: 3-run mean FPR > 13% (8/60 = 13.33% each run)
  const badMeanFpr = makePassingSchemeData({g2bRunFpCounts: [8, 8, 8]}).G2B;
  assert.equal(evaluateG2B(badMeanFpr, {expectedG2BManifestSha256: badMeanFpr.manifestSha256}).status, 'FAIL');

  // G3 fail: 1 blocking FP
  const badG3 = makePassingSchemeData();
  badG3.G3.runs[0].predictions[0] = {caseId: badG3.G3.runs[0].predictions[0].caseId, predictedBlocking: true, noIssue: false};
  assert.equal(evaluateG3(badG3.G3).status, 'FAIL');

  // G4 fail: 1 SUGGESTION loop leak
  const badG4 = makePassingSchemeData();
  badG4.G4.runs[0].suggestionLoopLeaks = 1;
  assert.equal(evaluateG4(badG4.G4).status, 'FAIL');

  // G5 fail: deadlock whitewashed to pass_candidate
  const badG5 = makePassingSchemeData();
  badG5.G5.deadlockCases[0].decision = 'pass_candidate';
  assert.equal(evaluateG5(badG5.G5).status, 'FAIL');

  // G6 fail: 1 objective BLOCKER miss (derived from case-level prediction!)
  assert.equal(evaluateG6(makePassingSchemeData({g6MissBlocker: true}).G6).status, 'FAIL');
});

// ============================================================================
// TC-P0-6-1E: Scheme B Hard Elimination, Tie-Break Priority, All-Fail Stop Rule, and CLI
// ============================================================================
test('TC-P0-6-1E: enforces Scheme B hard elimination (>1.0 pp recall lag or BLOCKER miss), float-safe 1.0 pp edge, tie-break priority, and CLI exit codes', t => {
  // 1. Scheme B eliminated when G6 recall trails C by > 1.0 pp (33/36=91.67% vs 35/36=97.22%)
  const schemeA = makePassingSchemeData({g6MissMajorCount: 1, g2bRunFpCounts: [4, 4, 4], avgReviewLatencyMs: 40000});
  const schemeB = makePassingSchemeData({g6MissMajorCount: 3, g2bRunFpCounts: [1, 1, 1], avgReviewLatencyMs: 30000});
  const schemeC = makePassingSchemeData({g6MissMajorCount: 1, g2bRunFpCounts: [2, 2, 2], avgReviewLatencyMs: 42000});

  const adj1 = adjudicateSchemes({A: schemeA, B: schemeB, C: schemeC}, g2AnchorsFor(schemeA));
  assert.equal(adj1.verdict, 'GO_CANDIDATE_SELECTED');
  assert.equal(adj1.eliminations.B?.eliminated, true);
  assert.equal(adj1.winner, 'C');
  assert.equal(adj1.allowProductionMerge, false);

  // 2. Float-safe 1.0 pp boundary: G1 recall 96/100=0.96 vs 95/100=0.95 (exact 0.01 lag) -> NOT falsely eliminated!
  const exactEdgeA = makePassingSchemeData({g6MissMajorCount: 1, g2bRunFpCounts: [3, 3, 3], avgReviewLatencyMs: 50000});
  const exactEdgeB = makePassingSchemeData({g6MissMajorCount: 1, g2bRunFpCounts: [2, 2, 2], avgReviewLatencyMs: 35000});
  const exactEdgeC = makePassingSchemeData({g6MissMajorCount: 1, g2bRunFpCounts: [4, 4, 4], avgReviewLatencyMs: 45000});
  const make100PosG1 = (missMajorCount) => {
    const chs = Array.from({length: 10}, (_, i) => ({
      chapterId: `EDGE-CH${i + 1}`,
      positives: 10,
      cases: Array.from({length: 10}, (_, j) => ({
        caseId: `EDGE-CH${i + 1}-C${j + 1}`,
        truthClass: j === 0 ? 'BLOCKER' : 'MAJOR',
      })),
    }));
    const flat = chs.flatMap(c => c.cases);
    const runs = [0, 1, 2].map(rIdx => {
      let rem = missMajorCount;
      return {
        ...makeRunMeta('G1-EDGE', rIdx),
        predictions: flat.map(c => {
          if (c.truthClass === 'MAJOR' && rem > 0) {
            rem--;
            return {caseId: c.caseId, predictedBlocking: false};
          }
          return {caseId: c.caseId, predictedBlocking: true};
        }),
      };
    });
    return {track2: {chapters: chs, runs}, regression7: exactEdgeA.G1.regression7};
  };
  exactEdgeA.G1 = make100PosG1(4); // 0.96
  exactEdgeB.G1 = make100PosG1(5); // 0.95 (exact 1.0 pp lag)
  exactEdgeC.G1 = make100PosG1(4); // 0.96
  const adjEdge = adjudicateSchemes({A: exactEdgeA, B: exactEdgeB, C: exactEdgeC}, g2AnchorsFor(exactEdgeA));
  assert.equal(adjEdge.eliminations.B, undefined);
  assert.equal(adjEdge.winner, 'B');

  // 3. All schemes fail -> NO_GO_ALL_SCHEMES_FAILED
  const failAll = makePassingSchemeData({g6MissBlocker: true});
  const adjNoGo = adjudicateSchemes({A: failAll, B: structuredClone(failAll), C: structuredClone(failAll)}, g2AnchorsFor(failAll));
  assert.equal(adjNoGo.verdict, 'NO_GO_ALL_SCHEMES_FAILED');
  assert.equal(adjNoGo.winner, null);

  // 4. CLI end-to-end with out-of-band external manifest hash flags
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p06-cli-'));
  t.after(() => fs.rmSync(tmpDir, {recursive: true, force: true}));

  const okIn = path.join(tmpDir, 'ok.json');
  const okOut = path.join(tmpDir, 'ok-out.json');
  fs.writeFileSync(okIn, JSON.stringify({schemes: {A: schemeA, B: schemeB, C: schemeC}}, null, 2), 'utf8');
  const cliOk = spawnSync(
    process.execPath,
    [
      EVAL_CLI,
      'evaluate',
      '--input',
      okIn,
      '--out',
      okOut,
      '--expected-g2a-manifest-sha256',
      schemeA.G2A.manifestSha256,
      '--expected-g2b-manifest-sha256',
      schemeA.G2B.manifestSha256,
    ],
    {encoding: 'utf8'}
  );
  assert.equal(cliOk.status, 0, cliOk.stderr);
  assert.equal(JSON.parse(fs.readFileSync(okOut, 'utf8')).winner, 'C');

  const leakScheme = makePassingSchemeData();
  leakScheme.G2B.chapters[0].chapterId = 'V22-H4';
  const leakPayload = {schemes: {A: leakScheme, B: structuredClone(leakScheme), C: structuredClone(leakScheme)}};
  const leakIn = path.join(tmpDir, 'leak.json');
  fs.writeFileSync(leakIn, JSON.stringify(leakPayload, null, 2), 'utf8');
  const cliLeak = spawnSync(
    process.execPath,
    [
      EVAL_CLI,
      'evaluate',
      '--input',
      leakIn,
      '--expected-g2a-manifest-sha256',
      leakScheme.G2A.manifestSha256,
      '--expected-g2b-manifest-sha256',
      leakScheme.G2B.manifestSha256,
    ],
    {encoding: 'utf8'}
  );
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
  assert.equal(res.stdout, archived);

  const parsed = JSON.parse(res.stdout);
  assert.equal(parsed.verdict, 'BLOCKED_UNDERPOWERED');
  assert.equal(parsed.winner, null);
  assert.equal(parsed.allowProductionMerge, false);
  assert.equal(parsed.schemes.A.gates.G2B.status, 'UNDERPOWERED');
  assert.equal(parsed.schemes.A.gates.G6.status, 'UNDERPOWERED');
});

// ============================================================================
// TC-P0-6-R2-1: Case-Level Coverage & Count Consistency
// ============================================================================
test('TC-P0-6-R2-1: rejects partial case coverage, undeclared/duplicate prediction cases, manifest count mismatch, and contradictory G3 predictions', () => {
  // 1. G6 missing predictions for 11 of 12 chapters -> RUN_CASE_COVERAGE_MISMATCH
  const g6Partial = makePassingSchemeData().G6;
  const ch1Ids = new Set(g6Partial.chapters[0].cases.map(c => c.caseId));
  g6Partial.runs[0].predictions = g6Partial.runs[0].predictions.filter(p => ch1Ids.has(p.caseId));
  assert.equal(evaluateG6(g6Partial).error, 'R3_P0_6_RUN_CASE_COVERAGE_MISMATCH');

  // 2. Undeclared caseId in prediction -> UNDECLARED_PREDICTION_CASE
  const g1Undeclared = makePassingSchemeData().G1;
  g1Undeclared.track2.runs[0].predictions[0].caseId = 'BOGUS-CASE-999';
  assert.equal(evaluateG1(g1Undeclared).error, 'R3_P0_6_UNDECLARED_PREDICTION_CASE');

  // 3. Declared positives mismatching cases[] count -> OBSERVATION_MANIFEST_MISMATCH
  const g1CountMismatch = makePassingSchemeData().G1;
  g1CountMismatch.track2.chapters[0].positives = 99;
  assert.equal(evaluateG1(g1CountMismatch).error, 'R3_P0_6_OBSERVATION_MANIFEST_MISMATCH');

  // 4. Contradictory G3 prediction (predictedBlocking=true AND noIssue=true) -> INVALID_OBSERVATION_COUNTS
  const g3Contra = makePassingSchemeData().G3;
  g3Contra.runs[0].predictions[0] = {caseId: g3Contra.runs[0].predictions[0].caseId, predictedBlocking: true, noIssue: true};
  assert.equal(evaluateG3(g3Contra).error, 'R3_P0_6_INVALID_OBSERVATION_COUNTS');
});

// ============================================================================
// TC-P0-6-R2-2: Complete {A, B, C} & Frozen Dataset Equivalence Gate
// ============================================================================
test('TC-P0-6-R2-2: adjudicateSchemes requires complete {A, B, C} and exact canonical dataset equivalence across all 3 schemes', () => {
  const baseA = makePassingSchemeData();
  const baseB = makePassingSchemeData();
  const baseC = makePassingSchemeData();

  assert.equal(adjudicateSchemes({A: baseA}).error, 'R3_P0_6_INCOMPLETE_ABC_SCHEMES');
  assert.equal(adjudicateSchemes({A: baseA, C: baseC}).error, 'R3_P0_6_INCOMPLETE_ABC_SCHEMES');

  // Different chapter ID in G2-B
  const diffIdC = makePassingSchemeData();
  diffIdC.G2B.chapters[0].chapterId = 'DIFFERENT-G2B-CH99';
  const rDiffId = adjudicateSchemes({A: baseA, B: baseB, C: diffIdC});
  assert.equal(rDiffId.error, 'R3_P0_6_UNEQUAL_EVALUATION_DATASET');
  assert.ok(rDiffId.mismatchedGates.includes('G2B'));

  // Same chapter ID, different contentSha256 in G6
  const diffHashB = makePassingSchemeData();
  diffHashB.G6.chapters[0].contentSha256 = 'f'.repeat(64);
  const rDiffHash = adjudicateSchemes({A: baseA, B: diffHashB, C: baseC});
  assert.equal(rDiffHash.error, 'R3_P0_6_UNEQUAL_EVALUATION_DATASET');
  assert.ok(rDiffHash.mismatchedGates.includes('G6'));

  // Single-scheme diagnostic still works without declaring a winner
  const diagA = evaluateSchemeG1ToG6('A', baseA, g2AnchorsFor(baseA));
  assert.equal(diagA.status, 'PASS');
  assert.equal(diagA.winner, undefined);
});

// ============================================================================
// TC-P0-6-R2-3: Independent Holdout Internal Provenance & Uniqueness
// ============================================================================
test('TC-P0-6-R2-3: rejects renamed duplicate sourceChapterId, renamed duplicate contentSha256, and unverified missing provenance inside G2-B & G6', () => {
  const dupSrcG2b = makePassingSchemeData().G2B;
  dupSrcG2b.chapters[1].sourceChapterId = dupSrcG2b.chapters[0].sourceChapterId;
  assert.equal(evaluateG2B(dupSrcG2b).error, 'R3_P0_6_HOLDOUT_DUPLICATE_SOURCE_CHAPTER');

  const dupHashG2b = makePassingSchemeData().G2B;
  dupHashG2b.chapters[1].contentSha256 = dupHashG2b.chapters[0].contentSha256;
  assert.equal(evaluateG2B(dupHashG2b).error, 'R3_P0_6_HOLDOUT_DUPLICATE_CONTENT_HASH');

  const noProvG6 = makePassingSchemeData().G6;
  delete noProvG6.chapters[0].sourceChapterId;
  assert.equal(evaluateG6(noProvG6).error, 'R3_P0_6_HOLDOUT_PROVENANCE_UNVERIFIED');

  const badHashG6 = makePassingSchemeData().G6;
  badHashG6.chapters[0].contentSha256 = 'not-a-sha256';
  assert.equal(evaluateG6(badHashG6).error, 'R3_P0_6_HOLDOUT_PROVENANCE_UNVERIFIED');

  const dupSrcG6 = makePassingSchemeData().G6;
  dupSrcG6.chapters[2].sourceChapterId = dupSrcG6.chapters[0].sourceChapterId;
  assert.equal(evaluateG6(dupSrcG6).error, 'R3_P0_6_HOLDOUT_DUPLICATE_SOURCE_CHAPTER');

  const dupHashG6 = makePassingSchemeData().G6;
  dupHashG6.chapters[2].contentSha256 = dupHashG6.chapters[0].contentSha256;
  assert.equal(evaluateG6(dupHashG6).error, 'R3_P0_6_HOLDOUT_DUPLICATE_CONTENT_HASH');

  assert.equal(assertHoldoutInternalProvenanceAndUniqueness([], {holdoutName: 'G2-B'}).ok, true);
});

// ============================================================================
// TC-P0-6-R2-4: Direct Math Degenerate Kappa vs G4 Gate-Level 4-Class / Collapse / Source Checks
// ============================================================================
test('TC-P0-6-R2-4: computeOrderedKappa returns null on degenerate marginals; evaluateG4 enforces 4-class truth, collapse FAIL, and source traceability', () => {
  // 1. Direct mathematical function test: single-class degenerate marginals -> kappa_w = null (never 1.0)
  const degenPairs = Array.from({length: 24}, (_, i) => ({
    caseId: `DEG-${i + 1}`,
    sourceChapterId: `FRESH-G4-SRC${(i % 8) + 1}`,
    truth: 'SUGGESTION',
    predicted: 'SUGGESTION',
  }));
  const kDegen = computeOrderedKappa(degenPairs);
  assert.equal(kDegen.quadraticWeightedKappa, null);
  assert.equal(kDegen.unweightedKappa, null);
  assert.equal(kDegen.degenerateMarginals, true);
  assert.equal(kDegen.kappaStatus, 'UNDEFINED_DEGENERATE_MARGINALS');

  // 2. G4 gate-level test: single-class truth is rejected upfront by 4-class truth coverage check
  const g4Degen = {
    sourceChapters: Array.from({length: 8}, (_, i) => `FRESH-G4-SRC${i + 1}`),
    nCases: 24,
    runs: [
      {...makeRunMeta('G4-DEG', 0), pairs: degenPairs, suggestionLoopLeaks: 0},
      {...makeRunMeta('G4-DEG', 1), pairs: degenPairs, suggestionLoopLeaks: 0},
    ],
  };
  assert.equal(evaluateG4(g4Degen).error, 'R3_P0_6_G4_INCOMPLETE_SEVERITY_CLASSES');

  // 3. G4 gate-level test: all-SUGGESTION model predictions against 4-class truth -> kappa_w = 0 < 0.85 -> FAIL!
  const g4AllSugPred = makePassingSchemeData().G4;
  g4AllSugPred.runs.forEach(r => r.pairs.forEach(p => { p.predicted = 'SUGGESTION'; }));
  const rCollapse = evaluateG4(g4AllSugPred);
  assert.equal(rCollapse.status, 'FAIL');
  assert.equal(rCollapse.pooled.quadraticWeightedKappa, 0);

  // 4. G4 gate-level test: declare 8 sourceChapters, but all 24 pairs actually come from 1 sourceChapterId -> rejected!
  const g4Fake8 = makePassingSchemeData().G4;
  g4Fake8.runs.forEach(r => r.pairs.forEach(p => { p.sourceChapterId = 'FRESH-G4-SRC1'; }));
  assert.equal(evaluateG4(g4Fake8).error, 'R3_P0_6_G4_SOURCE_CHAPTER_MISMATCH');

  const g4NoTrace = makePassingSchemeData().G4;
  delete g4NoTrace.runs[0].pairs[0].sourceChapterId;
  assert.equal(evaluateG4(g4NoTrace).error, 'R3_P0_6_G4_CASE_TRACEABILITY_MISSING');
});

// ============================================================================
// TC-P0-6-R3-1: G2 Bounded Positive Manifest & Strict Non-Null Precision
// ============================================================================
test('TC-P0-6-R3-1: G2 rejects missing positive manifest for Precision and never silently drops null-precision runs', () => {
  // 1. G2-B with ONLY NON_BLOCKING cases (0 positives in manifest) -> INVALID_DESIGN (cannot compute Precision!)
  const g2bNoPos = makePassingSchemeData().G2B;
  g2bNoPos.chapters.forEach(ch => {
    ch.cases = ch.cases.filter(c => c.truthClass === 'NON_BLOCKING');
    ch.positives = 0;
  });
  g2bNoPos.manifestSha256 = computeCaseManifestSha256(g2bNoPos.chapters);
  const keepNegIds = new Set(g2bNoPos.chapters.flatMap(ch => ch.cases.map(c => c.caseId)));
  g2bNoPos.runs.forEach(r => { r.predictions = r.predictions.filter(p => keepNegIds.has(p.caseId)); });
  const rNoPos = evaluateG2B(g2bNoPos, {expectedG2BManifestSha256: g2bNoPos.manifestSha256});
  assert.equal(rNoPos.status, 'INVALID_DESIGN');
  assert.equal(rNoPos.exitCode, 2);
  assert.equal(rNoPos.error, 'R3_P0_6_G2_POSITIVE_MANIFEST_REQUIRED_FOR_PRECISION');

  // 2. G2-B run 2 predicts false for ALL positives AND negatives (TP=0, FP=0 => precision=null) -> MUST FAIL, not drop null!
  const g2bNullPrec = makePassingSchemeData().G2B;
  g2bNullPrec.runs[1].predictions.forEach(p => { p.predictedBlocking = false; });
  const rNullPrec = evaluateG2B(g2bNullPrec, {expectedG2BManifestSha256: g2bNullPrec.manifestSha256});
  assert.equal(rNullPrec.status, 'FAIL');
  assert.equal(rNullPrec.precisionSummary.hasUndefined, true);
  assert.equal(rNullPrec.precisionSummary.mean, null);
  assert.ok(rNullPrec.failures.some(f => f.includes('R3_P0_6_PRECISION_UNDEFINED')));
});

// ============================================================================
// TC-P0-6-R3-2: Case-Level A/B/C Equivalence & Derived BLOCKER Misses
// ============================================================================
test('TC-P0-6-R3-2: detects same-chapter/same-count different caseIds or tiers across A/B/C, rejects aggregate-only runs, and derives BLOCKER misses from truth', () => {
  const baseA = makePassingSchemeData();
  const baseB = makePassingSchemeData();

  // 1. Same chapterId, same sourceChapterId, same contentSha256, same 3-negatives count,
  //    but Scheme C picked a DIFFERENT negative caseId inside G2B.chapters[0]!
  const diffCaseC = makePassingSchemeData();
  const oldId = diffCaseC.G2B.chapters[0].cases[3].caseId;
  const newId = 'G2B-CH01-NEG-SWAPPED';
  diffCaseC.G2B.chapters[0].cases[3].caseId = newId;
  diffCaseC.G2B.manifestSha256 = computeCaseManifestSha256(diffCaseC.G2B.chapters);
  diffCaseC.G2B.runs.forEach(r => {
    r.predictions.find(p => p.caseId === oldId).caseId = newId;
  });
  const rSwapCase = adjudicateSchemes({A: baseA, B: baseB, C: diffCaseC}, g2AnchorsFor(baseA));
  assert.equal(rSwapCase.ok, false);
  assert.equal(rSwapCase.exitCode, 2);
  assert.equal(rSwapCase.error, 'R3_P0_6_UNEQUAL_EVALUATION_DATASET');
  assert.ok(rSwapCase.mismatchedGates.includes('G2B'));

  // 2. Same caseIds, but Scheme C changed a case tier from CLEAR -> BORDERLINE -> rejected!
  const diffTierC = makePassingSchemeData();
  diffTierC.G2B.chapters[0].cases.find(c => c.tier === 'CLEAR').tier = 'BORDERLINE';
  diffTierC.G2B.manifestSha256 = computeCaseManifestSha256(diffTierC.G2B.chapters);
  const rSwapTier = adjudicateSchemes({A: baseA, B: baseB, C: diffTierC}, g2AnchorsFor(baseA));
  assert.equal(rSwapTier.error, 'R3_P0_6_UNEQUAL_EVALUATION_DATASET');
  assert.ok(rSwapTier.mismatchedGates.includes('G2B'));

  // 3. Aggregate-only legacy run (no predictions[]) -> rejected!
  const aggOnlyG6 = makePassingSchemeData().G6;
  aggOnlyG6.runs = [{...makeRunMeta('G6-AGG', 0), chapters: [{chapterId: 'FRESH-G6-CH01', tp: 3, fn: 0, fp: 0, tn: 4, blockerMisses: 0}]}];
  assert.equal(evaluateG6(aggOnlyG6).error, 'R3_P0_6_CASE_PREDICTIONS_REQUIRED');

  // 4. Derived BLOCKER miss on Scheme B in G6 -> auto-counted as blockerMisses=1 and eliminates Scheme B!
  const schemeBBlkMiss = makePassingSchemeData({g6MissMajorCount: 0, g6MissBlocker: true});
  const adjBlk = adjudicateSchemes({A: baseA, B: schemeBBlkMiss, C: makePassingSchemeData()}, g2AnchorsFor(baseA));
  assert.equal(adjBlk.schemes.B.gates.G6.rawCounts.blockerMisses, 1);
  assert.equal(adjBlk.schemes.B.gates.G6.status, 'FAIL');
  assert.equal(adjBlk.eliminations.B?.eliminated, true);
  assert.ok(adjBlk.eliminations.B.reasons.some(r => r.startsWith('SCHEME_B_G6_BLOCKER_MISS:1')));
});

// ============================================================================
// TC-P0-6-R3-3: Exact Frozen K_rep & Exact G4 N_case === 24
// ============================================================================
test('TC-P0-6-R3-3: enforces exact frozen K_rep across G1/G2-A/G2-B/G3/G4 and exact G4 N_case === 24', () => {
  // G1 Track2 K=4 (>3) -> rejected
  const g1K4 = makePassingSchemeData().G1;
  g1K4.track2.runs.push({...structuredClone(g1K4.track2.runs[0]), runId: 'G1-T2-RUN-4'});
  assert.equal(evaluateG1(g1K4).error, 'R3_P0_6_REPEAT_COUNT_EXCEEDS_FROZEN_DESIGN');

  // G1 Regression7 K=2 (>1) -> rejected
  const g1RegK2 = makePassingSchemeData().G1;
  g1RegK2.regression7.runs.push({...structuredClone(g1RegK2.regression7.runs[0]), runId: 'G1-REG7-RUN-2'});
  assert.equal(evaluateG1(g1RegK2).error, 'R3_P0_6_REPEAT_COUNT_EXCEEDS_FROZEN_DESIGN');

  // G2-A K=4 (>3) & G2-B K=4 (>3) -> rejected
  const g2aK4 = makePassingSchemeData().G2A;
  g2aK4.runs.push({...structuredClone(g2aK4.runs[0]), runId: 'G2A-RUN-4'});
  assert.equal(evaluateG2A(g2aK4).error, 'R3_P0_6_REPEAT_COUNT_EXCEEDS_FROZEN_DESIGN');

  const g2bK4 = makePassingSchemeData().G2B;
  g2bK4.runs.push({...structuredClone(g2bK4.runs[0]), runId: 'G2B-RUN-4'});
  assert.equal(evaluateG2B(g2bK4).error, 'R3_P0_6_REPEAT_COUNT_EXCEEDS_FROZEN_DESIGN');

  // G3 K=4 (>3) -> rejected
  const g3K4 = makePassingSchemeData().G3;
  g3K4.runs.push({...structuredClone(g3K4.runs[0]), runId: 'G3-RUN-4'});
  assert.equal(evaluateG3(g3K4).error, 'R3_P0_6_REPEAT_COUNT_EXCEEDS_FROZEN_DESIGN');

  // G4 K=3 (>2) -> rejected
  const g4K3 = makePassingSchemeData().G4;
  g4K3.runs.push({...structuredClone(g4K3.runs[0]), runId: 'G4-RUN-3'});
  assert.equal(evaluateG4(g4K3).error, 'R3_P0_6_REPEAT_COUNT_EXCEEDS_FROZEN_DESIGN');

  // G4 N_case=25 (both declared & actual) -> rejected!
  const g4N25 = makePassingSchemeData().G4;
  g4N25.nCases = 25;
  g4N25.runs.forEach(r => r.pairs.push({caseId: 'G4-CASE-25', sourceChapterId: 'FRESH-G4-SRC1', truth: 'MAJOR', predicted: 'MAJOR'}));
  assert.equal(evaluateG4(g4N25).error, 'R3_P0_6_G4_CASE_COUNT_MUST_BE_EXACT_24');

  // G4 declared nCases=24 vs actual 25 pairs -> rejected!
  const g4Mismatch = makePassingSchemeData().G4;
  g4Mismatch.runs.forEach(r => r.pairs.push({caseId: 'G4-CASE-25', sourceChapterId: 'FRESH-G4-SRC1', truth: 'MAJOR', predicted: 'MAJOR'}));
  assert.equal(evaluateG4(g4Mismatch).error, 'R3_P0_6_G4_CASE_COUNT_MUST_BE_EXACT_24');
});

// ============================================================================
// TC-P0-6-R3-4: Controlled 15-Genre Taxonomy, Per-Genre >=2ch, Budget Ceiling & G5 Evidence Ref
// ============================================================================
test('TC-P0-6-R3-4: enforces controlled 15-genre taxonomy, whitespace normalization, every-genre >=2ch, Fail-Closed G6 budget ceiling, and G5 compatEvidenceRef', () => {
  assert.equal(CANONICAL_GENRES.length, 15);
  assert.equal(normalizeCanonicalGenre(' 科 幻 '), '科幻');
  assert.equal(normalizeCanonicalGenre('不存在的题材'), null);

  // 1. Unclassified chapter in G6 -> INVALID_OR_MISSING_GENRE
  const g6MissingGenre = makePassingSchemeData().G6;
  delete g6MissingGenre.chapters[0].genre;
  assert.equal(evaluateG6(g6MissingGenre).error, 'R3_P0_6_INVALID_OR_MISSING_GENRE');

  // 2. Non-canonical genre in G2-B -> INVALID_OR_MISSING_GENRE
  const g2bBadGenre = makePassingSchemeData().G2B;
  g2bBadGenre.chapters[0].genre = '自定义乱填流';
  assert.equal(evaluateG2B(g2bBadGenre).error, 'R3_P0_6_INVALID_OR_MISSING_GENRE');

  // 3. Whitespace trick ('科幻' vs '科幻 ') in G2-B cannot inflate 2 genres into 3 genres!
  const g2bWsTrick = makePassingSchemeData().G2B;
  g2bWsTrick.chapters.forEach((c, i) => { c.genre = i % 3 === 0 ? '科幻' : (i % 3 === 1 ? '科幻 ' : '历史'); });
  g2bWsTrick.manifestSha256 = computeCaseManifestSha256(g2bWsTrick.chapters);
  g2bWsTrick.positiveCohortApprovedManifestSha256 = g2bWsTrick.manifestSha256;
  const rWs = evaluateG2B(g2bWsTrick, {expectedG2BManifestSha256: g2bWsTrick.manifestSha256});
  assert.equal(rWs.status, 'UNDERPOWERED');
  assert.deepEqual(rWs.sampleTriplet.genres, ['历史', '科幻']);

  // 4. G6 with 5 genres where the 5th genre ('仙侠') only has 1 chapter -> UNDERPOWERED (every genre must have >=2 ch!)
  const g6SingleGenreCh = makePassingSchemeData().G6;
  g6SingleGenreCh.chapters[11].genre = '仙侠'; // leaves 3 genres with 3ch, 1 genre with 2ch, and '仙侠' with 1ch!
  const rUnderRep = evaluateG6(g6SingleGenreCh);
  assert.equal(rUnderRep.status, 'UNDERPOWERED');
  assert.ok(rUnderRep.gaps.some(g => g.includes('仙侠(1)')));

  // 5. G6 exceeding frozen budget (17 chapters > 16): Fail-Closed without approval; passes ONLY with strict boolean + approvalRef!
  const overBudgetA = makePassingSchemeData();
  const genres4 = ['悬疑', '历史', '科幻', '都市'];
  for (let i = 12; i < 17; i++) {
    const ch = {
      chapterId: `FRESH-G6-CH${String(i + 1).padStart(2, '0')}`,
      sourceChapterId: `SRC-G6-NOVEL${(i % 4) + 1}-CH${String(i + 1).padStart(2, '0')}`,
      genre: genres4[i % 4],
      positives: 3,
      negatives: 4,
      contentSha256: `c${String(i + 1).padStart(63, '0')}`,
      cases: [
        {caseId: `G6-CH${i + 1}-B1`, truthClass: 'BLOCKER'},
        {caseId: `G6-CH${i + 1}-M1`, truthClass: 'MAJOR'},
        {caseId: `G6-CH${i + 1}-M2`, truthClass: 'MAJOR'},
        {caseId: `G6-CH${i + 1}-N1`, truthClass: 'NON_BLOCKING', tier: 'CLEAR'},
        {caseId: `G6-CH${i + 1}-N2`, truthClass: 'NON_BLOCKING', tier: 'CLEAR'},
        {caseId: `G6-CH${i + 1}-N3`, truthClass: 'NON_BLOCKING', tier: 'BORDERLINE'},
        {caseId: `G6-CH${i + 1}-N4`, truthClass: 'NON_BLOCKING', tier: 'BORDERLINE'},
      ],
    };
    overBudgetA.G6.chapters.push(ch);
    ch.cases.forEach(c => {
      overBudgetA.G6.runs[0].predictions.push({
        caseId: c.caseId,
        predictedBlocking: c.truthClass !== 'NON_BLOCKING',
      });
    });
  }
  const rUnapproved = adjudicateSchemes(
    {
      A: overBudgetA,
      B: structuredClone(overBudgetA),
      C: structuredClone(overBudgetA),
    },
    g2AnchorsFor(overBudgetA)
  );
  assert.equal(rUnapproved.ok, false);
  assert.equal(rUnapproved.exitCode, 2);
  assert.equal(rUnapproved.error, 'R3_P0_6_G6_BUDGET_EXCEEDED_UNAPPROVED');
  assert.equal(rUnapproved.winner, null);

  const rApproved = adjudicateSchemes(
    {A: overBudgetA, B: structuredClone(overBudgetA), C: structuredClone(overBudgetA)},
    {...g2AnchorsFor(overBudgetA), g6BudgetExpansionApproved: true, g6BudgetApprovalRef: 'AUTHOR-G6-BUDGET-2026-001'}
  );
  assert.equal(rApproved.verdict, 'GO_CANDIDATE_SELECTED');
  assert.equal(rApproved.schemes.A.gates.G6.budgetStatus, 'EXCEEDS_FROZEN_BUDGET_APPROVED');
  assert.equal(rApproved.schemes.A.gates.G6.budgetApprovalRef, 'AUTHOR-G6-BUDGET-2026-001');

  // 6. G5 without compatEvidenceRef MUST fail (no bare boolean pass!)
  const g5NoRef = makePassingSchemeData().G5;
  delete g5NoRef.compatEvidenceRef;
  assert.equal(evaluateG5(g5NoRef).status, 'FAIL');
});

// ============================================================================
// TC-P0-6-R4-1: Item 1 — G6 Strict Boolean g6BudgetExpansionApproved === true & Approval Ref
// ============================================================================
test('TC-P0-6-R4-1: evaluateG6 rejects non-boolean truthy budget approval ("false", 1, {}) and requires traceable g6BudgetApprovalRef', () => {
  const overG6 = makePassingSchemeData().G6;
  const extraCh = {
    chapterId: 'FRESH-G6-CH13',
    sourceChapterId: 'SRC-G6-NOVEL5-CH13',
    genre: '悬疑',
    positives: 3,
    negatives: 4,
    contentSha256: `c${'13'.padStart(63, '0')}`,
    cases: [
      {caseId: 'G6-CH13-B1', truthClass: 'BLOCKER'},
      {caseId: 'G6-CH13-M1', truthClass: 'MAJOR'},
      {caseId: 'G6-CH13-M2', truthClass: 'MAJOR'},
      {caseId: 'G6-CH13-N1', truthClass: 'NON_BLOCKING', tier: 'CLEAR'},
      {caseId: 'G6-CH13-N2', truthClass: 'NON_BLOCKING', tier: 'CLEAR'},
      {caseId: 'G6-CH13-N3', truthClass: 'NON_BLOCKING', tier: 'BORDERLINE'},
      {caseId: 'G6-CH13-N4', truthClass: 'NON_BLOCKING', tier: 'BORDERLINE'},
    ],
  };
  // Push 5 extra chapters (total 17 > 16)
  for (let i = 13; i <= 17; i++) {
    const ch = structuredClone(extraCh);
    ch.chapterId = `FRESH-G6-CH${i}`;
    ch.sourceChapterId = `SRC-G6-NOVEL5-CH${i}`;
    ch.contentSha256 = `d${String(i).padStart(63, '0')}`;
    ch.cases.forEach(c => { c.caseId = c.caseId.replace('CH13', `CH${i}`); });
    overG6.chapters.push(ch);
    ch.cases.forEach(c => {
      overG6.runs[0].predictions.push({caseId: c.caseId, predictedBlocking: c.truthClass !== 'NON_BLOCKING'});
    });
  }

  for (const badVal of ['false', 'true', 1, {}, ['true']]) {
    const res = evaluateG6(overG6, {g6BudgetExpansionApproved: badVal, g6BudgetApprovalRef: 'AUTHOR-REF'});
    assert.equal(res.status, 'INVALID_DESIGN');
    assert.equal(res.exitCode, 2);
    assert.equal(res.error, 'R3_P0_6_G6_BUDGET_EXCEEDED_UNAPPROVED');
  }

  // Strictly true boolean WITHOUT approvalRef -> rejected!
  const noRefRes = evaluateG6(overG6, {g6BudgetExpansionApproved: true});
  assert.equal(noRefRes.status, 'INVALID_DESIGN');
  assert.equal(noRefRes.exitCode, 2);
  assert.equal(noRefRes.error, 'R3_P0_6_G6_BUDGET_APPROVAL_REF_REQUIRED');

  // Strictly true boolean WITH traceable approvalRef -> PASS!
  const okRes = evaluateG6(overG6, {g6BudgetExpansionApproved: true, g6BudgetApprovalRef: 'AUTHOR-G6-EXP-2026'});
  assert.equal(okRes.status, 'PASS');
  assert.equal(okRes.budgetStatus, 'EXCEEDS_FROZEN_BUDGET_APPROVED');
  assert.equal(okRes.budgetApprovalRef, 'AUTHOR-G6-EXP-2026');
});

// ============================================================================
// TC-P0-6-R4-2: Item 2 — K_rep Protocol Run Provenance (Unique runId, executionEvidenceRef, model/config)
// ============================================================================
test('TC-P0-6-R4-2: K_rep rejects missing/duplicate runId, cloned runs, missing executionEvidenceRef or model/config, while allowing identical predictions across distinct runs', () => {
  // 1. Missing runId -> R3_P0_6_RUN_ID_REQUIRED
  const g1NoRunId = makePassingSchemeData().G1;
  delete g1NoRunId.track2.runs[1].runId;
  assert.equal(evaluateG1(g1NoRunId).error, 'R3_P0_6_RUN_ID_REQUIRED');

  // 2. Cloning the exact same run object 3 times to fake K=3 -> R3_P0_6_DUPLICATE_RUN_ID
  const g2bCloned = makePassingSchemeData().G2B;
  g2bCloned.runs = [g2bCloned.runs[0], structuredClone(g2bCloned.runs[0]), structuredClone(g2bCloned.runs[0])];
  assert.equal(evaluateG2B(g2bCloned).error, 'R3_P0_6_DUPLICATE_RUN_ID');

  // 3. Duplicate runId in G4 -> R3_P0_6_DUPLICATE_RUN_ID
  const g4Dup = makePassingSchemeData().G4;
  g4Dup.runs[1].runId = g4Dup.runs[0].runId;
  assert.equal(evaluateG4(g4Dup).error, 'R3_P0_6_DUPLICATE_RUN_ID');

  // 4. Missing executionEvidenceRef in G3 -> R3_P0_6_EXECUTION_EVIDENCE_REF_REQUIRED
  const g3NoRef = makePassingSchemeData().G3;
  delete g3NoRef.runs[2].executionEvidenceRef;
  assert.equal(evaluateG3(g3NoRef).error, 'R3_P0_6_EXECUTION_EVIDENCE_REF_REQUIRED');

  // 5. Missing modelId / configVersion in G6 -> R3_P0_6_RUN_MODEL_CONFIG_REQUIRED
  const g6NoModel = makePassingSchemeData().G6;
  delete g6NoModel.runs[0].modelId;
  assert.equal(evaluateG6(g6NoModel).error, 'R3_P0_6_RUN_MODEL_CONFIG_REQUIRED');

  // 6. Identical predictions across 3 distinct valid runIds MUST PASS (authentic independent runs can agree!)
  const g2bIdenticalPreds = makePassingSchemeData({g2bRunFpCounts: [2, 2, 2]}).G2B;
  assert.deepEqual(g2bIdenticalPreds.runs[0].predictions, g2bIdenticalPreds.runs[1].predictions);
  const okIdentical = evaluateG2B(g2bIdenticalPreds, {expectedG2BManifestSha256: g2bIdenticalPreds.manifestSha256});
  assert.equal(okIdentical.status, 'PASS');
  assert.equal(okIdentical.runProvenanceBoundary, 'protocol_metadata_only_does_not_prove_host_execution_independence');
});

// ============================================================================
// TC-P0-6-R4-3: Item 3 — G2-A Exact Frozen 9ch/40pos/33neg + Manifest Hash Pinning & G2-B Author Approval Gate
// ============================================================================
test('TC-P0-6-R4-3: G2-A locks exact 9ch/40pos/33neg & manifest SHA-256 pinning; G2-B requires Stage 1B author positive-cohort approval', () => {
  // 1. G2-A with 41 positives (mutated from frozen 40) -> R3_P0_6_G2A_FROZEN_SAMPLE_COUNT_MISMATCH
  const g2a41Pos = makePassingSchemeData().G2A;
  g2a41Pos.chapters[0].cases.push({caseId: 'G2A-CH01-EXTRA-POS', truthClass: 'MAJOR'});
  g2a41Pos.chapters[0].positives += 1;
  g2a41Pos.manifestSha256 = computeCaseManifestSha256(g2a41Pos.chapters);
  g2a41Pos.runs.forEach(r => r.predictions.push({caseId: 'G2A-CH01-EXTRA-POS', predictedBlocking: true}));
  assert.equal(
    evaluateG2A(g2a41Pos, {expectedG2AManifestSha256: g2a41Pos.manifestSha256}).error,
    'R3_P0_6_G2A_FROZEN_SAMPLE_COUNT_MISMATCH'
  );

  // 2. G2-A with missing manifestVersion -> R3_P0_6_MANIFEST_VERSION_REQUIRED
  const g2aNoVer = makePassingSchemeData().G2A;
  delete g2aNoVer.manifestVersion;
  assert.equal(evaluateG2A(g2aNoVer, {expectedG2AManifestSha256: g2aNoVer.manifestSha256}).error, 'R3_P0_6_MANIFEST_VERSION_REQUIRED');

  // 3. G2-A with stale/tampered manifestSha256 -> R3_P0_6_MANIFEST_HASH_MISMATCH
  const g2aBadHash = makePassingSchemeData().G2A;
  g2aBadHash.manifestSha256 = 'a'.repeat(64);
  assert.equal(evaluateG2A(g2aBadHash, {expectedG2AManifestSha256: 'a'.repeat(64)}).error, 'R3_P0_6_MANIFEST_HASH_MISMATCH');

  // 4. G2-A with mismatched expectedG2AManifestSha256 baseline pin -> R3_P0_6_MANIFEST_HASH_MISMATCH
  const g2aValid = makePassingSchemeData().G2A;
  assert.equal(evaluateG2A(g2aValid, {expectedG2AManifestSha256: 'b'.repeat(64)}).error, 'R3_P0_6_MANIFEST_HASH_MISMATCH');
  assert.equal(evaluateG2A(g2aValid, {expectedG2AManifestSha256: g2aValid.manifestSha256}).status, 'PASS');

  // 5. G2-B without author Stage 1B positive cohort approval (or non-boolean truthy "true"/1) -> R3_P0_6_G2B_POSITIVE_COHORT_UNAPPROVED
  for (const badApproval of [false, undefined, 'true', 1, {}]) {
    const g2bUnapproved = makePassingSchemeData().G2B;
    g2bUnapproved.positiveCohortApproved = badApproval;
    assert.equal(
      evaluateG2B(g2bUnapproved, {expectedG2BManifestSha256: g2bUnapproved.manifestSha256}).error,
      'R3_P0_6_G2B_POSITIVE_COHORT_UNAPPROVED'
    );
  }
  const g2bNoRef = makePassingSchemeData().G2B;
  delete g2bNoRef.positiveCohortApprovalRef;
  assert.equal(
    evaluateG2B(g2bNoRef, {expectedG2BManifestSha256: g2bNoRef.manifestSha256}).error,
    'R3_P0_6_G2B_POSITIVE_COHORT_UNAPPROVED'
  );
});

// ============================================================================
// TC-P0-6-R4-4: Items 4–5 — Unified G3/G4/G5 Historical Exposure Aggregation, G3 Source Dedup & G5 Required Keys
// ============================================================================
test('TC-P0-6-R4-4: auto-aggregates G3/G4/G5 into refAll anti-leakage, deduplicates G3 sourceChapterId, and enforces G5 s1CompatTest + engFixP1Test keys', () => {
  // 1. G2-B reusing a G4 sourceChapterId (even without external referenceChapters!) -> LEAKAGE_REJECTED
  const leakFromG4 = makePassingSchemeData();
  leakFromG4.G2B.chapters[0].sourceChapterId = leakFromG4.G4.sourceChapters[0];
  leakFromG4.G2B.manifestSha256 = computeCaseManifestSha256(leakFromG4.G2B.chapters);
  const resLeakG4 = evaluateSchemeG1ToG6('A', leakFromG4, g2AnchorsFor(leakFromG4));
  assert.equal(resLeakG4.status, 'LEAKAGE_REJECTED');
  assert.equal(resLeakG4.error, 'R3_P0_6_DATA_LEAKAGE_DETECTED');
  assert.ok(resLeakG4.historicalExposureSummary.includedGates.includes('G4'));

  // 2. G6 reusing a G5 deadlock chapter -> LEAKAGE_REJECTED
  const leakFromG5 = makePassingSchemeData();
  leakFromG5.G6.chapters[0].sourceChapterId = leakFromG5.G5.deadlockCases[0].chapterId;
  const resLeakG5 = evaluateSchemeG1ToG6('A', leakFromG5, g2AnchorsFor(leakFromG5));
  assert.equal(resLeakG5.status, 'LEAKAGE_REJECTED');
  assert.equal(resLeakG5.error, 'R3_P0_6_DATA_LEAKAGE_DETECTED');

  // 3. G6 reusing a G3 sourceChapterId -> LEAKAGE_REJECTED
  const leakFromG3 = makePassingSchemeData();
  leakFromG3.G6.chapters[0].sourceChapterId = leakFromG3.G3.chapters[0].sourceChapterId;
  const resLeakG3 = evaluateSchemeG1ToG6('A', leakFromG3, g2AnchorsFor(leakFromG3));
  assert.equal(resLeakG3.status, 'LEAKAGE_REJECTED');
  assert.equal(resLeakG3.error, 'R3_P0_6_DATA_LEAKAGE_DETECTED');

  // 4. G3 with 10 Arm x Chapter instances mapped to ONLY 3 unique sourceChapterIds (QHL-CH1..3) -> UNDERPOWERED (nCh=3 < 10)!
  const g3ArmMapped = makePassingSchemeData().G3;
  g3ArmMapped.chapters.forEach((ch, idx) => { ch.sourceChapterId = `STORY-SRC-${(idx % 3) + 1}`; });
  const rG3Dedup = evaluateG3(g3ArmMapped);
  assert.equal(rG3Dedup.status, 'UNDERPOWERED');
  assert.equal(rG3Dedup.sampleTriplet.nCh, 3);
  assert.equal(rG3Dedup.sampleTriplet.chapterInstances, 10);

  // 5. G5 rejecting arbitrary bogus key `{fake: 'x'}` or missing either required anchor (`s1CompatTest` / `engFixP1Test`)
  const g5Fake = makePassingSchemeData().G5;
  g5Fake.compatEvidenceRef = {fake: 'x'};
  assert.equal(evaluateG5(g5Fake).status, 'FAIL');

  const g5OnlyS1 = makePassingSchemeData().G5;
  g5OnlyS1.compatEvidenceRef = {s1CompatTest: 'scripts/tests/r3_s1_severity_compat.test.mjs'};
  assert.equal(evaluateG5(g5OnlyS1).status, 'FAIL');

  const g5Ok = evaluateG5(makePassingSchemeData().G5);
  assert.equal(g5Ok.status, 'PASS');
  assert.equal(g5Ok.compatEvidenceAnchorNote, 'reproducible_test_path_anchor_only_not_ci_execution_proof');
});

// ============================================================================
// TC-P0-6-R5-1: Round 4 Blocking 1 — G3 Mandatory sourceChapterId (No Fallback Inflation)
// ============================================================================
test('TC-P0-6-R5-1: G3 rejects omitted sourceChapterId on 10 chapters (INVALID_DESIGN) while preserving 3-source UNDERPOWERED and explicit independent PASS', () => {
  // 1. 10 distinct chapterIds with omitted sourceChapterId -> INVALID_DESIGN (cannot bypass dedup!)
  const g3NoSource = makePassingSchemeData().G3;
  g3NoSource.chapters.forEach(ch => { delete ch.sourceChapterId; });
  const rNoSrc = evaluateG3(g3NoSource);
  assert.equal(rNoSrc.status, 'INVALID_DESIGN');
  assert.equal(rNoSrc.exitCode, 2);
  assert.equal(rNoSrc.error, 'R3_P0_6_G3_SOURCE_CHAPTER_REQUIRED');

  // 2. Even 1 chapter missing sourceChapterId -> INVALID_DESIGN
  const g3OneMissing = makePassingSchemeData().G3;
  delete g3OneMissing.chapters[5].sourceChapterId;
  assert.equal(evaluateG3(g3OneMissing).error, 'R3_P0_6_G3_SOURCE_CHAPTER_REQUIRED');

  // 3. 10 chapters explicitly mapped to 3 story sources -> UNDERPOWERED (nCh=3)
  const g3ThreeSrc = makePassingSchemeData().G3;
  g3ThreeSrc.chapters.forEach((ch, idx) => { ch.sourceChapterId = `QHL-SRC-${(idx % 3) + 1}`; });
  const r3Src = evaluateG3(g3ThreeSrc);
  assert.equal(r3Src.status, 'UNDERPOWERED');
  assert.equal(r3Src.sampleTriplet.nCh, 3);

  // 4. 10 chapters explicitly setting sourceChapterId === chapterId -> PASS
  const g3ExplicitSelf = makePassingSchemeData().G3;
  g3ExplicitSelf.chapters.forEach(ch => { ch.sourceChapterId = ch.chapterId; });
  const rSelf = evaluateG3(g3ExplicitSelf);
  assert.equal(rSelf.status, 'PASS');
  assert.equal(rSelf.sampleTriplet.nCh, 10);
});

// ============================================================================
// TC-P0-6-R5-2: Round 4 Blocking 2 — Mandatory Out-of-Band Pre-Frozen Manifest SHA-256 (G2-A & G2-B, API & CLI)
// ============================================================================
test('TC-P0-6-R5-2: official K=3 G2-A & G2-B require out-of-band external pre-frozen manifest SHA-256 across API & CLI and bind G2-B approval', t => {
  const baseA = makePassingSchemeData();
  const baseB = makePassingSchemeData();
  const baseC = makePassingSchemeData();

  // 1. Official K=3 evaluateG2A / evaluateG2B WITHOUT external expected hash -> R3_P0_6_EXPECTED_MANIFEST_HASH_REQUIRED
  assert.equal(evaluateG2A(baseA.G2A).error, 'R3_P0_6_EXPECTED_MANIFEST_HASH_REQUIRED');
  assert.equal(evaluateG2B(baseA.G2B).error, 'R3_P0_6_EXPECTED_MANIFEST_HASH_REQUIRED');

  // 2. evaluateSchemeG1ToG6 & adjudicateSchemes missing EITHER G2-A or G2-B external hash -> rejected!
  assert.equal(
    evaluateSchemeG1ToG6('A', baseA, {expectedG2AManifestSha256: baseA.G2A.manifestSha256}).error,
    'R3_P0_6_EXPECTED_MANIFEST_HASH_REQUIRED'
  );
  assert.equal(
    adjudicateSchemes({A: baseA, B: baseB, C: baseC}, {expectedG2AManifestSha256: baseA.G2A.manifestSha256}).error,
    'R3_P0_6_EXPECTED_MANIFEST_HASH_REQUIRED'
  );
  assert.equal(
    adjudicateSchemes({A: baseA, B: baseB, C: baseC}, {expectedG2BManifestSha256: baseA.G2B.manifestSha256}).error,
    'R3_P0_6_EXPECTED_MANIFEST_HASH_REQUIRED'
  );

  // 3. Tampering cases[] AND recomputing internal manifestSha256 in-band STILL fails against pre-frozen external anchor
  //    for BOTH G2-A (symmetric check) and G2-B!
  const preFrozenG2A = baseA.G2A.manifestSha256;
  const preFrozenG2B = baseA.G2B.manifestSha256;

  const tamperedG2A = makePassingSchemeData().G2A;
  tamperedG2A.chapters[0].cases[0].caseId = 'G2A-CH01-POS1-TAMPERED';
  tamperedG2A.manifestSha256 = computeCaseManifestSha256(tamperedG2A.chapters); // recomputed in-band!
  tamperedG2A.runs.forEach(r => { r.predictions[0].caseId = 'G2A-CH01-POS1-TAMPERED'; });
  assert.equal(
    evaluateG2A(tamperedG2A, {expectedG2AManifestSha256: preFrozenG2A}).error,
    'R3_P0_6_MANIFEST_HASH_MISMATCH'
  );

  const tamperedG2B = makePassingSchemeData().G2B;
  tamperedG2B.chapters[0].cases[0].caseId = 'G2B-CH01-POS1-TAMPERED';
  tamperedG2B.manifestSha256 = computeCaseManifestSha256(tamperedG2B.chapters); // recomputed in-band!
  tamperedG2B.positiveCohortApprovedManifestSha256 = tamperedG2B.manifestSha256;
  tamperedG2B.runs.forEach(r => { r.predictions[0].caseId = 'G2B-CH01-POS1-TAMPERED'; });
  assert.equal(
    evaluateG2B(tamperedG2B, {expectedG2BManifestSha256: preFrozenG2B}).error,
    'R3_P0_6_MANIFEST_HASH_MISMATCH'
  );

  // 4. Valid pre-frozen external anchors + verified approval hash -> GO_CANDIDATE_SELECTED with verified binding
  const okAdj = adjudicateSchemes(
    {A: baseA, B: baseB, C: baseC},
    {expectedG2AManifestSha256: preFrozenG2A, expectedG2BManifestSha256: preFrozenG2B}
  );
  assert.equal(okAdj.verdict, 'GO_CANDIDATE_SELECTED');
  assert.deepEqual(okAdj.schemes.A.gates.G2B.positiveCohortApprovalBinding, {
    approvalRef: 'STAGE-1B-TEST-APPROVAL-REF',
    manifestVersion: 'stage-1b-synthetic-g2b-v1',
    approvedManifestSha256: preFrozenG2B,
    verificationScope: 'stage_1a_declared_hash_matched_external_anchor_not_stage_1b_archive_custody',
  });

  // 5. CLI rejects official K=3 payload if external hash flags are omitted, EVEN IF embedded inside the JSON payload!
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p06-r5-cli-'));
  t.after(() => fs.rmSync(tmpDir, {recursive: true, force: true}));
  const inFile = path.join(tmpDir, 'payload.json');
  fs.writeFileSync(
    inFile,
    JSON.stringify({
      expectedG2AManifestSha256: preFrozenG2A,
      expectedG2BManifestSha256: preFrozenG2B,
      schemes: {A: baseA, B: baseB, C: baseC},
    }),
    'utf8'
  );
  const cliNoFlags = spawnSync(process.execPath, [EVAL_CLI, 'evaluate', '--input', inFile], {encoding: 'utf8'});
  assert.equal(cliNoFlags.status, 2);
  assert.equal(JSON.parse(cliNoFlags.stdout).error, 'R3_P0_6_EXPECTED_MANIFEST_HASH_REQUIRED');

  // With out-of-band CLI flags -> exit 0 & GO_CANDIDATE_SELECTED!
  const cliWithFlags = spawnSync(
    process.execPath,
    [
      EVAL_CLI,
      'evaluate',
      '--input',
      inFile,
      '--expected-g2a-manifest-sha256',
      preFrozenG2A,
      '--expected-g2b-manifest-sha256',
      preFrozenG2B,
    ],
    {encoding: 'utf8'}
  );
  assert.equal(cliWithFlags.status, 0, cliWithFlags.stderr);
  assert.equal(JSON.parse(cliWithFlags.stdout).verdict, 'GO_CANDIDATE_SELECTED');
});

// ============================================================================
// TC-P0-6-R6-1: Round 5 Blocking 1 — Mandatory G2-B positiveCohortApprovedManifestSha256 Binding
// ============================================================================
test('TC-P0-6-R6-1: G2-B official K=3 requires valid 64-hex positiveCohortApprovedManifestSha256 matching frozen manifest & external anchor (K=0 readiness unaffected)', () => {
  const preFrozenG2B = makePassingSchemeData().G2B.manifestSha256;

  // 1. Missing positiveCohortApprovedManifestSha256 -> R3_P0_6_G2B_APPROVAL_MANIFEST_HASH_REQUIRED
  const g2bMissingApprovalHash = makePassingSchemeData().G2B;
  delete g2bMissingApprovalHash.positiveCohortApprovedManifestSha256;
  const rMissing = evaluateG2B(g2bMissingApprovalHash, {expectedG2BManifestSha256: preFrozenG2B});
  assert.equal(rMissing.status, 'INVALID_DESIGN');
  assert.equal(rMissing.exitCode, 2);
  assert.equal(rMissing.error, 'R3_P0_6_G2B_APPROVAL_MANIFEST_HASH_REQUIRED');
  assert.equal(rMissing.positiveCohortApprovalBinding, undefined);

  // 2. Empty or non-64-hex positiveCohortApprovedManifestSha256 -> R3_P0_6_G2B_APPROVAL_MANIFEST_HASH_REQUIRED
  for (const badHash of ['', '   ', 'not-a-hex64', 'g'.repeat(64)]) {
    const g2bMalformed = makePassingSchemeData().G2B;
    g2bMalformed.positiveCohortApprovedManifestSha256 = badHash;
    const rBad = evaluateG2B(g2bMalformed, {expectedG2BManifestSha256: preFrozenG2B});
    assert.equal(rBad.status, 'INVALID_DESIGN');
    assert.equal(rBad.exitCode, 2);
    assert.equal(rBad.error, 'R3_P0_6_G2B_APPROVAL_MANIFEST_HASH_REQUIRED');
  }

  // 3. Valid 64-hex format but mismatched against frozen manifest / external anchor -> R3_P0_6_MANIFEST_HASH_MISMATCH
  const g2bMismatch = makePassingSchemeData().G2B;
  g2bMismatch.positiveCohortApprovedManifestSha256 = 'e'.repeat(64);
  const rMismatch = evaluateG2B(g2bMismatch, {expectedG2BManifestSha256: preFrozenG2B});
  assert.equal(rMismatch.status, 'INVALID_DESIGN');
  assert.equal(rMismatch.exitCode, 2);
  assert.equal(rMismatch.error, 'R3_P0_6_MANIFEST_HASH_MISMATCH');

  // 4. Matching positiveCohortApprovedManifestSha256 -> PASS and emits verified binding object
  const g2bOk = makePassingSchemeData().G2B;
  const rOk = evaluateG2B(g2bOk, {expectedG2BManifestSha256: preFrozenG2B});
  assert.equal(rOk.status, 'PASS');
  assert.equal(rOk.positiveCohortApprovalBinding.approvedManifestSha256, preFrozenG2B);
  assert.equal(rOk.positiveCohortApprovalBinding.approvalRef, g2bOk.positiveCohortApprovalRef);

  // 5. K=0 readiness audit without any approval hash remains UNDERPOWERED (never requires forged hash)
  const rReadiness = evaluateG2B({chapters: [], runs: []});
  assert.equal(rReadiness.status, 'UNDERPOWERED');
  assert.equal(rReadiness.positiveCohortApprovalBinding, undefined);
});
