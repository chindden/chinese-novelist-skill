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
    const reviewRel = `reviews/r2/report-ch${pad}-v${revision}.json`;
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

  // B9 negative 4: packet.r3Snapshot carries extra property not in record.r3Snapshot -> R3_MANUSCRIPT_SNAPSHOT_PACKET_MISMATCH
  const b9ExtraPropDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [
        {chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md', status: 'completed'},
        {chapterNumber: 2, title: '第二章', filePath: 'chapters/ch002.md', status: 'draft'},
      ],
    },
    chapters: {'chapters/ch001.md': ch1Txt, 'chapters/ch002.md': ch2Txt},
  });
  const goodSnap = writeCanonicalSnapshot(b9ExtraPropDir, 'reviews/r3/manuscripts/chapter-1/v1', {'chapter-0001.md': ch1Txt});
  const extraPropRec = writeReviewBundle(b9ExtraPropDir, 'chapter', 1, {1: ch1Txt}, {revision: 1, r3Snapshot: goodSnap});
  const extraPropPacket = JSON.parse(fs.readFileSync(path.join(b9ExtraPropDir, extraPropRec.inputPath), 'utf8'));
  extraPropPacket.r3Snapshot = {...goodSnap, extraField: 'unexpected'};
  const extraPropPacketBytes = Buffer.from(JSON.stringify(extraPropPacket, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(b9ExtraPropDir, extraPropRec.inputPath), extraPropPacketBytes);
  extraPropRec.inputSha256 = sha256(extraPropPacketBytes);
  const b9ExtraPropPlan = JSON.parse(fs.readFileSync(path.join(b9ExtraPropDir, '02-写作计划.json'), 'utf8'));
  b9ExtraPropPlan.v3 = {
    schemaVersion: 1,
    r2: {schemaVersion: 1, chapterReviews: {'1': extraPropRec}, arcReviews: {}},
    r3: {schemaVersion: 1, mode: 'experimental'},
  };
  fs.writeFileSync(path.join(b9ExtraPropDir, '02-写作计划.json'), JSON.stringify(b9ExtraPropPlan, null, 2) + '\n', 'utf8');
  const resSnapObjMismatch = precheckChapterV2(b9ExtraPropDir, 2);
  assert.equal(resSnapObjMismatch.blocking, true);
  assert.ok(resSnapObjMismatch.hardErrors.some(e => e.reason === 'R3_MANUSCRIPT_SNAPSHOT_PACKET_MISMATCH'));

  // --- B10: Historical R2 report-*.json corruption, missing hash, kind/end/rev tamper, packet mismatch & P1 decision downgrade ---
  const b10BaseSetup = () => {
    const d = makeTempProject(t, {
      plan: {
        minWordsPerChapter: 3000,
        chapters: [
          {chapterNumber: 7, title: '第七章', filePath: 'chapters/ch007.md', status: 'completed'},
          {chapterNumber: 8, title: '第八章', filePath: 'chapters/ch008.md', status: 'draft'},
        ],
      },
      chapters: {'chapters/ch007.md': ch7Orig, 'chapters/ch008.md': ch8Draft},
    });
    const ch7Rec = writeReviewBundle(d, 'chapter', 7, {7: ch7Orig}, {revision: 1});
    // Tamper Ch 7 on disk and simulate R2 prepare overwriting chapterReviews['7'] to under_review
    fs.writeFileSync(path.join(d, 'chapters/ch007.md'), ch7Tampered, 'utf8');
    const p = JSON.parse(fs.readFileSync(path.join(d, '02-写作计划.json'), 'utf8'));
    p.v3 = {
      schemaVersion: 1,
      r2: {
        schemaVersion: 1,
        chapterReviews: {
          '7': {
            status: 'under_review',
            revision: 2,
            inputPath: 'reviews/r2/input-ch007-v2.json',
            inputSha256: sha256(Buffer.from('v2', 'utf8')),
            reviewPath: null,
            reviewSha256: null,
            manuscriptHashes: {'7': sha256(Buffer.from(ch7Tampered, 'utf8'))},
          },
        },
        arcReviews: {},
      },
    };
    fs.writeFileSync(path.join(d, '02-写作计划.json'), JSON.stringify(p, null, 2) + '\n', 'utf8');
    return {dir: d, reportAbs: path.join(d, ch7Rec.reviewPath), inputAbs: path.join(d, ch7Rec.inputPath), ch7Rec};
  };

  // B10-1: Corrupt historical report JSON -> R2_HISTORICAL_REPORT_CORRUPT
  {
    const {dir, reportAbs} = b10BaseSetup();
    fs.writeFileSync(reportAbs, '{corrupt json', 'utf8');
    const res = precheckChapterV2(dir, 8);
    assert.equal(res.blocking, true);
    assert.ok(res.hardErrors.some(e => e.reason === 'R2_HISTORICAL_REPORT_CORRUPT'));
  }

  // B10-2: Delete chapter 7 hash from historical report -> R2_HISTORICAL_REPORT_HASHES_INVALID
  {
    const {dir, reportAbs} = b10BaseSetup();
    const r = JSON.parse(fs.readFileSync(reportAbs, 'utf8'));
    delete r.manuscriptHashes['7'];
    fs.writeFileSync(reportAbs, JSON.stringify(r, null, 2) + '\n', 'utf8');
    const res = precheckChapterV2(dir, 8);
    assert.equal(res.blocking, true);
    assert.ok(res.hardErrors.some(e => e.reason === 'R2_HISTORICAL_REPORT_HASHES_INVALID'));
  }

  // B10-3: Tamper kind, end, and revision separately in historical report -> R2_HISTORICAL_REPORT_INVALID
  for (const mutate of [
    r => { r.kind = 'arc'; },
    r => { r.end = 99; },
    r => { r.revision = 9; },
  ]) {
    const {dir, reportAbs} = b10BaseSetup();
    const r = JSON.parse(fs.readFileSync(reportAbs, 'utf8'));
    mutate(r);
    fs.writeFileSync(reportAbs, JSON.stringify(r, null, 2) + '\n', 'utf8');
    const res = precheckChapterV2(dir, 8);
    assert.equal(res.blocking, true);
    assert.ok(res.hardErrors.some(e => e.reason === 'R2_HISTORICAL_REPORT_INVALID'));
  }

  // B10-4: Delete paired input-*.json packet -> R2_HISTORICAL_PACKET_MISSING
  {
    const {dir, inputAbs} = b10BaseSetup();
    fs.rmSync(inputAbs);
    const res = precheckChapterV2(dir, 8);
    assert.equal(res.blocking, true);
    assert.ok(res.hardErrors.some(e => e.reason === 'R2_HISTORICAL_PACKET_MISSING'));
  }

  // B10-5: Paired input-*.json hash differs from report-*.json -> R2_HISTORICAL_PACKET_MISMATCH
  {
    const {dir, inputAbs} = b10BaseSetup();
    const pkt = JSON.parse(fs.readFileSync(inputAbs, 'utf8'));
    pkt.manuscriptHashes['7'] = sha256(Buffer.from('different-hash', 'utf8'));
    fs.writeFileSync(inputAbs, JSON.stringify(pkt, null, 2) + '\n', 'utf8');
    const res = precheckChapterV2(dir, 8);
    assert.equal(res.blocking, true);
    assert.ok(res.hardErrors.some(e => e.reason === 'R2_HISTORICAL_PACKET_MISMATCH'));
  }

  // B10-6 (P1 SHA anchor): Rewriting decision pass_candidate -> revise after prepare is caught by R3_P1_HISTORY_CHANGED
  {
    const p1DowngradeDir = makeTempProject(t, {
      plan: {
        minWordsPerChapter: 3000,
        chapters: [
          {chapterNumber: 7, title: '第七章', filePath: 'chapters/ch007.md', status: 'completed'},
          {chapterNumber: 8, title: '第八章', filePath: 'chapters/ch008.md', status: 'draft'},
        ],
      },
      chapters: {'chapters/ch007.md': ch7Orig, 'chapters/ch008.md': ch8Draft},
    });
    const snap7 = writeCanonicalSnapshot(p1DowngradeDir, 'reviews/r3/manuscripts/chapter-7/v1', {'chapter-0007.md': ch7Orig});
    const rec7 = writeReviewBundle(p1DowngradeDir, 'chapter', 7, {7: ch7Orig}, {revision: 1, p1Protocol: true, r3Snapshot: snap7});
    // Tamper Ch 7, simulate prepare overwrite, AND rewrite v1 report decision to 'revise'
    fs.writeFileSync(path.join(p1DowngradeDir, 'chapters/ch007.md'), ch7Tampered, 'utf8');
    const rep7 = JSON.parse(fs.readFileSync(path.join(p1DowngradeDir, rec7.reviewPath), 'utf8'));
    rep7.decision = 'revise';
    fs.writeFileSync(path.join(p1DowngradeDir, rec7.reviewPath), JSON.stringify(rep7, null, 2) + '\n', 'utf8');
    const p = JSON.parse(fs.readFileSync(path.join(p1DowngradeDir, '02-写作计划.json'), 'utf8'));
    p.v3 = {
      schemaVersion: 1,
      r2: {
        schemaVersion: 1,
        chapterReviews: {
          '7': {
            status: 'under_review',
            revision: 2,
            inputPath: 'reviews/r2/input-ch007-v2.json',
            inputSha256: sha256(Buffer.from('v2', 'utf8')),
            reviewPath: null,
            reviewSha256: null,
            manuscriptHashes: {'7': sha256(Buffer.from(ch7Tampered, 'utf8'))},
          },
        },
        arcReviews: {},
      },
      r3: {
        schemaVersion: 1,
        mode: 'experimental',
        p1: {
          schemaVersion: 1,
          baselineUpto: 0,
          projectId: 'proj-b10-p1',
          legacyReviews: {},
          reviewHistory: [{kind: 'chapter', end: 7, revision: 1, path: rec7.reviewPath, sha256: rec7.reviewSha256}],
        },
      },
    };
    fs.writeFileSync(path.join(p1DowngradeDir, '02-写作计划.json'), JSON.stringify(p, null, 2) + '\n', 'utf8');
    const res = precheckChapterV2(p1DowngradeDir, 8);
    assert.equal(res.blocking, true);
    assert.ok(res.hardErrors.some(e => e.reason === 'R3_P1_HISTORY_CHANGED'));
  }

  // --- B11: P1 reviewHistory full readFeedback() scope/revision/p1 metadata & complete manuscriptHashes checks ---
  const makeP1HistoryCase = (mutator, expectedReason) => {
    const d = makeTempProject(t, {
      plan: {
        minWordsPerChapter: 3000,
        chapters: [
          {chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md', status: 'completed'},
          {chapterNumber: 2, title: '第二章', filePath: 'chapters/ch002.md', status: 'draft'},
        ],
      },
      chapters: {'chapters/ch001.md': ch1Txt, 'chapters/ch002.md': ch2Txt},
    });
    const rel = 'reviews/r3/custom-history-ch1-v1.json';
    const reportObj = {
      schemaVersion: 1,
      kind: 'chapter',
      end: 1,
      revision: 1,
      decision: 'pass_candidate',
      manuscriptHashes: {'1': sha256(Buffer.from(ch1Txt, 'utf8'))},
      p1: {schemaVersion: 1, literaryStatus: 'UNVERIFIED'},
    };
    mutator(reportObj);
    const bytes = Buffer.from(JSON.stringify(reportObj, null, 2) + '\n', 'utf8');
    fs.mkdirSync(path.join(d, 'reviews/r3'), {recursive: true});
    fs.writeFileSync(path.join(d, rel), bytes);
    const p = JSON.parse(fs.readFileSync(path.join(d, '02-写作计划.json'), 'utf8'));
    p.v3 = {
      schemaVersion: 1,
      r2: {schemaVersion: 1, chapterReviews: {}, arcReviews: {}},
      r3: {
        schemaVersion: 1,
        mode: 'experimental',
        p1: {
          schemaVersion: 1,
          baselineUpto: 0,
          projectId: 'proj-b11',
          legacyReviews: {},
          reviewHistory: [{kind: 'chapter', end: 1, revision: 1, path: rel, sha256: sha256(bytes)}],
        },
      },
    };
    fs.writeFileSync(path.join(d, '02-写作计划.json'), JSON.stringify(p, null, 2) + '\n', 'utf8');
    const res = precheckChapterV2(d, 2);
    assert.equal(res.blocking, true, `Expected blocking for ${expectedReason}`);
    assert.ok(res.hardErrors.some(e => e.reason === expectedReason), `Expected ${expectedReason}, got: ${JSON.stringify(res.hardErrors)}`);
  };

  makeP1HistoryCase(r => { r.end = 2; }, 'R3_P1_HISTORY_INVALID');
  makeP1HistoryCase(r => { r.revision = 9; }, 'R3_P1_HISTORY_INVALID');
  makeP1HistoryCase(r => { delete r.p1; }, 'R3_P1_HISTORY_INVALID');
  makeP1HistoryCase(r => { r.p1.literaryStatus = 'VERIFIED'; }, 'R3_P1_HISTORY_INVALID');
  makeP1HistoryCase(r => { r.manuscriptHashes = {}; }, 'R3_P1_HISTORY_HASHES_INVALID');

  // --- B12: Bidirectional P1 registration consistency (cannot bypass by deleting reviewHistory or stripping p1) ---
  const b12P1BypassSetup = ({deleteSingle = false, emptyHistory = false, stripP1 = false, decision = 'revise', tamperText = true} = {}) => {
    const d = makeTempProject(t, {
      plan: {
        minWordsPerChapter: 3000,
        chapters: [
          {chapterNumber: 6, title: '第六章', filePath: 'chapters/ch006.md', status: 'completed'},
          {chapterNumber: 7, title: '第七章', filePath: 'chapters/ch007.md', status: 'completed'},
          {chapterNumber: 8, title: '第八章', filePath: 'chapters/ch008.md', status: 'draft'},
        ],
      },
      chapters: {'chapters/ch006.md': ch1Txt, 'chapters/ch007.md': ch7Orig, 'chapters/ch008.md': ch8Draft},
    });
    const snap6 = writeCanonicalSnapshot(d, 'reviews/r3/manuscripts/chapter-6/v1', {'chapter-0006.md': ch1Txt});
    const rec6 = writeReviewBundle(d, 'chapter', 6, {6: ch1Txt}, {revision: 1, p1Protocol: true, r3Snapshot: snap6});
    const snap7 = writeCanonicalSnapshot(d, 'reviews/r3/manuscripts/chapter-7/v1', {'chapter-0007.md': ch7Orig});
    const rec7 = writeReviewBundle(d, 'chapter', 7, {7: ch7Orig}, {revision: 1, p1Protocol: true, r3Snapshot: snap7});

    if (tamperText) {
      fs.writeFileSync(path.join(d, 'chapters/ch007.md'), ch7Tampered, 'utf8');
    }
    const rep7 = JSON.parse(fs.readFileSync(path.join(d, rec7.reviewPath), 'utf8'));
    rep7.decision = decision;
    fs.writeFileSync(path.join(d, rec7.reviewPath), JSON.stringify(rep7, null, 2) + '\n', 'utf8');

    const p = JSON.parse(fs.readFileSync(path.join(d, '02-写作计划.json'), 'utf8'));
    const history = [
      {kind: 'chapter', end: 6, revision: 1, path: rec6.reviewPath, sha256: rec6.reviewSha256},
      {kind: 'chapter', end: 7, revision: 1, path: rec7.reviewPath, sha256: rec7.reviewSha256},
    ];
    p.v3 = {
      schemaVersion: 1,
      r2: {
        schemaVersion: 1,
        chapterReviews: {
          '6': rec6,
          '7': {
            status: 'under_review',
            revision: 2,
            inputPath: 'reviews/r2/input-ch007-v2.json',
            inputSha256: sha256(Buffer.from('v2', 'utf8')),
            reviewPath: null,
            reviewSha256: null,
            manuscriptHashes: {'7': sha256(Buffer.from(tamperText ? ch7Tampered : ch7Orig, 'utf8'))},
          },
        },
        arcReviews: {},
      },
      r3: {
        schemaVersion: 1,
        mode: 'experimental',
        ...(stripP1 ? {} : {
          p1: {
            schemaVersion: 1,
            baselineUpto: 0,
            projectId: 'proj-b12',
            legacyReviews: {},
            reviewHistory: emptyHistory ? [] : (deleteSingle ? [history[0]] : history),
          },
        }),
      },
    };
    fs.writeFileSync(path.join(d, '02-写作计划.json'), JSON.stringify(p, null, 2) + '\n', 'utf8');
    return {dir: d, rec7};
  };

  // B12-1: Delete single reviewHistory entry for Ch 7 + downgrade decision to revise + tamper Ch 7 -> R3_P1_HISTORY_UNREGISTERED_REPORT
  {
    const {dir} = b12P1BypassSetup({deleteSingle: true, decision: 'revise', tamperText: true});
    const res = precheckChapterV2(dir, 8);
    assert.equal(res.blocking, true);
    assert.ok(res.hardErrors.some(e => e.reason === 'R3_P1_HISTORY_UNREGISTERED_REPORT'));
  }

  // B12-2: Empty reviewHistory [] + downgrade decision + tamper Ch 7 -> R3_P1_HISTORY_UNREGISTERED_REPORT
  {
    const {dir} = b12P1BypassSetup({emptyHistory: true, decision: 'revise', tamperText: true});
    const res = precheckChapterV2(dir, 8);
    assert.equal(res.blocking, true);
    assert.ok(res.hardErrors.some(e => e.reason === 'R3_P1_HISTORY_UNREGISTERED_REPORT'));
  }

  // B12-3: Strip entire v3.r3.p1 state from plan + downgrade decision + tamper Ch 7 -> R3_P1_STATE_MISSING_FOR_P1_REPORT
  {
    const {dir} = b12P1BypassSetup({stripP1: true, decision: 'revise', tamperText: true});
    const res = precheckChapterV2(dir, 8);
    assert.equal(res.blocking, true);
    assert.ok(res.hardErrors.some(e => e.reason === 'R3_P1_STATE_MISSING_FOR_P1_REPORT'));
    assert.ok(res.hardErrors.some(e => e.reason === 'R3_P1_STATE_MISSING_FOR_P1_PACKET'));
  }

  // B12-4: Non-pass_candidate P1 reports ('revise' and 'reject') missing from reviewHistory must still fail closed
  for (const dec of ['revise', 'reject']) {
    const {dir} = b12P1BypassSetup({deleteSingle: true, decision: dec, tamperText: false});
    const res = precheckChapterV2(dir, 8);
    assert.equal(res.blocking, true, `Unregistered P1 ${dec} report must block`);
    assert.ok(res.hardErrors.some(e => e.reason === 'R3_P1_HISTORY_UNREGISTERED_REPORT'));
  }

  // B12-5: P1 project with legacyReviews registration (positive control + downgrade + delete legacyReviews)
  {
    const d = makeTempProject(t, {
      plan: {
        minWordsPerChapter: 3000,
        chapters: [
          {chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md', status: 'completed'},
          {chapterNumber: 2, title: '第二章', filePath: 'chapters/ch002.md', status: 'draft'},
        ],
      },
      chapters: {'chapters/ch001.md': ch1Txt, 'chapters/ch002.md': ch2Txt},
    });
    const snap1 = writeCanonicalSnapshot(d, 'reviews/r3/manuscripts/chapter-1/v1', {'chapter-0001.md': ch1Txt});
    const leg1 = writeReviewBundle(d, 'chapter', 1, {1: ch1Txt}, {revision: 1, p1Protocol: false, r3Snapshot: snap1});
    const p = JSON.parse(fs.readFileSync(path.join(d, '02-写作计划.json'), 'utf8'));
    p.v3 = {
      schemaVersion: 1,
      r2: {schemaVersion: 1, chapterReviews: {'1': leg1}, arcReviews: {}},
      r3: {
        schemaVersion: 1,
        mode: 'experimental',
        p1: {
          schemaVersion: 1,
          baselineUpto: 1,
          projectId: 'proj-b12-leg',
          legacyReviews: {
            'chapter:1': {inputSha256: leg1.inputSha256, reviewSha256: leg1.reviewSha256, reviewPath: leg1.reviewPath},
          },
          reviewHistory: [],
        },
      },
    };
    fs.writeFileSync(path.join(d, '02-写作计划.json'), JSON.stringify(p, null, 2) + '\n', 'utf8');
    // Positive control
    const okRes = precheckChapterV2(d, 2);
    assert.equal(okRes.blocking, false, `Valid P1 legacyReviews baseline should pass, got: ${JSON.stringify(okRes.hardErrors)}`);

    // Downgrade legacy report decision to revise after prepare overwrite + edit Ch 1 -> R3_P1_LEGACY_REVIEW_CHANGED
    const ch1Mod = ch1Txt + '\n篡改一行。\n';
    fs.writeFileSync(path.join(d, 'chapters/ch001.md'), ch1Mod, 'utf8');
    const rep1 = JSON.parse(fs.readFileSync(path.join(d, leg1.reviewPath), 'utf8'));
    rep1.decision = 'revise';
    fs.writeFileSync(path.join(d, leg1.reviewPath), JSON.stringify(rep1, null, 2) + '\n', 'utf8');
    p.v3.r2.chapterReviews['1'] = {
      status: 'under_review', revision: 2,
      inputPath: 'reviews/r2/input-ch001-v2.json', inputSha256: sha256(Buffer.from('v2', 'utf8')),
      reviewPath: null, reviewSha256: null,
      manuscriptHashes: {'1': sha256(Buffer.from(ch1Mod, 'utf8'))},
    };
    fs.writeFileSync(path.join(d, '02-写作计划.json'), JSON.stringify(p, null, 2) + '\n', 'utf8');
    const resLegChanged = precheckChapterV2(d, 2);
    assert.equal(resLegChanged.blocking, true);
    assert.ok(resLegChanged.hardErrors.some(e => e.reason === 'R3_P1_LEGACY_REVIEW_CHANGED'));

    // Also deleting legacyReviews['chapter:1'] -> R3_P1_UNREGISTERED_LEGACY_REVIEW
    delete p.v3.r3.p1.legacyReviews['chapter:1'];
    fs.writeFileSync(path.join(d, '02-写作计划.json'), JSON.stringify(p, null, 2) + '\n', 'utf8');
    const resLegDeleted = precheckChapterV2(d, 2);
    assert.equal(resLegDeleted.blocking, true);
    assert.ok(resLegDeleted.hardErrors.some(e => e.reason === 'R3_P1_UNREGISTERED_LEGACY_REVIEW'));
  }

  // --- B13: Report rename in reviews/r2/, P1 deletion detection, and explicit legacy non-P1 deletion boundary ---
  // B13-1: Legacy R2 historical report renamed inside reviews/r2/ after prepare overwrite -> R2_HISTORICAL_UNEXPECTED_FILE
  for (const renamed of ['archived-ch007-v1.json', 'report-ch007-v1.json.bak']) {
    const {dir, reportAbs} = b10BaseSetup();
    fs.renameSync(reportAbs, path.join(dir, 'reviews/r2', renamed));
    const res = precheckChapterV2(dir, 8);
    assert.equal(res.blocking, true, `Renaming report to ${renamed} inside reviews/r2/ must block`);
    assert.ok(res.hardErrors.some(e => e.reason === 'R2_HISTORICAL_UNEXPECTED_FILE'));
  }

  // B13-2a: P1 reviewHistory registered report deleted (or moved outside reviews/r2/) after prepare overwrite -> R3_P1_HISTORY_FILE_MISSING
  {
    const {dir, rec7} = b12P1BypassSetup({deleteSingle: false, emptyHistory: false, stripP1: false, decision: 'pass_candidate', tamperText: true});
    fs.rmSync(path.join(dir, rec7.reviewPath));
    const res = precheckChapterV2(dir, 8);
    assert.equal(res.blocking, true);
    assert.ok(res.hardErrors.some(e => e.reason === 'R3_P1_HISTORY_FILE_MISSING'));
  }

  // B13-2b: P1 legacyReviews registered report deleted after prepare overwrite -> R3_P1_LEGACY_FILE_MISSING
  {
    const d = makeTempProject(t, {
      plan: {
        minWordsPerChapter: 3000,
        chapters: [
          {chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md', status: 'completed'},
          {chapterNumber: 2, title: '第二章', filePath: 'chapters/ch002.md', status: 'draft'},
        ],
      },
      chapters: {'chapters/ch001.md': ch1Txt, 'chapters/ch002.md': ch2Txt},
    });
    const snap1 = writeCanonicalSnapshot(d, 'reviews/r3/manuscripts/chapter-1/v1', {'chapter-0001.md': ch1Txt});
    const leg1 = writeReviewBundle(d, 'chapter', 1, {1: ch1Txt}, {revision: 1, p1Protocol: false, r3Snapshot: snap1});
    const ch1Mod = ch1Txt + '\n篡改正文。\n';
    fs.writeFileSync(path.join(d, 'chapters/ch001.md'), ch1Mod, 'utf8');
    fs.rmSync(path.join(d, leg1.reviewPath));
    const p = JSON.parse(fs.readFileSync(path.join(d, '02-写作计划.json'), 'utf8'));
    p.v3 = {
      schemaVersion: 1,
      r2: {
        schemaVersion: 1,
        chapterReviews: {
          '1': {
            status: 'under_review', revision: 2,
            inputPath: 'reviews/r2/input-ch001-v2.json', inputSha256: sha256(Buffer.from('v2', 'utf8')),
            reviewPath: null, reviewSha256: null,
            manuscriptHashes: {'1': sha256(Buffer.from(ch1Mod, 'utf8'))},
          },
        },
        arcReviews: {},
      },
      r3: {
        schemaVersion: 1,
        mode: 'experimental',
        p1: {
          schemaVersion: 1,
          baselineUpto: 1,
          projectId: 'proj-b13-leg',
          legacyReviews: {
            'chapter:1': {inputSha256: leg1.inputSha256, reviewSha256: leg1.reviewSha256, reviewPath: leg1.reviewPath},
          },
          reviewHistory: [],
        },
      },
    };
    fs.writeFileSync(path.join(d, '02-写作计划.json'), JSON.stringify(p, null, 2) + '\n', 'utf8');
    const res = precheckChapterV2(d, 2);
    assert.equal(res.blocking, true);
    assert.ok(res.hardErrors.some(e => e.reason === 'R3_P1_LEGACY_FILE_MISSING'));
  }

  // B13-3: Explicit legacy non-P1 deletion trust boundary (documenting limitation honestly, plus finalizedSha256 mitigation)
  {
    const {dir, reportAbs} = b10BaseSetup();
    fs.rmSync(reportAbs);
    // Without P1 registration or explicit finalizedSha256, deleting report-ch007-v1.json after prepare overwrite
    // leaves an orphaned input-ch007-v1.json indistinguishable from an abandoned under_review prepare.
    const resBoundary = precheckChapterV2(dir, 8);
    assert.equal(resBoundary.blocking, false);

    // Pre-P1 mitigation: recording explicit finalizedSha256 on Chapter 7 immediately restores Fail-Closed detection
    const p = JSON.parse(fs.readFileSync(path.join(dir, '02-写作计划.json'), 'utf8'));
    p.chapters.find(c => c.chapterNumber === 7).finalizedSha256 = sha256(Buffer.from(ch7Orig, 'utf8'));
    fs.writeFileSync(path.join(dir, '02-写作计划.json'), JSON.stringify(p, null, 2) + '\n', 'utf8');
    const resMitigated = precheckChapterV2(dir, 8);
    assert.equal(resMitigated.blocking, true);
    assert.ok(resMitigated.hardErrors.some(e => e.code === 'STALE_REVIEW_AFTER_EDIT' && e.chapter === 7));
  }

  // --- B14: Multi-revision legitimate pre-P1 legacy reviews after P1 activation (zero false blocking + latest tamper/delete still blocks) ---
  // B14-1: Chapter 1 passed in v1 AND passed again in v2 with unchanged text; P1 activate registers ONLY latest v2 -> MUST NOT block
  {
    const d = makeTempProject(t, {
      plan: {
        minWordsPerChapter: 3000,
        chapters: [
          {chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md', status: 'completed'},
          {chapterNumber: 2, title: '第二章', filePath: 'chapters/ch002.md', status: 'draft'},
        ],
      },
      chapters: {'chapters/ch001.md': ch1Txt, 'chapters/ch002.md': ch2Txt},
    });
    const snap1 = writeCanonicalSnapshot(d, 'reviews/r3/manuscripts/chapter-1/v1', {'chapter-0001.md': ch1Txt});
    writeReviewBundle(d, 'chapter', 1, {1: ch1Txt}, {revision: 1, p1Protocol: false, r3Snapshot: snap1, decision: 'pass_candidate'});
    const snap2 = writeCanonicalSnapshot(d, 'reviews/r3/manuscripts/chapter-1/v2', {'chapter-0001.md': ch1Txt});
    const recV2 = writeReviewBundle(d, 'chapter', 1, {1: ch1Txt}, {revision: 2, p1Protocol: false, r3Snapshot: snap2, decision: 'pass_candidate'});
    const p = JSON.parse(fs.readFileSync(path.join(d, '02-写作计划.json'), 'utf8'));
    p.v3 = {
      schemaVersion: 1,
      r2: {schemaVersion: 1, chapterReviews: {'1': recV2}, arcReviews: {}},
      r3: {
        schemaVersion: 1,
        mode: 'experimental',
        p1: {
          schemaVersion: 1,
          baselineUpto: 1,
          projectId: 'proj-b14-ch',
          legacyReviews: {
            'chapter:1': {inputSha256: recV2.inputSha256, reviewSha256: recV2.reviewSha256, reviewPath: recV2.reviewPath},
          },
          reviewHistory: [],
        },
      },
    };
    fs.writeFileSync(path.join(d, '02-写作计划.json'), JSON.stringify(p, null, 2) + '\n', 'utf8');

    const resOk = precheckChapterV2(d, 2);
    assert.equal(resOk.blocking, false, `Multi-pass pre-P1 chapter (v1+v2 passed, v2 registered) must NOT block, got: ${JSON.stringify(resOk.hardErrors)}`);
    assert.equal(resOk.hardErrors.length, 0);

    // B14-1b (1): Injecting an unregistered newer legacy v3 (> registered v2) must STILL block -> R3_P1_UNREGISTERED_LEGACY_REVIEW
    const snap3 = writeCanonicalSnapshot(d, 'reviews/r3/manuscripts/chapter-1/v3', {'chapter-0001.md': ch1Txt});
    const recV3 = writeReviewBundle(d, 'chapter', 1, {1: ch1Txt}, {revision: 3, p1Protocol: false, r3Snapshot: snap3, decision: 'pass_candidate'});
    const resV3 = precheckChapterV2(d, 2);
    assert.equal(resV3.blocking, true);
    assert.ok(resV3.hardErrors.some(e => e.reason === 'R3_P1_UNREGISTERED_LEGACY_REVIEW'));
    fs.rmSync(path.join(d, recV3.inputPath));
    fs.rmSync(path.join(d, recV3.reviewPath));

    // B14-1b (2): Tampering registered latest v2 report must STILL block -> R3_P1_LEGACY_REVIEW_CHANGED
    const v2OrigBytes = fs.readFileSync(path.join(d, recV2.reviewPath));
    const v2Obj = JSON.parse(v2OrigBytes.toString('utf8'));
    v2Obj.summary = 'tampered summary';
    fs.writeFileSync(path.join(d, recV2.reviewPath), JSON.stringify(v2Obj, null, 2) + '\n', 'utf8');
    const resV2Tamper = precheckChapterV2(d, 2);
    assert.equal(resV2Tamper.blocking, true);
    assert.ok(resV2Tamper.hardErrors.some(e => e.reason === 'R3_P1_LEGACY_REVIEW_CHANGED'));

    // B14-1b (3): Deleting registered latest v2 report must STILL block -> R3_P1_LEGACY_FILE_MISSING
    fs.rmSync(path.join(d, recV2.reviewPath));
    const resV2Delete = precheckChapterV2(d, 2);
    assert.equal(resV2Delete.blocking, true);
    assert.ok(resV2Delete.hardErrors.some(e => e.reason === 'R3_P1_LEGACY_FILE_MISSING'));
  }

  // B14-2: Chapter 1 v1 'revise' on older draft -> edited -> v2 'pass_candidate' registered in legacyReviews -> MUST NOT block
  {
    const ch1OldDraft = ch1Txt + '\n初稿未修句。\n';
    const d = makeTempProject(t, {
      plan: {
        minWordsPerChapter: 3000,
        chapters: [
          {chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md', status: 'completed'},
          {chapterNumber: 2, title: '第二章', filePath: 'chapters/ch002.md', status: 'draft'},
        ],
      },
      chapters: {'chapters/ch001.md': ch1Txt, 'chapters/ch002.md': ch2Txt},
    });
    const snap1 = writeCanonicalSnapshot(d, 'reviews/r3/manuscripts/chapter-1/v1', {'chapter-0001.md': ch1OldDraft});
    writeReviewBundle(d, 'chapter', 1, {1: ch1OldDraft}, {revision: 1, p1Protocol: false, r3Snapshot: snap1, decision: 'revise'});
    const snap2 = writeCanonicalSnapshot(d, 'reviews/r3/manuscripts/chapter-1/v2', {'chapter-0001.md': ch1Txt});
    const recV2 = writeReviewBundle(d, 'chapter', 1, {1: ch1Txt}, {revision: 2, p1Protocol: false, r3Snapshot: snap2, decision: 'pass_candidate'});
    const p = JSON.parse(fs.readFileSync(path.join(d, '02-写作计划.json'), 'utf8'));
    p.v3 = {
      schemaVersion: 1,
      r2: {schemaVersion: 1, chapterReviews: {'1': recV2}, arcReviews: {}},
      r3: {
        schemaVersion: 1,
        mode: 'experimental',
        p1: {
          schemaVersion: 1,
          baselineUpto: 1,
          projectId: 'proj-b14-revise',
          legacyReviews: {
            'chapter:1': {inputSha256: recV2.inputSha256, reviewSha256: recV2.reviewSha256, reviewPath: recV2.reviewPath},
          },
          reviewHistory: [],
        },
      },
    };
    fs.writeFileSync(path.join(d, '02-写作计划.json'), JSON.stringify(p, null, 2) + '\n', 'utf8');
    const res = precheckChapterV2(d, 2);
    assert.equal(res.blocking, false, `Pre-P1 v1 revise -> v2 pass_candidate must NOT block, got: ${JSON.stringify(res.hardErrors)}`);
  }

  // B14-3: Arc scope multi-revision pre-P1 (arc:6 v1 revise + v2 pass_candidate + v3 pass_candidate, P1 registers ONLY v3)
  {
    const ch4OldDraft = ch4 + '\n旧卷草稿。\n';
    const d = makeTempProject(t, {
      plan: {
        minWordsPerChapter: 3000,
        chapters: [
          {chapterNumber: 4, title: '第四章', filePath: 'chapters/ch004.md', status: 'completed'},
          {chapterNumber: 5, title: '第五章', filePath: 'chapters/ch005.md', status: 'completed'},
          {chapterNumber: 6, title: '第六章', filePath: 'chapters/ch006.md', status: 'completed'},
          {chapterNumber: 7, title: '第七章', filePath: 'chapters/ch007.md', status: 'draft'},
        ],
      },
      chapters: {'chapters/ch004.md': ch4, 'chapters/ch005.md': ch5, 'chapters/ch006.md': ch6, 'chapters/ch007.md': ch7Orig},
    });
    const chRecs = {};
    const legacyReviews = {};
    for (const [n, txt] of [[4, ch4], [5, ch5], [6, ch6]]) {
      const sn = writeCanonicalSnapshot(d, `reviews/r3/manuscripts/chapter-${n}/v1`, {[`chapter-000${n}.md`]: txt});
      const rec = writeReviewBundle(d, 'chapter', n, {[n]: txt}, {revision: 1, p1Protocol: false, r3Snapshot: sn});
      chRecs[String(n)] = rec;
      legacyReviews[`chapter:${n}`] = {inputSha256: rec.inputSha256, reviewSha256: rec.reviewSha256, reviewPath: rec.reviewPath};
    }
    const arcSnap1 = writeCanonicalSnapshot(d, 'reviews/r3/manuscripts/arc-6/v1', {'chapter-0004.md': ch4OldDraft, 'chapter-0005.md': ch5, 'chapter-0006.md': ch6});
    writeReviewBundle(d, 'arc', 6, {4: ch4OldDraft, 5: ch5, 6: ch6}, {revision: 1, p1Protocol: false, r3Snapshot: arcSnap1, decision: 'revise'});
    const arcSnap2 = writeCanonicalSnapshot(d, 'reviews/r3/manuscripts/arc-6/v2', {'chapter-0004.md': ch4, 'chapter-0005.md': ch5, 'chapter-0006.md': ch6});
    writeReviewBundle(d, 'arc', 6, {4: ch4, 5: ch5, 6: ch6}, {revision: 2, p1Protocol: false, r3Snapshot: arcSnap2, decision: 'pass_candidate'});
    const arcSnap3 = writeCanonicalSnapshot(d, 'reviews/r3/manuscripts/arc-6/v3', {'chapter-0004.md': ch4, 'chapter-0005.md': ch5, 'chapter-0006.md': ch6});
    const arcV3 = writeReviewBundle(d, 'arc', 6, {4: ch4, 5: ch5, 6: ch6}, {revision: 3, p1Protocol: false, r3Snapshot: arcSnap3, decision: 'pass_candidate'});
    legacyReviews['arc:6'] = {inputSha256: arcV3.inputSha256, reviewSha256: arcV3.reviewSha256, reviewPath: arcV3.reviewPath};

    const p = JSON.parse(fs.readFileSync(path.join(d, '02-写作计划.json'), 'utf8'));
    p.v3 = {
      schemaVersion: 1,
      r2: {schemaVersion: 1, chapterReviews: chRecs, arcReviews: {'6': arcV3}},
      r3: {
        schemaVersion: 1,
        mode: 'experimental',
        p1: {
          schemaVersion: 1,
          baselineUpto: 6,
          projectId: 'proj-b14-arc',
          legacyReviews,
          reviewHistory: [],
        },
      },
    };
    fs.writeFileSync(path.join(d, '02-写作计划.json'), JSON.stringify(p, null, 2) + '\n', 'utf8');

    const resArcOk = precheckChapterV2(d, 7);
    assert.equal(resArcOk.blocking, false, `Multi-revision pre-P1 arc (v1 revise + v2/v3 passed, v3 registered) must NOT block, got: ${JSON.stringify(resArcOk.hardErrors)}`);

    // Deleting registered latest arc v3 must STILL block -> R3_P1_LEGACY_FILE_MISSING
    fs.rmSync(path.join(d, arcV3.reviewPath));
    const resArcDel = precheckChapterV2(d, 7);
    assert.equal(resArcDel.blocking, true);
    assert.ok(resArcDel.hardErrors.some(e => e.reason === 'R3_P1_LEGACY_FILE_MISSING'));
  }
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

  // 7. Scale performance with 50 finalized chapters + 100 historical reviews/r2/*.json files (< 250ms)
  const scaleChapters = {};
  const scalePlanChapters = [];
  const scaleChapterReviews = {};
  const scaleExtraFiles = {};
  for (let n = 1; n <= 50; n++) {
    const txt = `# 第${n}章 历史卷章\n\n` + `第${n}章正文内容记录青石巷盐引与码头往事，风声渐急。`.repeat(15) + '\n';
    const rel = `chapters/ch${String(n).padStart(3, '0')}.md`;
    const h = sha256(Buffer.from(txt, 'utf8'));
    scaleChapters[rel] = txt;
    scalePlanChapters.push({chapterNumber: n, title: `第${n}章`, filePath: rel, status: 'completed'});
    const pad = String(n).padStart(3, '0');
    const inRel = `reviews/r2/input-ch${pad}-v1.json`;
    const repRel = `reviews/r2/report-ch${pad}-v1.json`;
    const inBytes = Buffer.from(JSON.stringify({
      schemaVersion: 1, kind: 'chapter', end: n, revision: 1,
      manuscriptHashes: {[String(n)]: h},
      writers: [{chapter: n, runId: `w-${n}`, contextId: `wc-${n}`}],
    }, null, 2) + '\n', 'utf8');
    const repBytes = Buffer.from(JSON.stringify({
      schemaVersion: 1, kind: 'chapter', end: n, revision: 1,
      manuscriptHashes: {[String(n)]: h},
      reviewer: {kind: 'independent_agent', runId: `r-${n}`, contextId: `rc-${n}`},
      decision: 'pass_candidate', summary: 'ok', issues: [],
    }, null, 2) + '\n', 'utf8');
    scaleExtraFiles[inRel] = inBytes;
    scaleExtraFiles[repRel] = repBytes;
    scaleChapterReviews[String(n)] = {
      status: 'passed', revision: 1,
      inputPath: inRel, inputSha256: sha256(inBytes),
      reviewPath: repRel, reviewSha256: sha256(repBytes),
      manuscriptHashes: {[String(n)]: h},
    };
  }
  scaleChapters['chapters/ch051.md'] = chapter5k;
  scalePlanChapters.push({chapterNumber: 51, title: '第五十一章', filePath: 'chapters/ch051.md', status: 'draft'});
  const scaleDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      maxWordsPerChapter: 5500,
      chapters: scalePlanChapters,
      v3: {schemaVersion: 1, r2: {schemaVersion: 1, chapterReviews: scaleChapterReviews, arcReviews: {}}},
    },
    chapters: scaleChapters,
    extraFiles: scaleExtraFiles,
  });
  const scaleT0 = performance.now();
  const scaleRes = precheckChapterV2(scaleDir, 51, {dryRun: true});
  const scaleElapsed = performance.now() - scaleT0;
  assert.equal(scaleRes.blocking, false, `50-chapter historical baseline should pass, got: ${JSON.stringify(scaleRes.hardErrors)}`);
  assert.ok(scaleElapsed < 250, `Expected <250ms with 50 historical chapters (100 R2 files), got ${scaleElapsed.toFixed(2)}ms`);

  // 8. Static read-only code audit on precheck_chapter.mjs & precheck_v2_common.mjs (strip comments first)
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
