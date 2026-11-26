import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

import {
  PRECHECK_SCHEMA_VERSION,
  precheckChapterV2,
  extractBodyParagraphs,
  checkQuotesWithChineseMultiParaWhitelist,
} from '../precheck_v2_common.mjs';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PRECHECK_CLI = path.join(REPO_ROOT, 'scripts/precheck_chapter.mjs');

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function makeTempProject(t, {plan = null, chapters = {}, extraFiles = {}} = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'r3-precheck-v2-'));
  t.after(() => fs.rmSync(dir, {recursive: true, force: true}));

  for (const [rel, content] of Object.entries(chapters)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), {recursive: true});
    if (Buffer.isBuffer(content)) {
      fs.writeFileSync(abs, content);
    } else {
      fs.writeFileSync(abs, content, 'utf8');
    }
  }

  for (const [rel, content] of Object.entries(extraFiles)) {
    const abs = path.join(dir, rel);
    fs.mkdirSync(path.dirname(abs), {recursive: true});
    if (Buffer.isBuffer(content)) {
      fs.writeFileSync(abs, content);
    } else {
      fs.writeFileSync(abs, typeof content === 'string' ? content : JSON.stringify(content, null, 2) + '\n', 'utf8');
    }
  }

  if (plan !== null) {
    const planText = typeof plan === 'string' ? plan : JSON.stringify(plan, null, 2) + '\n';
    fs.writeFileSync(path.join(dir, '02-写作计划.json'), planText, 'utf8');
  }

  return dir;
}

function makeProseOfChineseWords(targetChars, seedSentence = '江风拂过青石码头，潮声在石阶下轻拍不息，货栈灯火映出长长人影。') {
  const seedChineseLen = (seedSentence.match(/[\u4e00-\u9fff]/g) || []).length;
  const paragraphs = [];
  let acc = 0;
  let paraIdx = 0;
  while (acc < targetChars) {
    const sentences = [];
    const perPara = 6;
    for (let i = 0; i < perPara && acc < targetChars; i++) {
      // Vary slightly per paragraph so we don't trigger accidental duplicate-paragraph warnings
      const tag = `第${paraIdx + 1}节第${i + 1}刻，`;
      const s = tag + seedSentence;
      const len = (s.match(/[\u4e00-\u9fff]/g) || []).length;
      if (acc + len > targetChars) {
        const needed = targetChars - acc;
        const rawChars = [...s].filter(c => /[\u4e00-\u9fff]/.test(c)).slice(0, needed).join('');
        sentences.push(rawChars + '。');
        acc += needed;
      } else {
        sentences.push(s);
        acc += len;
      }
    }
    paragraphs.push(sentences.join(''));
    paraIdx++;
  }
  return '# 第1章 码头夜雾\n\n' + paragraphs.join('\n\n') + '\n';
}

function snapshotTreeManifest(dir) {
  const entries = [];
  function walk(curr, relBase) {
    const names = fs.readdirSync(curr).sort();
    for (const name of names) {
      const abs = path.join(curr, name);
      const rel = relBase ? `${relBase}/${name}` : name;
      const st = fs.lstatSync(abs);
      if (st.isDirectory()) {
        entries.push(`D:${rel}`);
        walk(abs, rel);
      } else if (st.isSymbolicLink()) {
        entries.push(`L:${rel}->${fs.readlinkSync(abs)}`);
      } else {
        const bytes = fs.readFileSync(abs);
        entries.push(`F:${rel}:${bytes.length}:${sha256(bytes)}`);
      }
    }
  }
  walk(dir, '');
  return entries.join('\n');
}

// ============================================================================
// TC-P0-3-1: 工程文件破损阻断 (missing / 0-byte / empty / binary / invalid UTF-8 / unsafe path / finalized tamper)
// ============================================================================
test('TC-P0-3-1: engineering file integrity failures always enter hardErrors with blocking=true', t => {
  // 1. Missing manuscript file
  const missingDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [{chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md'}],
    },
  });
  const resMissing = precheckChapterV2(missingDir, 1);
  assert.equal(resMissing.schemaVersion, PRECHECK_SCHEMA_VERSION);
  assert.equal(resMissing.chapter, 1);
  assert.equal(resMissing.manuscriptSha256, null);
  assert.equal(resMissing.blocking, true);
  assert.ok(resMissing.hardErrors.some(e => e.code === 'MANUSCRIPT_MISSING'));

  // 2. 0-byte empty file
  const zeroDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [{chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md'}],
    },
    chapters: {'chapters/ch001.md': Buffer.alloc(0)},
  });
  const resZero = precheckChapterV2(zeroDir, 1);
  assert.equal(resZero.blocking, true);
  assert.ok(resZero.hardErrors.some(e => e.code === 'MANUSCRIPT_EMPTY_FILE'));

  // 3. Title-only empty content
  const titleOnlyDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [{chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md'}],
    },
    chapters: {'chapters/ch001.md': '# 第1章 空稿\n\n   \n'},
  });
  const resTitleOnly = precheckChapterV2(titleOnlyDir, 1);
  assert.equal(resTitleOnly.blocking, true);
  assert.ok(resTitleOnly.hardErrors.some(e => e.code === 'MANUSCRIPT_EMPTY_CONTENT'));

  // 4. Null-byte binary pollution
  const binDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [{chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md'}],
    },
    chapters: {
      'chapters/ch001.md': Buffer.concat([Buffer.from('# 第1章\n\n正常正文', 'utf8'), Buffer.from([0x00, 0x01]), Buffer.from('后续', 'utf8')]),
    },
  });
  const resBin = precheckChapterV2(binDir, 1);
  assert.equal(resBin.blocking, true);
  assert.ok(resBin.hardErrors.some(e => e.code === 'MANUSCRIPT_BINARY_POLLUTION'));

  // 5. Invalid UTF-8 byte sequence
  const badUtf8Dir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [{chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md'}],
    },
    chapters: {
      'chapters/ch001.md': Buffer.concat([Buffer.from('# 第1章\n\n', 'utf8'), Buffer.from([0xe4, 0xb8, 0xff, 0xfe])]),
    },
  });
  const resBadUtf8 = precheckChapterV2(badUtf8Dir, 1);
  assert.equal(resBadUtf8.blocking, true);
  assert.ok(resBadUtf8.hardErrors.some(e => e.code === 'MANUSCRIPT_INVALID_UTF8'));

  // 6. Path traversal & symlink escape
  const outsideFile = path.join(os.tmpdir(), `r3-outside-${process.pid}-${Date.now()}.md`);
  fs.writeFileSync(outsideFile, '# 外部文件\n\n不应该读取', 'utf8');
  t.after(() => fs.rmSync(outsideFile, {force: true}));

  const escapeDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [
        {chapterNumber: 1, title: '越界路径', filePath: '../outside.md'},
        {chapterNumber: 2, title: '越界软链', filePath: 'chapters/ch002.md'},
      ],
    },
  });
  fs.mkdirSync(path.join(escapeDir, 'chapters'), {recursive: true});
  fs.symlinkSync(outsideFile, path.join(escapeDir, 'chapters/ch002.md'));

  const resTrav = precheckChapterV2(escapeDir, 1);
  assert.equal(resTrav.blocking, true);
  assert.ok(resTrav.hardErrors.some(e => e.code === 'UNSAFE_MANUSCRIPT_PATH'));

  const resSym = precheckChapterV2(escapeDir, 2);
  assert.equal(resSym.blocking, true);
  assert.ok(resSym.hardErrors.some(e => e.code === 'UNSAFE_MANUSCRIPT_PATH'));

  // 7. Corrupt 02-写作计划.json
  const corruptPlanDir = makeTempProject(t, {plan: '{bad json'});
  const resCorrupt = precheckChapterV2(corruptPlanDir, 1);
  assert.equal(resCorrupt.blocking, true);
  assert.ok(resCorrupt.hardErrors.some(e => e.code === 'PLAN_JSON_CORRUPT'));

  // Helper: write a genuine R2 chapter review packet + independent review report matching r2_review_common.mjs
  function createValidR2ChapterReview(projectDir, chNum, chapterText, revision = 1) {
    const chKey = String(chNum);
    const chHash = sha256(Buffer.from(chapterText, 'utf8'));
    const pad = String(chNum).padStart(3, '0');
    const inputRel = `reviews/r2/input-ch${pad}-v${revision}.json`;
    const reviewRel = `reviews/r2/review-ch${pad}-v${revision}.json`;
    const packet = {
      schemaVersion: 1,
      kind: 'chapter',
      end: chNum,
      revision,
      manuscriptHashes: {[chKey]: chHash},
      writers: [{chapter: chNum, runId: `writer-run-${chNum}`, contextId: `writer-ctx-${chNum}`}],
      preparedAt: '2026-11-26T00:00:00.000Z',
    };
    const report = {
      schemaVersion: 1,
      kind: 'chapter',
      end: chNum,
      revision,
      manuscriptHashes: {[chKey]: chHash},
      reviewer: {kind: 'independent_agent', runId: `reviewer-run-${chNum}`, contextId: `reviewer-ctx-${chNum}`},
      decision: 'pass_candidate',
      summary: `第 ${chNum} 章独立审核通过。`,
      issues: [],
    };
    const inputBytes = Buffer.from(JSON.stringify(packet, null, 2) + '\n', 'utf8');
    const reviewBytes = Buffer.from(JSON.stringify(report, null, 2) + '\n', 'utf8');
    fs.mkdirSync(path.join(projectDir, 'reviews/r2'), {recursive: true});
    fs.writeFileSync(path.join(projectDir, inputRel), inputBytes);
    fs.writeFileSync(path.join(projectDir, reviewRel), reviewBytes);
    return {
      status: 'passed',
      revision,
      inputPath: inputRel,
      inputSha256: sha256(inputBytes),
      reviewPath: reviewRel,
      reviewSha256: sha256(reviewBytes),
      manuscriptHashes: {[chKey]: chHash},
    };
  }

  // 8. B1 / B2 / B3 / B4 / B6: Genuine finalized chapter evidence, tampering, Fail-Closed retcon boundary, and rollback
  const ch1Original = makeProseOfChineseWords(3200);
  const ch1Edited = ch1Original + '\n未经完整协议恢复而改动的正文段落。\n';
  const ch2Text = makeProseOfChineseWords(3200);
  const ch3Draft = makeProseOfChineseWords(3200);
  const ch1OrigHash = sha256(Buffer.from(ch1Original, 'utf8'));
  const ch1EditedHash = sha256(Buffer.from(ch1Edited, 'utf8'));
  const ch2Hash = sha256(Buffer.from(ch2Text, 'utf8'));
  const ch3Hash = sha256(Buffer.from(ch3Draft, 'utf8'));

  // 8a. Positive control: genuine R2 review packet + independent pass_candidate report + matching pilotGate -> blocking=false
  const validFinalizedDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [
        {chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md', status: 'completed'},
        {chapterNumber: 2, title: '第二章', filePath: 'chapters/ch002.md', status: 'completed'},
        {chapterNumber: 3, title: '第三章', filePath: 'chapters/ch003.md', status: 'draft'},
      ],
    },
    chapters: {
      'chapters/ch001.md': ch1Original,
      'chapters/ch002.md': ch2Text,
      'chapters/ch003.md': ch3Draft,
    },
  });
  const ch1ValidRec = createValidR2ChapterReview(validFinalizedDir, 1, ch1Original, 1);
  const ch2ValidRec = createValidR2ChapterReview(validFinalizedDir, 2, ch2Text, 1);
  const validPlan = JSON.parse(fs.readFileSync(path.join(validFinalizedDir, '02-写作计划.json'), 'utf8'));
  validPlan.v3 = {
    schemaVersion: 1,
    pilotGate: {
      status: 'passed',
      reviewedChapterHashes: {'1': ch1OrigHash, '2': ch2Hash, '3': ch3Hash},
    },
    r2: {
      schemaVersion: 1,
      chapterReviews: {'1': ch1ValidRec, '2': ch2ValidRec},
      arcReviews: {},
    },
  };
  fs.writeFileSync(path.join(validFinalizedDir, '02-写作计划.json'), JSON.stringify(validPlan, null, 2) + '\n', 'utf8');

  const resValidControl = precheckChapterV2(validFinalizedDir, 3);
  assert.equal(resValidControl.blocking, false, `Valid finalized baseline should pass, got: ${JSON.stringify(resValidControl.hardErrors)}`);
  assert.equal(resValidControl.hardErrors.length, 0);

  // 8b. Tampering finalized Ch 1 on disk -> STALE_REVIEW_AFTER_EDIT (blocking=true)
  fs.writeFileSync(path.join(validFinalizedDir, 'chapters/ch001.md'), ch1Edited, 'utf8');
  const resTamper = precheckChapterV2(validFinalizedDir, 3);
  assert.equal(resTamper.blocking, true);
  assert.ok(resTamper.hardErrors.some(e => e.code === 'STALE_REVIEW_AFTER_EDIT' && e.chapter === 1));

  // 8c. B1/B3/B4: Any forward retcon record (approval-only OR self-declared empty directImpactChapters/fingerprint)
  //     MUST stay Fail-Closed in P0-3 until P0-4 (reviewFingerprint) & P1-4 (analyze_impact + retcon) exist!
  fs.mkdirSync(path.join(validFinalizedDir, 'reviews/r3/retcons'), {recursive: true});
  fs.writeFileSync(
    path.join(validFinalizedDir, 'reviews/r3/retcons/retcon-001-approval.json'),
    JSON.stringify({
      status: 'approved',
      chapter: 1,
      newSha256: ch1EditedHash,
      directImpactChapters: [],
      reviewFingerprint: sha256(Buffer.from('fake-self-reported-fp', 'utf8')),
    }, null, 2),
    'utf8',
  );
  const resRetconBlocked = precheckChapterV2(validFinalizedDir, 3);
  assert.equal(resRetconBlocked.blocking, true, 'Forward retcon record MUST stay Fail-Closed in P0-3');
  assert.ok(resRetconBlocked.hardErrors.some(e => e.reason === 'RETCON_RECOVERY_REQUIRES_P0_4_AND_P1_4'));

  // 8d. Marking retcon rolled_back WITHOUT actually restoring Ch 1 bytes MUST STILL BLOCK!
  fs.writeFileSync(
    path.join(validFinalizedDir, 'reviews/r3/retcons/retcon-001-approval.json'),
    JSON.stringify({status: 'rolled_back', chapter: 1}, null, 2),
    'utf8',
  );
  const resFakeRollback = precheckChapterV2(validFinalizedDir, 3);
  assert.equal(resFakeRollback.blocking, true, 'rolled_back without restoring original bytes MUST still block');
  assert.ok(resFakeRollback.hardErrors.some(e => e.code === 'STALE_REVIEW_AFTER_EDIT' && e.chapter === 1));

  // 8e. Actual rollback to original verified Ch 1 bytes -> unblocks cleanly!
  fs.writeFileSync(path.join(validFinalizedDir, 'chapters/ch001.md'), ch1Original, 'utf8');
  const resRealRollback = precheckChapterV2(validFinalizedDir, 3);
  assert.equal(resRealRollback.blocking, false, `Actual rollback should unblock, got: ${JSON.stringify(resRealRollback.hardErrors)}`);
  assert.equal(resRealRollback.hardErrors.length, 0);

  // 8f. B6: Unreadable reviews/r3/retcons directory MUST Fail-Closed (never treated as empty!)
  const retconsAbs = path.join(validFinalizedDir, 'reviews/r3/retcons');
  fs.chmodSync(retconsAbs, 0o000);
  try {
    const resUnreadableRetcons = precheckChapterV2(validFinalizedDir, 3);
    assert.equal(resUnreadableRetcons.blocking, true, 'Unreadable retcons dir MUST Fail-Closed');
    assert.ok(resUnreadableRetcons.hardErrors.some(e => e.code === 'STALE_REVIEW_AFTER_EDIT' && e.source === 'reviews/r3/retcons'));
  } finally {
    fs.chmodSync(retconsAbs, 0o755);
  }

  // 9. B2 & B5: Fail-Closed against forged passed reviews, self-reviews, missing R2 indices, null records, and deleted mappings
  // 9a. B2: Forged status:passed with ONLY revision + manuscriptHashes (missing inputPath / reviewPath) -> BLOCK!
  const forgedPassedDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [
        {chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md', status: 'completed'},
        {chapterNumber: 2, title: '第二章', filePath: 'chapters/ch002.md', status: 'draft'},
      ],
      v3: {
        r2: {
          schemaVersion: 1,
          chapterReviews: {
            '1': {status: 'passed', revision: 1, manuscriptHashes: {'1': ch1OrigHash}},
          },
        },
      },
    },
    chapters: {'chapters/ch001.md': ch1Original, 'chapters/ch002.md': ch2Text},
  });
  const resForgedPassed = precheckChapterV2(forgedPassedDir, 2);
  assert.equal(resForgedPassed.blocking, true);
  assert.ok(resForgedPassed.hardErrors.some(e => e.reason === 'R2_REVIEW_OR_INPUT_FILE_MISSING'));

  // 9b. B2: Self-review (reviewer.runId === writer.runId) masquerading as status:passed -> BLOCK!
  const selfReviewDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [
        {chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md', status: 'completed'},
        {chapterNumber: 2, title: '第二章', filePath: 'chapters/ch002.md', status: 'draft'},
      ],
    },
    chapters: {'chapters/ch001.md': ch1Original, 'chapters/ch002.md': ch2Text},
  });
  const selfRec = createValidR2ChapterReview(selfReviewDir, 1, ch1Original, 1);
  const badReport = JSON.parse(fs.readFileSync(path.join(selfReviewDir, selfRec.reviewPath), 'utf8'));
  badReport.reviewer.runId = 'writer-run-1';
  const badReportBytes = Buffer.from(JSON.stringify(badReport, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(selfReviewDir, selfRec.reviewPath), badReportBytes);
  selfRec.reviewSha256 = sha256(badReportBytes);
  const selfPlan = JSON.parse(fs.readFileSync(path.join(selfReviewDir, '02-写作计划.json'), 'utf8'));
  selfPlan.v3 = {schemaVersion: 1, r2: {schemaVersion: 1, chapterReviews: {'1': selfRec}, arcReviews: {}}};
  fs.writeFileSync(path.join(selfReviewDir, '02-写作计划.json'), JSON.stringify(selfPlan, null, 2) + '\n', 'utf8');
  const resSelfReview = precheckChapterV2(selfReviewDir, 2);
  assert.equal(resSelfReview.blocking, true);
  assert.ok(resSelfReview.hardErrors.some(e => e.reason === 'R2_SELF_REVIEW'));

  // 9c. B2: decision:revise masquerading as status:passed -> BLOCK!
  badReport.reviewer.runId = 'reviewer-run-1';
  badReport.decision = 'revise';
  const reviseBytes = Buffer.from(JSON.stringify(badReport, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(selfReviewDir, selfRec.reviewPath), reviseBytes);
  selfRec.reviewSha256 = sha256(reviseBytes);
  selfPlan.v3.r2.chapterReviews['1'] = selfRec;
  fs.writeFileSync(path.join(selfReviewDir, '02-写作计划.json'), JSON.stringify(selfPlan, null, 2) + '\n', 'utf8');
  const resFakePassDecision = precheckChapterV2(selfReviewDir, 2);
  assert.equal(resFakePassDecision.blocking, true);
  assert.ok(resFakePassDecision.hardErrors.some(e => e.reason === 'R2_REPORT_NOT_VALID_PASS'));

  // 9d. B5: v3.r2 enabled WITHOUT chapterReviews attribute -> Fail-Closed!
  const missingIndexDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [{chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md'}],
      v3: {schemaVersion: 1, r2: {schemaVersion: 1}},
    },
    chapters: {'chapters/ch001.md': ch1Original},
  });
  const resMissingIndex = precheckChapterV2(missingIndexDir, 1);
  assert.equal(resMissingIndex.blocking, true);
  assert.ok(resMissingIndex.hardErrors.some(e => e.code === 'STALE_REVIEW_AFTER_EDIT' && e.source === 'v3.r2'));

  // 9e. B5: v3.r2.chapterReviews contains null record -> Fail-Closed!
  const nullRecDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [{chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md'}],
      v3: {schemaVersion: 1, r2: {schemaVersion: 1, chapterReviews: {'1': null}}},
    },
    chapters: {'chapters/ch001.md': ch1Original},
  });
  const resNullRec = precheckChapterV2(nullRecDir, 1);
  assert.equal(resNullRec.blocking, true);
  assert.ok(resNullRec.hardErrors.some(e => e.code === 'STALE_REVIEW_AFTER_EDIT' && e.chapter === 1));

  // 9f. B2: Finalized chapter deleted from plan.chapters -> Fail-Closed!
  const deletedMappingDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [{chapterNumber: 2, title: '第二章', filePath: 'chapters/ch002.md', status: 'draft'}],
      v3: {
        r2: {
          schemaVersion: 1,
          chapterReviews: {
            '1': {status: 'passed', revision: 1, manuscriptHashes: {'1': ch1OrigHash}},
          },
        },
      },
    },
    chapters: {'chapters/ch002.md': ch2Text},
  });
  const resDeletedMapping = precheckChapterV2(deletedMappingDir, 2);
  assert.equal(resDeletedMapping.blocking, true);
  assert.ok(resDeletedMapping.hardErrors.some(e => e.code === 'STALE_REVIEW_AFTER_EDIT' && e.chapter === 1));

  // 9g. Approved Pilot with missing/malformed hash & explicit finalizedSha256 malformed -> Fail-Closed!
  const badPilotDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [
        {chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md', finalizedSha256: 'bad'},
        {chapterNumber: 2, title: '第二章', filePath: 'chapters/ch002.md'},
        {chapterNumber: 3, title: '第三章', filePath: 'chapters/ch003.md'},
        {chapterNumber: 4, title: '第四章', filePath: 'chapters/ch004.md'},
      ],
      v3: {
        pilot: {
          status: 'approved',
          manuscriptHashes: {'1': ch1OrigHash, '2': 'not-a-valid-sha256'},
        },
      },
    },
    chapters: {
      'chapters/ch001.md': ch1Original,
      'chapters/ch002.md': ch2Text,
      'chapters/ch003.md': ch3Draft,
      'chapters/ch004.md': ch3Draft,
    },
  });
  const resBadPilot = precheckChapterV2(badPilotDir, 4);
  assert.equal(resBadPilot.blocking, true);
  assert.ok(resBadPilot.hardErrors.some(e => e.code === 'STALE_REVIEW_AFTER_EDIT' && e.source === 'v3.pilot'));
  assert.ok(resBadPilot.hardErrors.some(e => e.code === 'STALE_REVIEW_AFTER_EDIT' && e.source === 'chapter.finalizedSha256'));
});

// ============================================================================
// TC-P0-3-1b: B7 (prepare 覆盖/删索引/arcReviews)、B8 (P1 注册校验)、B9 (R3 snapshot 权威等价)
// ============================================================================
test('TC-P0-3-1b: B7 historical R2/arcReviews preservation, B8 P1 registration, and B9 strict R3 snapshot equivalence', t => {
  function writeCanonicalSnapshot(projectDir, relPath, filesObj, {nonCanonical = false} = {}) {
    const abs = path.join(projectDir, relPath);
    fs.mkdirSync(abs, {recursive: true});
    const manifestFiles = {};
    for (const [name, content] of Object.entries(filesObj)) {
      const buf = Buffer.from(content, 'utf8');
      fs.writeFileSync(path.join(abs, name), buf);
      manifestFiles[name] = sha256(buf);
    }
    const manifest = {schemaVersion: 1, files: manifestFiles};
    const manifestText = nonCanonical ? JSON.stringify(manifest) : JSON.stringify(manifest, null, 2) + '\n';
    const manifestBytes = Buffer.from(manifestText, 'utf8');
    fs.writeFileSync(path.join(abs, 'manifest.json'), manifestBytes);
    return {path: relPath, sha256: sha256(manifestBytes)};
  }

  function writeReviewBundle(projectDir, kind, end, chaptersByNum, {
    revision = 1,
    p1Protocol = false,
    r3Snapshot = null,
    decision = 'pass_candidate',
  } = {}) {
    const scope = kind === 'chapter' ? [end] : [end - 2, end - 1, end];
    const hashes = {};
    for (const n of scope) {
      hashes[String(n)] = sha256(Buffer.from(chaptersByNum[n], 'utf8'));
    }
    const prefix = kind === 'chapter' ? 'ch' : 'arc';
    const pad = String(end).padStart(3, '0');
    const inputRel = `reviews/r2/input-${prefix}${pad}-v${revision}.json`;
    const reviewRel = `reviews/r2/report-${prefix}${pad}-v${revision}.json`;
    const packet = {
      schemaVersion: 1,
      kind,
      end,
      revision,
      manuscriptHashes: hashes,
      writers: scope.map(n => ({chapter: n, runId: `w-run-${n}`, contextId: `w-ctx-${n}`})),
      preparedAt: '2026-11-26T00:00:00.000Z',
      ...(p1Protocol ? {p1Protocol: 1, priorStrengths: []} : {}),
      ...(r3Snapshot ? {r3Snapshot} : {}),
    };
    const report = {
      schemaVersion: 1,
      kind,
      end,
      revision,
      manuscriptHashes: hashes,
      reviewer: {kind: 'independent_agent', runId: `rev-run-${prefix}-${end}-${revision}`, contextId: `rev-ctx-${prefix}-${end}-${revision}`},
      decision,
      summary: `${kind} ${end} v${revision} independent review`,
      issues: [],
      ...(p1Protocol ? {p1: {schemaVersion: 1, literaryStatus: 'UNVERIFIED', preserveStrengths: [], followUps: [], signals: [], revisionProtection: []}} : {}),
    };
    const ib = Buffer.from(JSON.stringify(packet, null, 2) + '\n', 'utf8');
    const rb = Buffer.from(JSON.stringify(report, null, 2) + '\n', 'utf8');
    fs.mkdirSync(path.join(projectDir, 'reviews/r2'), {recursive: true});
    fs.writeFileSync(path.join(projectDir, inputRel), ib);
    fs.writeFileSync(path.join(projectDir, reviewRel), rb);
    return {
      status: decision === 'pass_candidate' ? 'passed' : 'revise',
      revision,
      inputPath: inputRel,
      inputSha256: sha256(ib),
      reviewPath: reviewRel,
      reviewSha256: sha256(rb),
      manuscriptHashes: hashes,
      ...(r3Snapshot ? {r3Snapshot} : {}),
    };
  }

  // --- B7-1: Post-Pilot Chapter 7 passed -> tampered -> overwritten to under_review via R2 prepare -> MUST STILL BLOCK! ---
  const ch4 = makeProseOfChineseWords(3100);
  const ch5 = makeProseOfChineseWords(3100);
  const ch6 = makeProseOfChineseWords(3100);
  const ch7Orig = makeProseOfChineseWords(3100);
  const ch7Tampered = ch7Orig + '\n外部修改后企图通过 r2 prepare 覆写基线。\n';
  const ch8Draft = makeProseOfChineseWords(3100);
  const chMap = {4: ch4, 5: ch5, 6: ch6, 7: ch7Orig, 8: ch8Draft};

  const b7Dir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [4, 5, 6, 7, 8].map(n => ({
        chapterNumber: n,
        title: `第${n}章`,
        filePath: `chapters/ch00${n}.md`,
        status: n < 8 ? 'completed' : 'draft',
      })),
    },
    chapters: Object.fromEntries(Object.entries(chMap).map(([n, txt]) => [`chapters/ch00${n}.md`, txt])),
  });
  const ch7Passed = writeReviewBundle(b7Dir, 'chapter', 7, chMap, {revision: 1});
  const arc6Passed = writeReviewBundle(b7Dir, 'arc', 6, chMap, {revision: 1});
  const b7Plan = JSON.parse(fs.readFileSync(path.join(b7Dir, '02-写作计划.json'), 'utf8'));
  b7Plan.v3 = {
    schemaVersion: 1,
    r2: {
      schemaVersion: 1,
      chapterReviews: {'7': ch7Passed},
      arcReviews: {'6': arc6Passed},
    },
  };
  fs.writeFileSync(path.join(b7Dir, '02-写作计划.json'), JSON.stringify(b7Plan, null, 2) + '\n', 'utf8');

  // Control: unmodified Ch 4..7 with valid arc6 + ch7 reviews passes cleanly
  const resB7Ok = precheckChapterV2(b7Dir, 8);
  assert.equal(resB7Ok.blocking, false, `Valid ch7 + arc6 should pass, got: ${JSON.stringify(resB7Ok.hardErrors)}`);

  // Simulate B7 attack 1: external edit on Ch 7 + `r2_review.mjs prepare` overwriting chapterReviews['7'] to under_review (v2)
  fs.writeFileSync(path.join(b7Dir, 'chapters/ch007.md'), ch7Tampered, 'utf8');
  const ch7NewHash = sha256(Buffer.from(ch7Tampered, 'utf8'));
  b7Plan.v3.r2.chapterReviews['7'] = {
    status: 'under_review',
    revision: 2,
    inputPath: 'reviews/r2/input-ch007-v2.json',
    inputSha256: sha256(Buffer.from('v2-packet', 'utf8')),
    reviewPath: null,
    reviewSha256: null,
    manuscriptHashes: {'7': ch7NewHash},
  };
  fs.writeFileSync(path.join(b7Dir, '02-写作计划.json'), JSON.stringify(b7Plan, null, 2) + '\n', 'utf8');
  const resPrepareOverwrite = precheckChapterV2(b7Dir, 8);
  assert.equal(resPrepareOverwrite.blocking, true, 'R2 prepare overwrite MUST NOT erase finalized Ch 7 baseline');
  assert.ok(resPrepareOverwrite.hardErrors.some(e => e.reason === 'HISTORICAL_PASSED_REVIEW_MANUSCRIPT_CHANGED' && e.chapter === 7));

  // Simulate B7 attack 2: restore Ch 7 bytes, delete chapterReviews['7'] leaving empty chapterReviews: {}
  fs.writeFileSync(path.join(b7Dir, 'chapters/ch007.md'), ch7Orig, 'utf8');
  b7Plan.v3.r2.chapterReviews = {};
  fs.writeFileSync(path.join(b7Dir, '02-写作计划.json'), JSON.stringify(b7Plan, null, 2) + '\n', 'utf8');
  const resDeletedCh7Index = precheckChapterV2(b7Dir, 8);
  assert.equal(resDeletedCh7Index.blocking, true, 'Deleting chapterReviews[7] while historical passed report exists MUST Fail-Closed');
  assert.ok(resDeletedCh7Index.hardErrors.some(e => e.reason === 'HISTORICAL_PASSED_REVIEW_MISSING_FROM_PLAN' && e.chapter === 7));

  // Simulate B7 attack 3: only arcReviews['6'] protects Ch 4..6; tamper Ch 5 on disk -> MUST BLOCK!
  b7Plan.v3.r2.chapterReviews = {'7': ch7Passed};
  fs.writeFileSync(path.join(b7Dir, '02-写作计划.json'), JSON.stringify(b7Plan, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(b7Dir, 'chapters/ch005.md'), ch5 + '\n篡改第5章正文。\n', 'utf8');
  const resArcTamper = precheckChapterV2(b7Dir, 8);
  assert.equal(resArcTamper.blocking, true, 'Tampering Ch 5 protected by arcReviews[6] MUST block');
  assert.ok(resArcTamper.hardErrors.some(e => e.code === 'STALE_REVIEW_AFTER_EDIT' && e.chapter === 5));

  // --- B8 & B9: R3 namespace + P1 registration + strict canonical snapshot equivalence ---
  const ch1Txt = makeProseOfChineseWords(3100);
  const ch2Txt = makeProseOfChineseWords(3100);
  const r3Dir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [
        {chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md', status: 'completed'},
        {chapterNumber: 2, title: '第二章', filePath: 'chapters/ch002.md', status: 'draft'},
      ],
    },
    chapters: {'chapters/ch001.md': ch1Txt, 'chapters/ch002.md': ch2Txt},
  });

  // B8 & B9 positive control: canonical R3 snapshot (chapter-0001.md + optional diff.md) + registered P1 reviewHistory
  const validSnap = writeCanonicalSnapshot(r3Dir, 'reviews/r3/manuscripts/chapter-1/v1', {
    'chapter-0001.md': ch1Txt,
    'diff.md': '# diff\n',
  });
  const p1Ch1Rec = writeReviewBundle(r3Dir, 'chapter', 1, {1: ch1Txt}, {
    revision: 1,
    p1Protocol: true,
    r3Snapshot: validSnap,
  });
  const r3Plan = JSON.parse(fs.readFileSync(path.join(r3Dir, '02-写作计划.json'), 'utf8'));
  r3Plan.v3 = {
    schemaVersion: 1,
    r2: {schemaVersion: 1, chapterReviews: {'1': p1Ch1Rec}, arcReviews: {}},
    r3: {
      schemaVersion: 1,
      mode: 'experimental',
      p1: {
        schemaVersion: 1,
        baselineUpto: 0,
        projectId: 'proj-p0-3-test',
        legacyReviews: {},
        reviewHistory: [
          {kind: 'chapter', end: 1, revision: 1, path: p1Ch1Rec.reviewPath, sha256: p1Ch1Rec.reviewSha256},
        ],
      },
    },
  };
  fs.writeFileSync(path.join(r3Dir, '02-写作计划.json'), JSON.stringify(r3Plan, null, 2) + '\n', 'utf8');
  const resR3P1Ok = precheckChapterV2(r3Dir, 2);
  assert.equal(resR3P1Ok.blocking, false, `Valid R3/P1 + canonical snapshot should pass, got: ${JSON.stringify(resR3P1Ok.hardErrors)}`);

  // B8 negative 1: P1 review missing from reviewHistory -> R3_P1_REVIEW_HISTORY_MISSING
  r3Plan.v3.r3.p1.reviewHistory = [];
  fs.writeFileSync(path.join(r3Dir, '02-写作计划.json'), JSON.stringify(r3Plan, null, 2) + '\n', 'utf8');
  const resMissingP1Hist = precheckChapterV2(r3Dir, 2);
  assert.equal(resMissingP1Hist.blocking, true);
  assert.ok(resMissingP1Hist.hardErrors.some(e => e.reason === 'R3_P1_REVIEW_HISTORY_MISSING'));

  // B8 negative 2: Legacy review (p1Protocol !== 1) missing from legacyReviews -> R3_P1_UNREGISTERED_LEGACY_REVIEW
  const legacySnap = writeCanonicalSnapshot(r3Dir, 'reviews/r3/manuscripts/chapter-1/v2', {'chapter-0001.md': ch1Txt});
  const legacyCh1Rec = writeReviewBundle(r3Dir, 'chapter', 1, {1: ch1Txt}, {
    revision: 2,
    p1Protocol: false,
    r3Snapshot: legacySnap,
  });
  r3Plan.v3.r2.chapterReviews['1'] = legacyCh1Rec;
  fs.writeFileSync(path.join(r3Dir, '02-写作计划.json'), JSON.stringify(r3Plan, null, 2) + '\n', 'utf8');
  const resUnregLegacy = precheckChapterV2(r3Dir, 2);
  assert.equal(resUnregLegacy.blocking, true);
  assert.ok(resUnregLegacy.hardErrors.some(e => e.reason === 'R3_P1_UNREGISTERED_LEGACY_REVIEW'));

  // B8 negative 3: Malformed v3.r3.p1 state -> R3_P1_STATE_INVALID
  r3Plan.v3.r3.p1 = {schemaVersion: 1, baselineUpto: 0, projectId: '', legacyReviews: null, reviewHistory: 'bad'};
  fs.writeFileSync(path.join(r3Dir, '02-写作计划.json'), JSON.stringify(r3Plan, null, 2) + '\n', 'utf8');
  const resBadP1State = precheckChapterV2(r3Dir, 2);
  assert.equal(resBadP1State.blocking, true);
  assert.ok(resBadP1State.hardErrors.some(e => e.reason === 'R3_P1_STATE_INVALID'));

  // Restore valid P1 state & test B9 negative cases
  const b9BaseDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [
        {chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md', status: 'completed'},
        {chapterNumber: 2, title: '第二章', filePath: 'chapters/ch002.md', status: 'draft'},
      ],
    },
    chapters: {'chapters/ch001.md': ch1Txt, 'chapters/ch002.md': ch2Txt},
  });

  // B9 negative 1: Non-canonical manifest.json (minified single-line) -> R3_SNAPSHOT_MANIFEST_NONCANONICAL
  const nonCanonSnap = writeCanonicalSnapshot(b9BaseDir, 'reviews/r3/manuscripts/chapter-1/v1', {
    'chapter-0001.md': ch1Txt,
  }, {nonCanonical: true});
  const nonCanonRec = writeReviewBundle(b9BaseDir, 'chapter', 1, {1: ch1Txt}, {revision: 1, r3Snapshot: nonCanonSnap});
  const b9Plan = JSON.parse(fs.readFileSync(path.join(b9BaseDir, '02-写作计划.json'), 'utf8'));
  b9Plan.v3 = {
    schemaVersion: 1,
    r2: {schemaVersion: 1, chapterReviews: {'1': nonCanonRec}, arcReviews: {}},
    r3: {schemaVersion: 1, mode: 'experimental'},
  };
  fs.writeFileSync(path.join(b9BaseDir, '02-写作计划.json'), JSON.stringify(b9Plan, null, 2) + '\n', 'utf8');
  const resNonCanon = precheckChapterV2(b9BaseDir, 2);
  assert.equal(resNonCanon.blocking, true);
  assert.ok(resNonCanon.hardErrors.some(e => e.reason === 'R3_SNAPSHOT_MANIFEST_NONCANONICAL'));

  // B9 negative 2: Canonical manifest containing extra unexpected file (`extra.txt`) -> R3_MANUSCRIPT_SNAPSHOT_EXTRA_FILE
  const extraFileSnap = writeCanonicalSnapshot(b9BaseDir, 'reviews/r3/manuscripts/chapter-1/v2', {
    'chapter-0001.md': ch1Txt,
    'extra.txt': 'unexpected payload',
  });
  const extraFileRec = writeReviewBundle(b9BaseDir, 'chapter', 1, {1: ch1Txt}, {revision: 2, r3Snapshot: extraFileSnap});
  b9Plan.v3.r2.chapterReviews['1'] = extraFileRec;
  fs.writeFileSync(path.join(b9BaseDir, '02-写作计划.json'), JSON.stringify(b9Plan, null, 2) + '\n', 'utf8');
  const resExtraFile = precheckChapterV2(b9BaseDir, 2);
  assert.equal(resExtraFile.blocking, true);
  assert.ok(resExtraFile.hardErrors.some(e => e.reason === 'R3_MANUSCRIPT_SNAPSHOT_EXTRA_FILE'));

  // B9 negative 3: Snapshot missing expected chapter-0001.md (only diff.md) -> R3_MANUSCRIPT_SNAPSHOT_CONTENT_MISMATCH
  const missingChSnap = writeCanonicalSnapshot(b9BaseDir, 'reviews/r3/manuscripts/chapter-1/v3', {
    'diff.md': '# only diff\n',
  });
  const missingChRec = writeReviewBundle(b9BaseDir, 'chapter', 1, {1: ch1Txt}, {revision: 3, r3Snapshot: missingChSnap});
  b9Plan.v3.r2.chapterReviews['1'] = missingChRec;
  fs.writeFileSync(path.join(b9BaseDir, '02-写作计划.json'), JSON.stringify(b9Plan, null, 2) + '\n', 'utf8');
  const resMissingChSnap = precheckChapterV2(b9BaseDir, 2);
  assert.equal(resMissingChSnap.blocking, true);
  assert.ok(resMissingChSnap.hardErrors.some(e => e.reason === 'R3_MANUSCRIPT_SNAPSHOT_CONTENT_MISMATCH'));
});

// ============================================================================
// TC-P0-3-2: 作者显式硬约束阻断 vs 未配置非阻断 & 畸形配置 Fail-Closed
// ============================================================================
test('TC-P0-3-2: explicit author hardConstraints block when violated; absent hardConstraints never block', t => {
  const shortChapter = '# 第1章 试炼\n\n沈青河推开木门，发现桌上放着一把生锈的铜钥匙，屋里飘着一股淡淡的松烟味。\n\n他低头检查门闩，确认昨夜并无外人潜入。\n';

  // 1. Without hardConstraints -> short chapter is ONLY softWarning, blocking=false
  const noConstraintDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [{chapterNumber: 1, title: '试炼', filePath: 'chapters/ch001.md'}],
    },
    chapters: {'chapters/ch001.md': shortChapter},
  });
  const resNoConstraint = precheckChapterV2(noConstraintDir, 1);
  assert.equal(resNoConstraint.blocking, false);
  assert.equal(resNoConstraint.hardErrors.length, 0);
  assert.ok(resNoConstraint.softWarnings.some(w => w.code === 'UNDER_SOFT_MIN'));

  // 2. With explicit hardConstraints violated (mustInclude missing, mustExclude hit, enforceMinWords: true)
  const strictDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      hardConstraints: {
        mustExclude: ['松烟味'],
        need_semantic_audit: ['核验铜钥匙来源是否与序章交代一致'],
      },
      chapters: [
        {
          chapterNumber: 1,
          title: '试炼',
          filePath: 'chapters/ch001.md',
          hardConstraints: {
            mustInclude: ['护心镜'],
            enforceMinWords: true,
            minWords: 2000,
          },
        },
      ],
    },
    chapters: {'chapters/ch001.md': shortChapter},
  });
  const resStrict = precheckChapterV2(strictDir, 1);
  assert.equal(resStrict.blocking, true);
  assert.ok(resStrict.hardErrors.some(e => e.code === 'HARD_CONSTRAINT_MUST_INCLUDE_MISSING'));
  assert.ok(resStrict.hardErrors.some(e => e.code === 'HARD_CONSTRAINT_MUST_EXCLUDE_HIT'));
  assert.ok(resStrict.hardErrors.some(e => e.code === 'HARD_CONSTRAINT_MIN_WORDS_VIOLATED'));
  // need_semantic_audit routes into needsSemanticAudit (never hardErrors); unmatched anchor explicitly flagged
  const unmatchedAuthorAudit = resStrict.needsSemanticAudit.find(
    a => a.category === 'author_semantic_constraint' && a.hint.includes('铜钥匙来源'),
  );
  assert.ok(unmatchedAuthorAudit);
  assert.equal(unmatchedAuthorAudit.anchorMatched, false);
  assert.ok(unmatchedAuthorAudit.hint.includes('未找到作者锚点'));

  // 3. Satisfying all explicit hardConstraints passes cleanly
  const passingText = makeProseOfChineseWords(2200) + '\n\n沈青河将护心镜收入怀中，稳步踏入浓雾。\n';
  const passStrictDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      hardConstraints: {
        mustExclude: ['违禁词甲'],
        needSemanticAudit: [{rule: '核验护心镜状态', anchor: '沈青河将护心镜收入怀中'}],
      },
      chapters: [
        {
          chapterNumber: 1,
          title: '试炼',
          filePath: 'chapters/ch001.md',
          hardConstraints: {
            mustInclude: ['护心镜'],
            enforceMinWords: true,
            minWords: 2000,
            enforceMaxWords: true,
            maxWords: 3500,
          },
        },
      ],
    },
    chapters: {'chapters/ch001.md': passingText},
  });
  const resPassStrict = precheckChapterV2(passStrictDir, 1);
  assert.equal(resPassStrict.blocking, false);
  assert.equal(resPassStrict.hardErrors.length, 0);
  const authorAudit = resPassStrict.needsSemanticAudit.find(a => a.category === 'author_semantic_constraint');
  assert.ok(authorAudit);
  assert.equal(authorAudit.anchorQuote, '沈青河将护心镜收入怀中');
  assert.equal(authorAudit.anchorMatched, true);
  assert.ok(!authorAudit.hint.includes('未找到作者锚点'));

  // 4. Fail-Closed on malformed hardConstraints (e.g. non-boolean enforceMinWords, null hardConstraints)
  const malformedConfigs = [
    {hardConstraints: null},
    {hardConstraints: {enforceMinWords: 'true'}},
    {hardConstraints: {mustInclude: '护心镜'}},
    {hardConstraints: {minWords: -100}},
  ];
  for (const cfg of malformedConfigs) {
    const badDir = makeTempProject(t, {
      plan: {
        minWordsPerChapter: 3000,
        ...cfg,
        chapters: [{chapterNumber: 1, title: '试炼', filePath: 'chapters/ch001.md'}],
      },
      chapters: {'chapters/ch001.md': passingText},
    });
    const resBad = precheckChapterV2(badDir, 1);
    assert.equal(resBad.blocking, true, `Expected Fail-Closed blocking for ${JSON.stringify(cfg)}`);
    assert.ok(resBad.hardErrors.some(e => e.code === 'HARD_CONSTRAINTS_INVALID'));
  }
});

// ============================================================================
// TC-P0-3-3: 防机械误杀三专项（合法重复段 / 合规中文跨段多段引语 / 非硬约束字数偏离）
// ============================================================================
test('TC-P0-3-3: zero false blocking on legal duplicate paragraphs, Chinese multi-paragraph quotes, and soft word count deviations', t => {
  // 1. Legal verbatim duplicate paragraph (time loop / verbatim re-quote >= 60 Chinese chars)
  const repeatedPara =
    '青铜钟在子夜敲响第三声，廊下灯笼骤然熄灭，雨点斜打在朱漆回廊的石砖上，溅起一串冰冷的白雾，沈青河猛地睁开眼，发现自己正站在同一扇紧闭的雕花木门前，掌心仍攥着那半截尚未燃尽的火折子。';
  const ch1Text = `# 第1章 第一次循环\n\n${repeatedPara}\n\n他深吸一口气，推开了那扇门。\n`;
  const ch2Text = `# 第2章 第二次循环\n\n${repeatedPara}\n\n这一次，他没有去碰门环，而是先看了一眼门槛下的水渍。\n`;

  const dupDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [
        {chapterNumber: 1, title: '第一次循环', filePath: 'chapters/ch001.md'},
        {chapterNumber: 2, title: '第二次循环', filePath: 'chapters/ch002.md'},
      ],
    },
    chapters: {
      'chapters/ch001.md': ch1Text,
      'chapters/ch002.md': ch2Text,
    },
  });
  const resDup = precheckChapterV2(dupDir, 2);
  assert.equal(resDup.blocking, false, 'Duplicate paragraph MUST NOT block by default');
  assert.equal(resDup.hardErrors.length, 0);
  assert.ok(resDup.softWarnings.some(w => w.code === 'DUPLICATE_PARAGRAPH_CANDIDATE'));

  // 2. Legal Chinese multi-paragraph quotes (GB/T 15834 curly quotes & corner quotes & omitted middle open quote)
  const legalCurlyMultiPara = [
    '他展开泛黄的家书，低声念道：“吾儿见字如晤，江南连月阴雨，盐仓地基已现渗水之象，切不可再拖延修缮。',
    '“昨日账房清点库存，旧存盐引与官府副簿略有出入，其中干系甚大，务必亲自赴码头核对，不可假手他人。',
    '“若遇巡盐御史衙门差役盘问，只需出示祖父当年留下的勘合，切记沉住气，切勿与人当街争执。”',
  ];
  assert.deepEqual(checkQuotesWithChineseMultiParaWhitelist(legalCurlyMultiPara), []);

  const legalCornerMultiPara = [
    '老人缓缓开口：「当年城破之夜，我亲眼见他们抬走三口铁箱，箱盖上刻着『永乐官造』四个篆字。',
    '「后来乱兵四起，众人各自逃命，那三口铁箱便不知所踪。',
    '「今日你既带着这块玉佩找上门来，我便把当年藏匿的地图交给你。」',
  ];
  assert.deepEqual(checkQuotesWithChineseMultiParaWhitelist(legalCornerMultiPara), []);

  const legalOmittedMidOpenQuote = [
    '信中写道：“第一段交代了当年的旧事，字迹工整。',
    '第二段列举了三处旧址方位，没有另起前引号。',
    '第三段落款处盖着一枚朱红私印。”',
  ];
  assert.deepEqual(checkQuotesWithChineseMultiParaWhitelist(legalOmittedMidOpenQuote), []);

  // Real unclosed quote separated by narration -> softWarning ONLY (never blocking)
  const realUnclosedWithGap = [
    '他冷笑一声：“你以为这事就这么算了？',
    '院子里一时鸦雀无声，只有冷风掠过屋檐。',
    '“谁在外面？”屋内突然传来一声低喝。',
  ];
  const unclosedWarnings = checkQuotesWithChineseMultiParaWhitelist(realUnclosedWithGap);
  assert.ok(unclosedWarnings.some(w => w.code === 'UNPAIRED_QUOTE_CANDIDATE' && w.paragraphIndex === 1));

  // Integrate multi-paragraph quote chapter in full precheckChapterV2 -> 0 quote warnings, blocking=false
  const quoteChapterText =
    '# 第1章 长信\n\n' +
    legalCurlyMultiPara.join('\n\n') +
    '\n\n' +
    legalCornerMultiPara.join('\n\n') +
    '\n\n' +
    makeProseOfChineseWords(3200).replace(/^#[^\n]+\n+/, '');
  const quoteDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      maxWordsPerChapter: 4000,
      chapters: [{chapterNumber: 1, title: '长信', filePath: 'chapters/ch001.md'}],
    },
    chapters: {'chapters/ch001.md': quoteChapterText},
  });
  const resQuote = precheckChapterV2(quoteDir, 1);
  assert.equal(resQuote.blocking, false);
  assert.equal(resQuote.hardErrors.length, 0);
  assert.equal(resQuote.softWarnings.filter(w => w.code === 'UNPAIRED_QUOTE_CANDIDATE').length, 0);

  // 3. Soft word count deviations (both under 3000 and over 4000) without explicit hardConstraints -> blocking=false
  const underDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      maxWordsPerChapter: 4000,
      chapters: [{chapterNumber: 1, title: '紧凑章', filePath: 'chapters/ch001.md'}],
    },
    chapters: {'chapters/ch001.md': makeProseOfChineseWords(1800)},
  });
  const resUnder = precheckChapterV2(underDir, 1);
  assert.equal(resUnder.blocking, false);
  assert.equal(resUnder.hardErrors.length, 0);
  assert.ok(resUnder.softWarnings.some(w => w.code === 'UNDER_SOFT_MIN'));

  const overDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      maxWordsPerChapter: 4000,
      chapters: [{chapterNumber: 1, title: '高潮大章', filePath: 'chapters/ch001.md'}],
    },
    chapters: {'chapters/ch001.md': makeProseOfChineseWords(4320)},
  });
  const resOver = precheckChapterV2(overDir, 1);
  assert.equal(resOver.blocking, false);
  assert.equal(resOver.hardErrors.length, 0);
  assert.ok(resOver.softWarnings.some(w => w.code === 'OVER_SOFT_MAX'));

  // 4. Style softWarnings (prose parentheses, sudden adverbs, overlong semicolon sentence) -> NEVER blocking
  const styleWarnText =
    '# 第1章 杂项软提醒\n\n' +
    '他站在门前（注：此处为旧码头北口）犹豫了片刻。\n\n' +
    '突然一阵冷风吹过，忽然灯灭了，猛然间有人破窗，陡然一声巨响，骤然火光冲天，蓦地人影一闪。\n\n' +
    '账房先生一边拨动算珠清点库房里堆成小山的旧账簿与陈年盐引；一边还要分心留意门外巡街差役渐行渐近的杂乱脚步声；同时暗自盘算今夜若不能将这笔差额抹平明日该如何向东家交代。\n';
  const styleDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [{chapterNumber: 1, title: '杂项软提醒', filePath: 'chapters/ch001.md'}],
    },
    chapters: {'chapters/ch001.md': styleWarnText},
  });
  const resStyle = precheckChapterV2(styleDir, 1);
  assert.equal(resStyle.blocking, false);
  assert.equal(resStyle.hardErrors.length, 0);
  assert.ok(resStyle.softWarnings.some(w => w.code === 'PROSE_PARENTHESES'));
  assert.ok(resStyle.softWarnings.some(w => w.code === 'HIGH_FREQ_SUDDEN_ADVERBS'));
  assert.ok(resStyle.softWarnings.some(w => w.code === 'OVERLONG_SEMICOLON_SENTENCE'));
});

// ============================================================================
// TC-P0-3-4: NEEDS_SEMANTIC_AUDIT 精准提取（V22-H4 / OLD-HOLD-1 / V22-H3 全覆盖）
// ============================================================================
test('TC-P0-3-4: extracts all 6 NEEDS_SEMANTIC_AUDIT categories with exact verbatim anchors and blocking=false', t => {
  const benchmarkChapter = [
    '# 第4章 暗账与风道',
    '',
    '九月廿三比原定廿六提前两日抵达江州码头，押运队辰初出发，午时初才赶到北仓。',
    '',
    '仓管翻开官簿核对：这批官盐定额 3000 引，实发两千八百引，账面亏空二百引，折合纹银一千二百两。',
    '',
    '沈青河摸了摸袖袋，袖中原有 16 灵碎，昨夜在药铺买药膏花了四块，如今清点余下竟然还有十三块灵碎。',
    '',
    '他从暗格取出甲字三号盐引封条与副簿，确认编号无误后交予赵有福贴身收好。',
    '',
    '冷库排风口位于前墙木门正上方 3 米处，一条 0.5 米直风道斜穿墙体；刺客突然拔刀扑向门口，周衡闪身格挡并反手拽住拉门。',
    '',
    '赵有福背对着门浑然不知，周衡却早已看穿他心里盘算着私吞盐引的念头。',
  ].join('\n');

  const dir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [
        {
          chapterNumber: 4,
          title: '暗账与风道',
          filePath: 'chapters/ch004.md',
          hardConstraints: {
            need_semantic_audit: [
              {
                rule: '核对赵有福动机是否与第 2 章铺垫衔接',
                anchor: '赵有福背对着门浑然不知',
              },
            ],
          },
        },
      ],
    },
    chapters: {'chapters/ch004.md': benchmarkChapter},
    extraFiles: {
      'story-ledger.json': {
        facts: [],
        r3Checks: [
          {
            id: 'CHK-LING-01',
            chapter: 4,
            kind: 'quantity_balance',
            impact: 'hard',
            unit: '灵碎',
            opening: 16,
            deltas: [-4],
            closing: 13,
            quote: '袖中原有 16 灵碎',
          },
        ],
      },
    },
  });

  const res = precheckChapterV2(dir, 4);
  assert.equal(res.schemaVersion, 2);
  assert.equal(res.blocking, false, 'NEEDS_SEMANTIC_AUDIT must NEVER block the writer');
  assert.equal(res.hardErrors.length, 0);

  const paragraphs = extractBodyParagraphs(benchmarkChapter);
  const audits = res.needsSemanticAudit;
  assert.ok(audits.length >= 6, `Expected at least 6 audit clues, got ${audits.length}`);

  // Verify every item conforms to PrecheckV2Output contract & verbatim anchor invariant
  audits.forEach((item, idx) => {
    assert.equal(item.auditId, `NSA-${String(idx + 1).padStart(3, '0')}`);
    assert.ok(typeof item.category === 'string' && item.category.length > 0);
    assert.ok(Number.isSafeInteger(item.paragraphIndex) && item.paragraphIndex >= 1 && item.paragraphIndex <= paragraphs.length);
    assert.ok(typeof item.anchorQuote === 'string' && item.anchorQuote.length > 0);
    assert.ok(
      paragraphs[item.paragraphIndex - 1].includes(item.anchorQuote),
      `anchorQuote must be verbatim substring of paragraph ${item.paragraphIndex}: ${item.anchorQuote}`,
    );
    assert.ok(typeof item.hint === 'string' && item.hint.trim().length > 0);
  });

  // Verify all 6 categories hit exact benchmark anchors
  const dateClue = audits.find(a => a.category === 'date_arithmetic' && a.anchorQuote.includes('九月廿三比原定廿六提前两日'));
  assert.ok(dateClue, 'Must extract V22-H4 date arithmetic anchor');
  assert.equal(dateClue.paragraphIndex, 1);

  const saltLedgerClue = audits.find(a => a.category === 'ledger_quantity' && a.anchorQuote.includes('3000 引'));
  assert.ok(saltLedgerClue, 'Must extract V22-H4 3000 引 salt ledger anchor');
  assert.equal(saltLedgerClue.paragraphIndex, 2);

  const lingSuiClue = audits.find(a => a.category === 'ledger_quantity' && a.anchorQuote.includes('16 灵碎'));
  assert.ok(lingSuiClue, 'Must extract OLD-HOLD-1 16 灵碎 arithmetic anchor');
  assert.equal(lingSuiClue.paragraphIndex, 3);

  const propClue = audits.find(a => a.category === 'prop_sequence' && a.anchorQuote.includes('甲字三号'));
  assert.ok(propClue, 'Must extract V22-H3 numbered prop sequence anchor');
  assert.equal(propClue.paragraphIndex, 4);

  const spatialClue = audits.find(a => a.category === 'climax_action_pov' && a.anchorQuote.includes('3 米'));
  assert.ok(spatialClue, 'Must extract V22-H3 spatial geometry / climax action anchor');
  assert.equal(spatialClue.paragraphIndex, 5);

  const infoClue = audits.find(a => a.category === 'info_asymmetry' && a.anchorQuote.includes('浑然不知'));
  assert.ok(infoClue, 'Must extract V22-H3 info asymmetry anchor');
  assert.equal(infoClue.paragraphIndex, 6);

  const authorRuleClue = audits.find(a => a.category === 'author_semantic_constraint' && a.hint.includes('赵有福动机'));
  assert.ok(authorRuleClue, 'Must extract author need_semantic_audit clause');
  assert.equal(authorRuleClue.paragraphIndex, 6);
});

// ============================================================================
// TC-P0-3-5: 性能 (<250ms @ 5,000 字)、零副作用 Manifest 核验、静态只读审计与 CLI 退出码
// ============================================================================
test('TC-P0-3-5: 5000-char chapter runs in <250ms with 0 disk side effects, pure read-only source, and strict CLI exit codes', t => {
  const chapter5k = makeProseOfChineseWords(5000);
  const dir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      maxWordsPerChapter: 5500,
      chapters: [
        {chapterNumber: 1, title: '五千字大章', filePath: 'chapters/ch001.md', status: 'draft'},
        {chapterNumber: 2, title: '缺失章', filePath: 'chapters/ch002.md', status: 'draft'},
      ],
      v3: {
        r2: {
          schemaVersion: 1,
          chapterReviews: {},
        },
      },
    },
    chapters: {'chapters/ch001.md': chapter5k},
  });

  const manifestBefore = snapshotTreeManifest(dir);

  // 1. Direct API performance on 5,000 Chinese chars (< 250ms)
  const t0 = performance.now();
  const directRes = precheckChapterV2(dir, 1, {dryRun: true});
  const directElapsed = performance.now() - t0;

  assert.equal(directRes.schemaVersion, 2);
  assert.equal(directRes.blocking, false);
  assert.equal(directRes.dryRun, true);
  assert.ok(directRes.wordCount >= 4900, `Expected ~5000 Chinese chars, got ${directRes.wordCount}`);
  assert.ok(directElapsed < 250, `Expected <250ms for 5000-char chapter, got ${directElapsed.toFixed(2)}ms`);

  // 2. CLI --dry-run (non-blocking -> exit 0)
  const cliDry = spawnSync(process.execPath, [PRECHECK_CLI, dir, '--chapter', '1', '--dry-run'], {
    encoding: 'utf8',
  });
  assert.equal(cliDry.status, 0, `Expected exit 0, got ${cliDry.status}: ${cliDry.stdout} ${cliDry.stderr}`);
  const parsedDry = JSON.parse(cliDry.stdout);
  assert.equal(parsedDry.schemaVersion, 2);
  assert.equal(parsedDry.blocking, false);
  assert.equal(parsedDry.dryRun, true);
  assert.equal(parsedDry.manuscriptSha256, sha256(Buffer.from(chapter5k, 'utf8')));

  // 3. CLI default run without --dry-run (still zero writes, exit 0)
  const cliDefault = spawnSync(process.execPath, [PRECHECK_CLI, dir, '1'], {encoding: 'utf8'});
  assert.equal(cliDefault.status, 0);
  assert.equal(JSON.parse(cliDefault.stdout).dryRun, false);

  // 4. CLI blocking run on missing ch2 -> exit 1 + valid PrecheckV2Output JSON
  const cliBlock = spawnSync(process.execPath, [PRECHECK_CLI, dir, '--chapter', '2', '--dry-run'], {
    encoding: 'utf8',
  });
  assert.equal(cliBlock.status, 1);
  const parsedBlock = JSON.parse(cliBlock.stdout);
  assert.equal(parsedBlock.schemaVersion, 2);
  assert.equal(parsedBlock.blocking, true);
  assert.ok(parsedBlock.hardErrors.some(e => e.code === 'MANUSCRIPT_MISSING'));

  // 5. CLI invalid usage / unknown flag -> exit 2
  const cliBadFlag = spawnSync(process.execPath, [PRECHECK_CLI, dir, '--chapter', '1', '--bogus'], {
    encoding: 'utf8',
  });
  assert.equal(cliBadFlag.status, 2);

  // 6. Verify ZERO filesystem side effects (manifest byte-for-byte identical before & after all runs)
  const manifestAfter = snapshotTreeManifest(dir);
  assert.equal(manifestAfter, manifestBefore, 'Precheck v2 MUST leave project directory 100% untouched');

  // 7. Static read-only code audit on precheck_chapter.mjs & precheck_v2_common.mjs (strip comments first)
  const stripComments = code =>
    code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const forbiddenWritePatterns = [
    /\bwriteFile(?:Sync)?\b/,
    /\bappendFile(?:Sync)?\b/,
    /\bcreateWriteStream\b/,
    /\bmkdir(?:Sync)?\b/,
    /\bmkdtemp(?:Sync)?\b/,
    /\brm(?:Sync)?\b/,
    /\bunlink(?:Sync)?\b/,
    /\brmdir(?:Sync)?\b/,
    /\btruncate(?:Sync)?\b/,
    /\bchmod(?:Sync)?\b/,
    /\bchown(?:Sync)?\b/,
    /\butimes(?:Sync)?\b/,
    /\bcopyFile(?:Sync)?\b/,
    /\bcp(?:Sync)?\b/,
    /\brename(?:Sync)?\b/,
    /\blink(?:Sync)?\b/,
    /\bsymlink(?:Sync)?\b/,
    /\bopen(?:Sync)?\s*\(/,
    /\bchild_process\b/,
    /\batomicWritePlan\b/,
    /\beval\s*\(/,
    /\bnew\s+Function\b/,
    /\bimport\s*\(/,
  ];
  for (const relPath of ['scripts/precheck_chapter.mjs', 'scripts/precheck_v2_common.mjs']) {
    const src = stripComments(fs.readFileSync(path.join(REPO_ROOT, relPath), 'utf8'));
    for (const pat of forbiddenWritePatterns) {
      assert.equal(pat.test(src), false, `Forbidden write/process API ${pat} found in ${relPath}`);
    }
  }
});
