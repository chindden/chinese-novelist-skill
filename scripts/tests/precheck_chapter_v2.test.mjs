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

  // 8. B1: Finalized chapter tampering & strict 3-step retcon recovery protocol (frozen Doc 06 §2.4 & §5.2)
  const ch1Original = makeProseOfChineseWords(3200);
  const ch1Edited = ch1Original + '\n经正式 retcon 修订后新增的剧情衔接段落。\n';
  const ch2Text = makeProseOfChineseWords(3200);
  const ch3Draft = makeProseOfChineseWords(3200);
  const ch1OrigHash = sha256(Buffer.from(ch1Original, 'utf8'));
  const ch1EditedHash = sha256(Buffer.from(ch1Edited, 'utf8'));
  const ch2Hash = sha256(Buffer.from(ch2Text, 'utf8'));
  const ch3Hash = sha256(Buffer.from(ch3Draft, 'utf8'));

  // 8a. Unauthorized tamper -> STALE_REVIEW_AFTER_EDIT (blocking=true)
  const tamperDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [
        {chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md', status: 'completed'},
        {chapterNumber: 2, title: '第二章', filePath: 'chapters/ch002.md', status: 'completed'},
        {chapterNumber: 3, title: '第三章', filePath: 'chapters/ch003.md', status: 'draft'},
      ],
      v3: {
        pilot: {
          status: 'approved',
          manuscriptHashes: {'1': ch1OrigHash, '2': ch2Hash, '3': ch3Hash},
        },
        r2: {
          schemaVersion: 1,
          chapterReviews: {
            '1': {status: 'passed', revision: 1, manuscriptHashes: {'1': ch1OrigHash}},
            '2': {status: 'passed', revision: 1, manuscriptHashes: {'2': ch2Hash}},
          },
        },
      },
    },
    chapters: {
      'chapters/ch001.md': ch1Edited,
      'chapters/ch002.md': ch2Text,
      'chapters/ch003.md': ch3Draft,
    },
  });
  const resTamper = precheckChapterV2(tamperDir, 3);
  assert.equal(resTamper.blocking, true);
  assert.ok(resTamper.hardErrors.some(e => e.code === 'STALE_REVIEW_AFTER_EDIT' && e.chapter === 1));

  // 8b. Approval-only retcon (NO snapshot, NO re-review, NO updated manuscriptHashes) MUST STILL BLOCK!
  fs.mkdirSync(path.join(tamperDir, 'reviews/r3/retcons'), {recursive: true});
  fs.writeFileSync(
    path.join(tamperDir, 'reviews/r3/retcons/retcon-001-approval.json'),
    JSON.stringify({status: 'approved', chapter: 1, newSha256: ch1EditedHash}, null, 2),
    'utf8',
  );
  const resApprovalOnly = precheckChapterV2(tamperDir, 3);
  assert.equal(resApprovalOnly.blocking, true, 'Standalone retcon approval MUST NOT lift STALE_REVIEW_AFTER_EDIT');
  assert.ok(resApprovalOnly.hardErrors.some(e => e.code === 'STALE_REVIEW_AFTER_EDIT' && e.chapter === 1));

  // 8c. Create verified r3_snapshots-style immutable directory snapshot on disk (Step 1)
  const snapRel = 'reviews/r3/retcons/snap-retcon-001';
  const snapAbs = path.join(tamperDir, snapRel);
  fs.mkdirSync(snapAbs, {recursive: true});
  fs.writeFileSync(path.join(snapAbs, 'ch001.md'), ch1Original, 'utf8');
  const snapManifest = {
    schemaVersion: 1,
    files: {'ch001.md': ch1OrigHash},
  };
  const snapManifestBytes = Buffer.from(JSON.stringify(snapManifest, null, 2) + '\n', 'utf8');
  fs.writeFileSync(path.join(snapAbs, 'manifest.json'), snapManifestBytes);
  const snapDigest = sha256(snapManifestBytes);

  // 8d. Partial recovery: Step 1 snapshot + R2 updated, BUT Pilot still holds old ch1OrigHash -> MUST STILL BLOCK!
  const updatedReviewFile = 'reviews/r2/review-ch001-v2.json';
  const updatedReviewContent = JSON.stringify({schemaVersion: 1, decision: 'pass_candidate', revision: 2}, null, 2) + '\n';
  fs.mkdirSync(path.join(tamperDir, 'reviews/r2'), {recursive: true});
  fs.writeFileSync(path.join(tamperDir, updatedReviewFile), updatedReviewContent, 'utf8');
  const updatedReviewSha = sha256(Buffer.from(updatedReviewContent, 'utf8'));
  const newFingerprint = sha256(Buffer.from('ch1-retcon-v2-fingerprint', 'utf8'));

  const partialPlan = JSON.parse(fs.readFileSync(path.join(tamperDir, '02-写作计划.json'), 'utf8'));
  partialPlan.v3.r2.chapterReviews['1'] = {
    status: 'passed',
    revision: 2,
    manuscriptHashes: {'1': ch1EditedHash},
    reviewPath: updatedReviewFile,
    reviewSha256: updatedReviewSha,
    reviewFingerprint: newFingerprint,
  };
  fs.writeFileSync(path.join(tamperDir, '02-写作计划.json'), JSON.stringify(partialPlan, null, 2) + '\n', 'utf8');
  fs.writeFileSync(
    path.join(tamperDir, 'reviews/r3/retcons/retcon-001-approval.json'),
    JSON.stringify({
      status: 'approved',
      chapter: 1,
      snapshotPath: snapRel,
      snapshotSha256: snapDigest,
      newSha256: ch1EditedHash,
      reReviewRevision: 2,
      reviewFingerprint: newFingerprint,
      directImpactChapters: [2],
      reReviewRevisions: {'2': 2},
    }, null, 2),
    'utf8',
  );
  const resPartialPilotAndImpact = precheckChapterV2(tamperDir, 3);
  assert.equal(resPartialPilotAndImpact.blocking, true, 'Stale Pilot baseline and un-re-reviewed directImpactChapters MUST still block');
  assert.ok(resPartialPilotAndImpact.hardErrors.some(e => e.code === 'STALE_REVIEW_AFTER_EDIT' && e.source === 'v3.pilot'));
  assert.ok(resPartialPilotAndImpact.hardErrors.some(e => e.code === 'STALE_REVIEW_AFTER_EDIT' && e.chapter === 2));

  // 8e. Complete all 3 frozen recovery steps (verified snapshot + ch1 & directImpactChapters[2] re-reviewed + Pilot/R2/fingerprint updated) -> UNBLOCKS!
  partialPlan.v3.pilot.manuscriptHashes['1'] = ch1EditedHash;
  partialPlan.v3.r2.chapterReviews['2'] = {
    status: 'passed',
    revision: 2,
    manuscriptHashes: {'2': ch2Hash},
  };
  fs.writeFileSync(path.join(tamperDir, '02-写作计划.json'), JSON.stringify(partialPlan, null, 2) + '\n', 'utf8');
  const resFullRecovery = precheckChapterV2(tamperDir, 3);
  assert.equal(resFullRecovery.blocking, false, `Full 3-step retcon recovery should pass, got: ${JSON.stringify(resFullRecovery.hardErrors)}`);
  assert.equal(resFullRecovery.hardErrors.length, 0);

  // 8f. Tampering snapshot or mismatching reviewFingerprint breaks recovery again (Fail-Closed)
  fs.writeFileSync(path.join(snapAbs, 'ch001.md'), ch1Original + 'tamper', 'utf8');
  const resBrokenSnap = precheckChapterV2(tamperDir, 3);
  assert.equal(resBrokenSnap.blocking, true);
  assert.ok(resBrokenSnap.hardErrors.some(e => e.code === 'STALE_REVIEW_AFTER_EDIT'));

  // 9. B2: Fail-Closed when finalized records lack chapter mapping or valid SHA-256 (zero silent skip)
  // 9a. Finalized chapter deleted from plan.chapters
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

  // 9b. Passed chapterReviews entry missing / malformed SHA-256
  const missingReviewHashDir = makeTempProject(t, {
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
            '1': {status: 'passed', revision: 1, manuscriptHashes: {}},
          },
        },
      },
    },
    chapters: {'chapters/ch001.md': ch1Original, 'chapters/ch002.md': ch2Text},
  });
  const resMissingRevHash = precheckChapterV2(missingReviewHashDir, 2);
  assert.equal(resMissingRevHash.blocking, true);
  assert.ok(resMissingRevHash.hardErrors.some(e => e.code === 'STALE_REVIEW_AFTER_EDIT' && e.chapter === 1));

  // 9c. Approved Pilot missing or malformed manuscriptHashes
  const badPilotDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [
        {chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md', status: 'completed'},
        {chapterNumber: 2, title: '第二章', filePath: 'chapters/ch002.md', status: 'completed'},
        {chapterNumber: 3, title: '第三章', filePath: 'chapters/ch003.md', status: 'completed'},
        {chapterNumber: 4, title: '第四章', filePath: 'chapters/ch004.md', status: 'draft'},
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

  // 9d. Explicit chapter.finalizedSha256 malformed
  const badFinalizedFieldDir = makeTempProject(t, {
    plan: {
      minWordsPerChapter: 3000,
      chapters: [
        {chapterNumber: 1, title: '第一章', filePath: 'chapters/ch001.md', finalizedSha256: 'bad'},
        {chapterNumber: 2, title: '第二章', filePath: 'chapters/ch002.md'},
      ],
    },
    chapters: {'chapters/ch001.md': ch1Original, 'chapters/ch002.md': ch2Text},
  });
  const resBadFin = precheckChapterV2(badFinalizedFieldDir, 2);
  assert.equal(resBadFin.blocking, true);
  assert.ok(resBadFin.hardErrors.some(e => e.code === 'STALE_REVIEW_AFTER_EDIT' && e.source === 'chapter.finalizedSha256'));
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
